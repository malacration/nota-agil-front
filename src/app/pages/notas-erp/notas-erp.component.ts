import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { COMMON, INPUTS, TABLE, UIKIT } from '@/modules';
import { Erp } from '@/_model/ConsultaErp';
import { EmpresaNotasErp, ErpNotasDisponivel, FiltroNotasErp, NotaErpListItem, ResultadoImportacao } from '@/_model/NotaErp';
import { NotasErpService } from '@/_service/notas-erp.service';

/**
 * Notas fiscais de entrada (contas a pagar) dos ERPs como fonte alternativa ao Qive. Uma tela, com
 * o ERP como filtro obrigatorio. Tudo sob demanda: o usuario busca as notas de uma empresa e
 * escolhe quais viram task (CreateTask READY). O envio ao SoftExpert segue pela tela Tasks.
 * ERPs desligados (NOTAS_ERP_<ERP>_ENABLED=false) ou sem conexao configurada aparecem desabilitados.
 */
@Component({
  selector: 'app-notas-erp',
  standalone: true,
  templateUrl: './notas-erp.html',
  imports: [...COMMON, ...INPUTS, ...TABLE, ...UIKIT, CheckboxModule],
  providers: [MessageService]
})
export class NotasErpComponent implements OnInit, OnDestroy {
  readonly maxDias = 31;
  readonly maxSelecao = 100;

  erps: ErpNotasDisponivel[] = [];
  erpOptions: { label: string; value: Erp; disabled: boolean }[] = [];
  carregandoErps = true;

  empresas: EmpresaNotasErp[] = [];
  empresaOptions: { label: string; value: string; disabled: boolean }[] = [];
  carregandoEmpresas = false;

  filtro = {
    erp: null as Erp | null,
    cnpj: null as string | null,
    dataInicial: '',
    dataFinal: '',
    fornecedor: '',
    numero: ''
  };

  notas: NotaErpListItem[] = [];
  selecionadas: NotaErpListItem[] = [];
  buscou = false;
  carregando = false;
  criando = false;
  erro = '';
  resultados: ResultadoImportacao[] = [];
  /** ERP da ultima busca (a tabela mostra colunas conforme ele). */
  erpListado: Erp | null = null;
  /**
   * Filtro (ERP + empresa + periodo) que gerou a tabela exibida. A importacao usa este contexto, nunca
   * o formulario: trocar a empresa depois da busca nao pode mandar ids de uma empresa com o CNPJ de outra.
   */
  filtroListado: FiltroNotasErp | null = null;
  /** Numero de cada nota importada, guardado no envio (a lista e recarregada em seguida). */
  private numerosResultado: Record<string, string> = {};
  /**
   * Houve importacao depois que a tabela exibida foi carregada e a recarga nao concluiu (filtros mudaram ou a
   * recarga foi cancelada): as notas importadas ainda aparecem como disponiveis, entao exige nova busca.
   */
  listaDesatualizada = false;

  private buscaSub?: Subscription;
  private empresasSub?: Subscription;
  private importacaoSub?: Subscription;

  constructor(private service: NotasErpService, private messages: MessageService) {}

  ngOnInit(): void {
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - 6);
    this.filtro.dataFinal = this.isoDate(hoje);
    this.filtro.dataInicial = this.isoDate(inicio);

    this.service
      .erps()
      .pipe(finalize(() => (this.carregandoErps = false)))
      .subscribe({
        next: (erps) => {
          this.erps = erps;
          this.erpOptions = erps.map((e) => ({
            label: e.disponivel ? e.nome : `${e.nome} (${e.motivo || 'indisponível'})`,
            value: e.erp,
            disabled: !e.disponivel
          }));
          const disponiveis = erps.filter((e) => e.disponivel);
          if (disponiveis.length === 1) this.selecionarErp(disponiveis[0].erp);
        },
        error: () => (this.erro = 'Não foi possível carregar os ERPs.')
      });
  }

  ngOnDestroy(): void {
    this.buscaSub?.unsubscribe();
    this.empresasSub?.unsubscribe();
    this.importacaoSub?.unsubscribe();
  }

  get nenhumErpDisponivel(): boolean {
    return !this.carregandoErps && !this.erps.some((e) => e.disponivel);
  }

  get erpsIndisponiveis(): ErpNotasDisponivel[] {
    return this.erps.filter((e) => !e.disponivel);
  }

  selecionarErp(erp: Erp | null): void {
    this.filtro.erp = erp;
    this.filtro.cnpj = null;
    this.limparResultado();
    this.empresas = [];
    this.empresaOptions = [];
    // Resposta de empresas de um ERP anterior nao pode sobrescrever a lista atual.
    this.empresasSub?.unsubscribe();
    this.carregandoEmpresas = false;
    if (!erp) return;
    this.carregandoEmpresas = true;
    this.empresasSub = this.service
      .empresas(erp)
      .pipe(finalize(() => (this.carregandoEmpresas = false)))
      .subscribe({
        next: (lista) => {
          this.empresas = lista;
          this.empresaOptions = lista.map((e) => ({
            label: `${e.nome} - ${this.formatarCnpj(e.cnpj)}${e.motivoIndisponivel ? ' (' + e.motivoIndisponivel + ')' : ''}`,
            value: e.cnpj,
            disabled: !!e.motivoIndisponivel
          }));
          const validas = lista.filter((e) => !e.motivoIndisponivel);
          if (validas.length === 1) this.filtro.cnpj = validas[0].cnpj;
        },
        error: (e) => (this.erro = this.mensagemErro(e, 'Não foi possível carregar as empresas.'))
      });
  }

  /** Troca de empresa descarta a tabela, a selecao e qualquer busca/importacao em andamento. */
  selecionarEmpresa(cnpj: string | null): void {
    if (cnpj === this.filtro.cnpj) return;
    this.filtro.cnpj = cnpj;
    this.limparResultado();
  }

  /**
   * Outros filtros (periodo, fornecedor, numero): descarta a busca em andamento. Se o formulario deixou de
   * corresponder a tabela exibida, limpa a selecao e bloqueia "criar tasks" ate uma nova busca.
   */
  filtroAlterado(): void {
    this.cancelarBusca();
    if (this.precisaNovaBusca) this.selecionadas = [];
  }

  /** Tabela exibida foi gerada com filtros diferentes dos do formulario (precisa buscar de novo). */
  get filtrosAlterados(): boolean {
    return !!this.filtroListado && !this.formularioIgual(this.filtroListado);
  }

  /** Tabela exibida nao serve para importar: filtros alterados ou desatualizada apos importacao. */
  get precisaNovaBusca(): boolean {
    return this.filtrosAlterados || this.listaDesatualizada;
  }

  get filtroValido(): boolean {
    return !!this.filtro.erp && !!this.filtro.cnpj && !!this.filtro.dataInicial && !!this.filtro.dataFinal && !this.erroPeriodo;
  }

  get erroPeriodo(): string {
    if (!this.filtro.dataInicial || !this.filtro.dataFinal) return '';
    const inicio = new Date(this.filtro.dataInicial + 'T00:00:00');
    const fim = new Date(this.filtro.dataFinal + 'T00:00:00');
    if (fim < inicio) return 'A data final é anterior à inicial.';
    const dias = Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1;
    return dias > this.maxDias ? `Período máximo de ${this.maxDias} dias.` : '';
  }

  buscar(): void {
    // Durante a importacao a busca fica bloqueada: a resposta dela recarrega a lista.
    if (!this.filtroValido || this.carregando || this.criando) return;
    this.resultados = [];
    this.numerosResultado = {};
    this.carregar(this.filtroDoFormulario());
  }

  private filtroDoFormulario(): FiltroNotasErp {
    return {
      erp: this.filtro.erp!,
      cnpj: this.filtro.cnpj!,
      dataInicial: this.filtro.dataInicial,
      dataFinal: this.filtro.dataFinal,
      fornecedor: this.filtro.fornecedor.replace(/\D/g, ''),
      numero: this.filtro.numero
    };
  }

  /** A tabela exibida ainda e a do contexto e o formulario nao mudou desde entao (nem ha busca nova em andamento). */
  private contextoAtual(contexto: FiltroNotasErp): boolean {
    return this.filtroListado === contexto && !this.carregando && this.formularioIgual(contexto);
  }

  private formularioIgual(contexto: FiltroNotasErp): boolean {
    const f = this.filtroDoFormulario();
    return f.erp === contexto.erp && f.cnpj === contexto.cnpj && f.dataInicial === contexto.dataInicial &&
      f.dataFinal === contexto.dataFinal && f.fornecedor === contexto.fornecedor && f.numero === contexto.numero;
  }

  /** Consulta com um filtro fixo; os resultados da importacao (se houver) sao mantidos. */
  private carregar(filtro: FiltroNotasErp): void {
    this.cancelarBusca();
    this.carregando = true;
    this.erro = '';
    this.selecionadas = [];
    this.buscaSub = this.service
      .listar(filtro)
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: (r) => {
          this.notas = r.notas;
          this.erpListado = filtro.erp;
          this.filtroListado = filtro;
          this.listaDesatualizada = false;
          this.buscou = true;
        },
        error: (e) => {
          this.notas = [];
          this.filtroListado = null;
          this.erpListado = null;
          this.erro = this.mensagemErro(e, 'Não foi possível consultar as notas no ERP.');
        }
      });
  }

  private cancelarBusca(): void {
    this.buscaSub?.unsubscribe();
    this.buscaSub = undefined;
    this.carregando = false;
  }

  podeSelecionar(item: NotaErpListItem): boolean {
    return !item.task && !item.problema && !this.precisaNovaBusca;
  }

  /** p-table rowSelectable: nota com task ou com problema nao pode ser selecionada. */
  readonly podeSelecionarFn = (e: { data: NotaErpListItem }) => this.podeSelecionar(e.data);

  get selecionaveis(): NotaErpListItem[] {
    return this.notas.filter((n) => this.podeSelecionar(n));
  }

  criarTasks(): void {
    const contexto = this.filtroListado;
    const notas = this.selecionadas.filter((n) => this.podeSelecionar(n));
    const ids = notas.map((n) => n.nota.id);
    if (!ids.length || this.criando || this.carregando || !contexto || this.precisaNovaBusca) return;
    if (ids.length > this.maxSelecao) {
      this.erro = `Selecione no máximo ${this.maxSelecao} notas por vez.`;
      return;
    }
    const numeros: Record<string, string> = {};
    for (const n of notas) numeros[n.nota.id] = n.nota.numero != null ? String(n.nota.numero) : n.nota.id;
    this.criando = true;
    this.erro = '';
    this.importacaoSub = this.service
      .criarTasks(contexto.erp, contexto.cnpj, ids)
      .pipe(finalize(() => (this.criando = false)))
      .subscribe({
        next: (r) => {
          this.numerosResultado = numeros;
          this.resultados = r.resultados;
          const criadas = r.resultados.filter((x) => x.status === 'CRIADA').length;
          const outras = r.resultados.length - criadas;
          this.messages.add({
            severity: outras ? 'warn' : 'success',
            summary: `${criadas} task(s) criada(s)`,
            detail: outras ? `${outras} nota(s) não foram importadas; veja o resultado abaixo.` : 'Envio ao SoftExpert segue pela tela Tasks.',
            life: 6000
          });
          // A tabela exibida nao reflete mais a importacao ate uma recarga concluir.
          this.listaDesatualizada = true;
          // Recarrega a mesma consulta sem apagar o resultado por nota, so se ela ainda e a atual:
          // nunca cancela/sobrescreve uma busca mais nova nem mostra a tabela antiga com filtros novos.
          if (this.contextoAtual(contexto)) this.carregar(contexto);
          else this.selecionadas = [];
        },
        error: (e) => (this.erro = this.mensagemErro(e, 'Não foi possível criar as tasks.'))
      });
  }

  statusNota(item: NotaErpListItem): { label: string; severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary' } {
    if (item.task) {
      const origem = { QIVE: 'Qive', SAP: 'SAP', DEALER: 'Dealer' }[item.task.origem] ?? item.task.origem;
      return { label: `Task ${item.task.status} (${origem})`, severity: item.task.status === 'FAILED' ? 'danger' : 'info' };
    }
    if (item.problema) return { label: 'Não importável', severity: 'warn' };
    return { label: 'Disponível', severity: 'success' };
  }

  rotuloTipo(item: NotaErpListItem): string {
    if (item.nota.tipo !== 'NaoDetectado') return item.nota.tipo;
    return item.nota.modelo ? `Modelo ${item.nota.modelo}` : 'Não informado';
  }

  rotuloResultado(r: ResultadoImportacao): string {
    return { CRIADA: 'Criada', JA_EXISTE: 'Já existe', NAO_ENCONTRADA: 'Não encontrada', ERRO: 'Erro' }[r.status];
  }

  severidadeResultado(r: ResultadoImportacao): 'success' | 'info' | 'warn' | 'danger' {
    return ({ CRIADA: 'success', JA_EXISTE: 'info', NAO_ENCONTRADA: 'warn', ERRO: 'danger' } as const)[r.status];
  }

  numeroDaNota(id: string): string {
    if (this.numerosResultado[id]) return this.numerosResultado[id];
    const n = this.notas.find((x) => x.nota.id === id)?.nota;
    return n?.numero != null ? String(n.numero) : id;
  }

  formatarCnpj(valor?: string | null): string {
    const d = (valor || '').replace(/\D/g, '');
    if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    return valor || '-';
  }

  private limparResultado(): void {
    this.cancelarBusca();
    this.importacaoSub?.unsubscribe();
    this.criando = false;
    this.filtroListado = null;
    this.listaDesatualizada = false;
    this.numerosResultado = {};
    this.notas = [];
    this.selecionadas = [];
    this.resultados = [];
    this.buscou = false;
    this.erpListado = null;
  }

  private isoDate(d: Date): string {
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  private mensagemErro(e: any, padrao: string): string {
    return e?.error?.mensagem || e?.error?.message || e?.error?.detail || padrao;
  }
}
