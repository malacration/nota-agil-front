import { Company, FilialErpItem, ResultadoFilialErp } from '@/_model/Comapny';
import { ErpNotasDisponivel } from '@/_model/NotaErp';
import { NotasErpService } from '@/_service/notas-erp.service';
import { CompanysService } from '@/_service/companys.service';
import { Erp } from '@/_model/ConsultaErp';
import { AppFloatingConfigurator } from '@/layout/component/app.floatingconfigurator';
import { INPUTS, TABLE, UIKIT } from '@/modules';
import { TagModule } from 'primeng/tag';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';


@Component({
    selector: 'app-companys',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ...INPUTS,
        ...TABLE,
        ...UIKIT,
        TagModule
    ],
    providers: [ConfirmationService],
    templateUrl: 'companys.html',
    styleUrl: 'companys.scss'
})
export class CompanysComponent implements OnInit, OnDestroy{

    companys : Array<Company> = []

    cnpjsOptions : Array<{label : string, value:string}> = []

    selectedCnpj: string | null = null;
    modoCadastro: 'QIVE' | 'MANUAL' = 'QIVE';
    cnpjManual = '';
    readonly modosCadastro = [{ label: 'Empresa da Qive', value: 'QIVE' }, { label: 'Cadastro manual', value: 'MANUAL' }];
    private readonly linkingQive = new Set<string>();
    nome = '';
    erpPagamento: Erp | null = null;
    erpOptions: { label: string; value: Erp | null; disabled?: boolean }[] = [{ label: 'Nenhum', value: null }];
    loadingErps = true;
    saving = false;
    errorMessage = '';
    successMessage = '';
    private readonly updatingErps = new Set<string>();

    constructor(private service : CompanysService, private notasErp: NotasErpService, private confirmation: ConfirmationService){

    }

    // ------------------------------------------------------------ cadastro de filiais do ERP

    filiaisDialog = false;
    erpsFiliais: { label: string; value: Erp; disabled: boolean }[] = [];
    erpFiliais: Erp | null = null;
    filiais: FilialErpItem[] = [];
    filiaisSelecionadas: FilialErpItem[] = [];
    qiveRespondeu = true;
    carregandoFiliais = false;
    importandoFiliais = false;
    erroFiliais = '';
    resultadosFiliais: ResultadoFilialErp[] = [];
    /** ERP que gerou a tabela de filiais exibida; o cadastro usa ele, nunca o select. */
    erpFiliaisListado: Erp | null = null;
    private filiaisSub?: Subscription;
    private importacaoFiliaisSub?: Subscription;

    abrirFiliaisErp() {
        this.filiaisDialog = true;
        this.erroFiliais = '';
        this.resultadosFiliais = [];
        this.notasErp.erps().subscribe({
            // Cadastro de filiais exige so a conexao com o ERP (a flag NOTAS_ERP_* desliga a importacao de notas).
            next: (erps: ErpNotasDisponivel[]) => {
                this.erpsFiliais = erps.map(e => ({
                    label: e.configurado ? e.nome : `${e.nome} (variáveis de conexão ausentes)`,
                    value: e.erp,
                    disabled: !e.configurado
                }));
                const ok = this.erpsFiliais.filter(e => !e.disabled);
                if (!this.erpFiliais && ok.length === 1) this.carregarFiliais(ok[0].value);
            },
            error: () => this.erroFiliais = 'Não foi possível carregar os ERPs.'
        });
    }

    carregarFiliais(erp: Erp | null) {
        // Resposta (consulta ou cadastro) de um ERP anterior nao pode sobrescrever a tabela nem cadastrar no ERP novo.
        this.filiaisSub?.unsubscribe();
        this.importacaoFiliaisSub?.unsubscribe();
        this.carregandoFiliais = false;
        this.importandoFiliais = false;
        this.erpFiliais = erp;
        this.erpFiliaisListado = null;
        this.filiais = [];
        this.filiaisSelecionadas = [];
        this.resultadosFiliais = [];
        this.erroFiliais = '';
        if (!erp) return;
        this.carregandoFiliais = true;
        this.filiaisSub = this.service.filiaisErp(erp).pipe(finalize(() => this.carregandoFiliais = false)).subscribe({
            next: r => {
                this.filiais = r.filiais;
                this.erpFiliaisListado = erp;
                this.qiveRespondeu = r.qiveRespondeu;
            },
            error: e => this.erroFiliais = e?.error?.mensagem || 'Não foi possível consultar as filiais no ERP.'
        });
    }

    filialSelecionavel(f: FilialErpItem) {
        return !f.problema && (!f.cadastrada || (this.erpFiliais === 'DEALER' && !!f.codigoDealer && !this.codigoDealerCadastrado(f)));
    }

    /** p-table rowSelectable */
    readonly filialSelecionavelFn = (e: { data: FilialErpItem }) => this.filialSelecionavel(e.data);

    private codigoDealerCadastrado(f: FilialErpItem) {
        return this.companys.some(c => c.cnpj === f.cnpj && !!c.codigoDealer);
    }

    situacaoFilial(f: FilialErpItem): { label: string; severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary' } {
        if (f.problema) return { label: 'Não cadastrável', severity: 'danger' };
        if (f.cadastrada && this.filialSelecionavel(f)) return { label: 'Cadastrada (sem código Dealer)', severity: 'warn' };
        if (f.cadastrada) return { label: 'Já cadastrada', severity: 'secondary' };
        return { label: 'Nova', severity: 'success' };
    }

    qiveFilial(f: FilialErpItem): { label: string; severity: 'success' | 'warn' | 'secondary'; tooltip: string } {
        if (f.cadastrada) return f.vinculadoQive
            ? { label: 'Vinculada', severity: 'success', tooltip: 'Jobs do Qive ativos para esta empresa' }
            : { label: 'Sem vínculo', severity: 'warn', tooltip: 'Sem jobs de busca de notas no Qive' };
        if (f.disponivelNoQive == null) return { label: 'Desconhecido', severity: 'secondary', tooltip: 'A Qive não respondeu; a empresa será cadastrada sem vínculo' };
        return f.disponivelNoQive
            ? { label: 'Existe no Qive', severity: 'success', tooltip: 'Será vinculada e os jobs do Qive serão criados' }
            : { label: 'Não existe no Qive', severity: 'warn', tooltip: 'Será cadastrada sem vínculo: sem jobs de busca de notas no Qive' };
    }

    importarFiliais() {
        const cnpjs = this.filiaisSelecionadas.filter(f => this.filialSelecionavel(f)).map(f => f.cnpj);
        const erp = this.erpFiliaisListado;
        if (!cnpjs.length || !erp || erp !== this.erpFiliais || this.importandoFiliais || this.carregandoFiliais) return;
        this.importandoFiliais = true;
        this.erroFiliais = '';
        this.importacaoFiliaisSub = this.service.importarFiliaisErp(erp, cnpjs).pipe(finalize(() => this.importandoFiliais = false)).subscribe({
            next: r => {
                this.resultadosFiliais = r;
                const criadas = r.filter(x => x.status === 'CRIADA' || x.status === 'ATUALIZADA').length;
                this.successMessage = `${criadas} empresa(s) cadastrada(s)/atualizada(s) a partir do ERP.`;
                this.loadEmpresas();
                this.carregarFiliais(erp);
                this.resultadosFiliais = r;
            },
            error: e => this.erroFiliais = e?.error?.mensagem || 'Não foi possível cadastrar as filiais.'
        });
    }

    nomeFilial(cnpj: string) {
        return this.filiais.find(f => f.cnpj === cnpj)?.nome ?? cnpj;
    }

    rotuloResultadoFilial(r: ResultadoFilialErp) {
        return { CRIADA: 'Criada', ATUALIZADA: 'Atualizada', JA_CADASTRADA: 'Já cadastrada', NAO_ENCONTRADA: 'Não encontrada', ERRO: 'Erro' }[r.status];
    }

    severidadeResultadoFilial(r: ResultadoFilialErp): 'success' | 'info' | 'warn' | 'danger' {
        return ({ CRIADA: 'success', ATUALIZADA: 'info', JA_CADASTRADA: 'info', NAO_ENCONTRADA: 'warn', ERRO: 'danger' } as const)[r.status];
    }

    ngOnDestroy(): void {
        this.filiaisSub?.unsubscribe();
        this.importacaoFiliaisSub?.unsubscribe();
    }

    ngOnInit(): void {
        this.loadCnpjsDisponiveis()
        this.loadEmpresas()
        this.loadErpsDisponiveis()
        
    }

    salvar(){
        const cnpj = this.modoCadastro === 'MANUAL' ? this.cnpjManual.replace(/\D/g, '') : this.selectedCnpj;
        if(cnpj && !this.saving) {
            this.saving = true;
            this.errorMessage = '';
            this.service.salvar({cnpj, nome: this.nome, erpPagamento: this.erpPagamento, vinculadoQive: this.modoCadastro === 'QIVE'})
              .pipe(finalize(() => this.saving = false)).subscribe({ next: () => {
                this.nome = ''
                this.selectedCnpj = null
                this.cnpjManual = ''
                this.erpPagamento = null
                this.ngOnInit()
            }, error: error => this.errorMessage = error?.error?.mensagem || 'Não foi possível salvar a empresa.' });
        }
    }

    canSave() {
        const cnpj = this.modoCadastro === 'MANUAL' ? this.cnpjManual.replace(/\D/g, '') : this.selectedCnpj;
        return !this.saving && !!this.nome.trim() && cnpj?.length === 14;
    }

    qiveDisponivel(empresa: Company) {
        return this.cnpjsOptions.some(option => option.value.replace(/\D/g, '') === empresa.cnpj.replace(/\D/g, ''));
    }

    isLinkingQive(cnpj: string) { return this.linkingQive.has(cnpj); }

    vincularQive(empresa: Company) {
        if (this.linkingQive.has(empresa.cnpj)) return;
        this.linkingQive.add(empresa.cnpj);
        this.errorMessage = '';
        this.successMessage = '';
        this.service.vincularQive(empresa.cnpj).pipe(finalize(() => this.linkingQive.delete(empresa.cnpj))).subscribe({
            next: updated => {
                this.companys = this.companys.map(item => item.cnpj === updated.cnpj ? updated : item);
                this.successMessage = 'Empresa vinculada à Qive. Os workers foram registrados na tela de jobs.';
            },
            error: error => this.errorMessage = error?.error?.mensagem || 'Não foi possível vincular a empresa à Qive.'
        });
    }

    loadErpsDisponiveis() {
        this.loadingErps = true;
        this.service.getErpsDisponiveis().pipe(finalize(() => this.loadingErps = false)).subscribe({
            next: erps => this.erpOptions = [{ label: 'Nenhum', value: null }, ...erps.map(erp => ({ label: erp.nome, value: erp.erp }))],
            error: () => {
                this.erpOptions = [{ label: 'Nenhum', value: null }];
                this.erpPagamento = null;
                this.errorMessage = 'Não foi possível carregar os ERPs disponíveis. Atualize a página para tentar novamente.';
            }
        });
    }

    erpOptionsFor(empresa: Company) {
        if (!empresa.erpPagamento || this.erpOptions.some(option => option.value === empresa.erpPagamento)) return this.erpOptions;
        return [...this.erpOptions, { label: `${empresa.erpPagamento} (indisponível)`, value: empresa.erpPagamento, disabled: true }];
    }

    isUpdatingErp(cnpj: string) { return this.updatingErps.has(cnpj); }

    atualizarErp(empresa: Company, erp: Erp | null) {
        if (this.updatingErps.has(empresa.cnpj) || (empresa.erpPagamento ?? null) === erp) return;
        this.updatingErps.add(empresa.cnpj);
        this.errorMessage = '';
        this.successMessage = '';
        this.service.atualizarErp(empresa.cnpj, erp).pipe(finalize(() => this.updatingErps.delete(empresa.cnpj))).subscribe({
            next: updated => {
                this.companys = this.companys.map(item => item.cnpj === updated.cnpj ? updated : item);
                this.successMessage = `ERP de pagamento atualizado para ${updated.nome || updated.cnpj}.`;
            },
            error: error => {
                this.companys = this.companys.map(item => item.cnpj === empresa.cnpj ? { ...item } : item);
                this.errorMessage = error?.error?.mensagem || 'Não foi possível atualizar o ERP.';
            }
        });
    }

    private readonly updatingDealer = new Set<string>();

    isUpdatingDealer(cnpj: string) { return this.updatingDealer.has(cnpj); }

    /** Codigo da empresa no Dealer (Titulo_EmpresaCod): habilita a importacao de notas do Dealer. */
    atualizarCodigoDealer(empresa: Company, valor: number | null) {
        const codigo = valor && valor > 0 ? valor : null;
        if (this.updatingDealer.has(empresa.cnpj) || (empresa.codigoDealer ?? null) === codigo) return;
        this.updatingDealer.add(empresa.cnpj);
        this.errorMessage = '';
        this.successMessage = '';
        this.service.atualizarCodigoDealer(empresa.cnpj, codigo).pipe(finalize(() => this.updatingDealer.delete(empresa.cnpj))).subscribe({
            next: updated => {
                this.companys = this.companys.map(item => item.cnpj === updated.cnpj ? updated : item);
                this.successMessage = `Código no Dealer atualizado para ${updated.nome || updated.cnpj}.`;
            },
            error: error => {
                this.companys = this.companys.map(item => item.cnpj === empresa.cnpj ? { ...item } : item);
                this.errorMessage = error?.error?.mensagem || 'Não foi possível atualizar o código no Dealer.';
            }
        });
    }

    onDelete(empresa : Company){
        this.confirmation.confirm({
            header: 'Excluir empresa',
            message: `Excluir ${empresa.nome || 'a empresa'} (${empresa.cnpj})? Os jobs de busca de notas no Qive desta empresa serão parados.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Excluir',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
            defaultFocus: 'reject',
            accept: () => {
                this.errorMessage = '';
                this.successMessage = '';
                this.service.delete(empresa.cnpj).subscribe({
                    next: () => {
                        this.successMessage = `Empresa ${empresa.nome || empresa.cnpj} excluída.`;
                        this.ngOnInit();
                    },
                    error: error => this.errorMessage = error?.error?.mensagem || 'Não foi possível excluir a empresa.'
                });
            }
        });
    }

    loadEmpresas(){
        this.service.get().subscribe(it =>{
            this.companys = it
        })
    }

    loadCnpjsDisponiveis(){
        this.service.getCnpjsDisponiveis().subscribe(it => {
            this.cnpjsOptions = it.map(cnpj => ({ label: cnpj, value: cnpj }));
        }, () => {
            this.cnpjsOptions = [];
            this.errorMessage = 'Não foi possível consultar os CNPJs da Qive. O cadastro manual continua disponível.';
        });
    }

    

}
