import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { NotasErpComponent } from './notas-erp.component';
import { NotasErpService } from '@/_service/notas-erp.service';
import { EmpresaNotasErp, ImportacaoNotasErp, ListagemNotasErp, NotaErpListItem } from '@/_model/NotaErp';

function item(id: string, numero: number): NotaErpListItem {
  return { nota: { id, erp: 'SAP', numero, tipo: 'Nfe', parcelas: 1, anexosPdf: 0 } };
}

describe('NotasErpComponent', () => {
  let service: jasmine.SpyObj<NotasErpService>;
  const empresas: EmpresaNotasErp[] = [
    { cnpj: '11111111000111', nome: 'Empresa A' },
    { cnpj: '22222222000122', nome: 'Empresa B' }
  ];

  function criar(): NotasErpComponent {
    const fixture = TestBed.createComponent(NotasErpComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    service = jasmine.createSpyObj('NotasErpService', ['erps', 'empresas', 'listar', 'criarTasks']);
    service.erps.and.returnValue(of([{ erp: 'SAP', nome: 'SAP', disponivel: true, habilitado: true, configurado: true }]));
    service.empresas.and.returnValue(of(empresas));
    TestBed.configureTestingModule({
      imports: [NotasErpComponent],
      providers: [{ provide: NotasErpService, useValue: service }, provideNoopAnimations(), provideRouter([])]
    });
  });

  it('trocar de empresa depois da busca descarta notas e selecao e nao importa com o CNPJ novo', () => {
    service.listar.and.returnValue(of<ListagemNotasErp>({ erp: 'SAP', notas: [item('10', 100)] }));
    const c = criar();
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    c.selecionadas = [...c.notas];

    c.selecionarEmpresa(empresas[1].cnpj);

    expect(c.notas).toEqual([]);
    expect(c.selecionadas).toEqual([]);
    expect(c.buscou).toBeFalse();
    expect(c.filtroListado).toBeNull();
    c.criarTasks();
    expect(service.criarTasks).not.toHaveBeenCalled();
  });

  it('importa com o ERP/CNPJ da busca exibida, nao com o formulario', () => {
    service.listar.and.returnValue(of<ListagemNotasErp>({ erp: 'SAP', notas: [item('10', 100)] }));
    service.criarTasks.and.returnValue(of<ImportacaoNotasErp>({ resultados: [{ id: '10', status: 'CRIADA', taskId: 't1' }] }));
    const c = criar();
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    c.selecionadas = [...c.notas];
    // Formulario divergente da tabela (ex.: mutacao direta): nada e importado.
    c.filtro.cnpj = empresas[1].cnpj;
    c.criarTasks();
    expect(service.criarTasks).not.toHaveBeenCalled();
    // Com o formulario igual a busca, envia o contexto capturado na busca.
    c.filtro.cnpj = empresas[0].cnpj;
    c.criarTasks();
    expect(service.criarTasks).toHaveBeenCalledOnceWith('SAP', empresas[0].cnpj, ['10']);
  });

  it('descarta a resposta de uma busca em andamento quando a empresa muda', () => {
    const pendente = new Subject<ListagemNotasErp>();
    service.listar.and.returnValue(pendente);
    const c = criar();
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    expect(c.carregando).toBeTrue();

    c.selecionarEmpresa(empresas[1].cnpj);
    pendente.next({ erp: 'SAP', notas: [item('10', 100)] });

    expect(c.carregando).toBeFalse();
    expect(c.notas).toEqual([]);
    expect(c.buscou).toBeFalse();
  });

  it('descarta a lista de empresas de um ERP anterior', () => {
    const antigas = new Subject<EmpresaNotasErp[]>();
    service.empresas.and.returnValues(antigas, of([empresas[1]]));
    const c = criar(); // auto-seleciona SAP -> primeira chamada (pendente)
    c.selecionarErp('DEALER');
    antigas.next([empresas[0]]);
    expect(c.empresas).toEqual([empresas[1]]);
    expect(c.filtro.cnpj).toBe(empresas[1].cnpj);
  });

  it('mantem o resultado por nota (sucesso e falhas) depois de recarregar a lista', () => {
    service.listar.and.returnValues(
      of<ListagemNotasErp>({ erp: 'SAP', notas: [item('10', 100), item('11', 101), item('12', 102)] }),
      of<ListagemNotasErp>({ erp: 'SAP', notas: [item('11', 101)] })
    );
    service.criarTasks.and.returnValue(of<ImportacaoNotasErp>({ resultados: [
      { id: '10', status: 'CRIADA', taskId: 't1' },
      { id: '11', status: 'ERRO', mensagem: 'Falha no ERP' },
      { id: '12', status: 'JA_EXISTE', taskId: 't0', mensagem: 'Task ja existe' }
    ] }));
    const c = criar();
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    c.selecionadas = [...c.notas];
    c.criarTasks();

    expect(service.listar).toHaveBeenCalledTimes(2);
    expect(service.listar.calls.argsFor(1)[0]).toEqual(service.listar.calls.argsFor(0)[0]);
    expect(c.notas.length).toBe(1);
    expect(c.resultados.map((r) => r.status)).toEqual(['CRIADA', 'ERRO', 'JA_EXISTE']);
    expect(c.numeroDaNota('10')).toBe('100');
    expect(c.numeroDaNota('12')).toBe('102');
  });

  it('nova busca manual limpa o resultado da importacao anterior', () => {
    service.listar.and.returnValue(of<ListagemNotasErp>({ erp: 'SAP', notas: [item('10', 100)] }));
    service.criarTasks.and.returnValue(of<ImportacaoNotasErp>({ resultados: [{ id: '10', status: 'CRIADA' }] }));
    const c = criar();
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    c.selecionadas = [...c.notas];
    c.criarTasks();
    expect(c.resultados.length).toBe(1);
    c.buscar();
    expect(c.resultados).toEqual([]);
  });

  it('importacao pendente bloqueia nova busca', () => {
    service.listar.and.returnValue(of<ListagemNotasErp>({ erp: 'SAP', notas: [item('10', 100)] }));
    service.criarTasks.and.returnValue(new Subject<ImportacaoNotasErp>());
    const c = criar();
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    c.selecionadas = [...c.notas];
    c.criarTasks();
    c.buscar();
    expect(service.listar).toHaveBeenCalledTimes(1);
  });

  it('resposta da importacao nao recarrega a consulta antiga se os filtros mudaram nesse meio tempo', () => {
    service.listar.and.returnValue(of<ListagemNotasErp>({ erp: 'SAP', notas: [item('10', 100)] }));
    const importacao = new Subject<ImportacaoNotasErp>();
    service.criarTasks.and.returnValue(importacao);
    const c = criar();
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    c.selecionadas = [...c.notas];
    c.criarTasks();

    c.filtro.dataInicial = '2026-01-01';
    c.filtroAlterado();
    importacao.next({ resultados: [{ id: '10', status: 'CRIADA', taskId: 't1' }] });
    importacao.complete();

    expect(service.listar).toHaveBeenCalledTimes(1);
    expect(c.resultados.length).toBe(1);
    expect(c.selecionadas).toEqual([]);
    expect(c.criando).toBeFalse();
  });

  it('resposta da importacao nao cancela uma busca mais nova em andamento', () => {
    const nova = new Subject<ListagemNotasErp>();
    service.listar.and.returnValues(of<ListagemNotasErp>({ erp: 'SAP', notas: [item('10', 100)] }), nova);
    const importacao = new Subject<ImportacaoNotasErp>();
    service.criarTasks.and.returnValue(importacao);
    const c = criar();
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    c.selecionadas = [...c.notas];
    c.criarTasks();
    importacao.next({ resultados: [{ id: '10', status: 'CRIADA' }] });
    importacao.complete();
    // recarga da propria consulta (contexto atual) em andamento; nada mais novo foi pedido
    expect(service.listar).toHaveBeenCalledTimes(2);
    expect(c.carregando).toBeTrue();
    nova.next({ erp: 'SAP', notas: [] });
    expect(c.notas).toEqual([]);
    expect(c.resultados.length).toBe(1);
  });

  it('alterar periodo/fornecedor/numero apos a busca limpa a selecao e bloqueia criar tasks ate nova busca', () => {
    service.listar.and.returnValue(of<ListagemNotasErp>({ erp: 'SAP', notas: [item('10', 100)] }));
    service.criarTasks.and.returnValue(of<ImportacaoNotasErp>({ resultados: [{ id: '10', status: 'CRIADA' }] }));
    const fixture = TestBed.createComponent(NotasErpComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    c.selecionadas = [...c.notas];
    expect(c.filtrosAlterados).toBeFalse();

    const novaData = c.filtro.dataFinal;
    c.filtro.dataInicial = novaData;
    c.filtroAlterado();
    fixture.detectChanges();

    expect(c.filtrosAlterados).toBeTrue();
    expect(c.selecionadas).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Filtros alterados');
    c.selecionadas = [...c.notas]; // mesmo re-selecionando, nao importa com o contexto antigo
    c.criarTasks();
    expect(service.criarTasks).not.toHaveBeenCalled();

    // Nova busca com o filtro novo libera de novo.
    c.buscar();
    expect(c.filtrosAlterados).toBeFalse();
    c.selecionadas = [...c.notas];
    c.criarTasks();
    expect(service.criarTasks).toHaveBeenCalledTimes(1);
    expect(service.listar.calls.mostRecent().args[0].dataInicial).toBe(novaData);
  });

  it('fornecedor e numero tambem contam como filtro alterado; resultados da importacao continuam visiveis', () => {
    service.listar.and.returnValue(of<ListagemNotasErp>({ erp: 'SAP', notas: [item('10', 100)] }));
    service.criarTasks.and.returnValue(of<ImportacaoNotasErp>({ resultados: [{ id: '10', status: 'ERRO', mensagem: 'x' }] }));
    const c = criar();
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    c.selecionadas = [...c.notas];
    c.criarTasks();
    expect(c.resultados.length).toBe(1);

    c.filtro.fornecedor = '12.345.678/0001-90';
    c.filtroAlterado();
    expect(c.filtrosAlterados).toBeTrue();
    expect(c.resultados.length).toBe(1);

    c.filtro.fornecedor = '';
    c.filtro.numero = '123';
    expect(c.filtrosAlterados).toBeTrue();
    c.filtro.numero = '';
    expect(c.filtrosAlterados).toBeFalse();
  });

  it('filtros alterados durante a importacao e depois restaurados: notas importadas nao voltam a ser selecionaveis', () => {
    service.listar.and.returnValue(of<ListagemNotasErp>({ erp: 'SAP', notas: [item('10', 100), item('11', 101)] }));
    const importacao = new Subject<ImportacaoNotasErp>();
    service.criarTasks.and.returnValue(importacao);
    const fixture = TestBed.createComponent(NotasErpComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    c.selecionadas = [c.notas[0]];
    c.criarTasks();

    const original = c.filtro.numero;
    c.filtro.numero = '999';
    c.filtroAlterado();
    importacao.next({ resultados: [{ id: '10', status: 'CRIADA', taskId: 't1' }] });
    importacao.complete();
    expect(service.listar).toHaveBeenCalledTimes(1); // sem recarga

    c.filtro.numero = original;
    c.filtroAlterado();
    fixture.detectChanges();

    expect(c.filtrosAlterados).toBeFalse();
    expect(c.precisaNovaBusca).toBeTrue();
    expect(c.podeSelecionar(c.notas[0])).toBeFalse();
    expect(c.selecionaveis).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Lista desatualizada');
    c.selecionadas = [c.notas[0]];
    c.criarTasks();
    expect(service.criarTasks).toHaveBeenCalledTimes(1);
    expect(c.resultados.length).toBe(1);

    // Nova busca reflete a importacao e libera a tabela.
    service.listar.and.returnValue(of<ListagemNotasErp>({ erp: 'SAP', notas: [
      { ...item('10', 100), task: { id: 't1', status: 'READY', origem: 'SAP' } }, item('11', 101)
    ] }));
    c.buscar();
    expect(c.precisaNovaBusca).toBeFalse();
    expect(c.selecionaveis.map((n) => n.nota.id)).toEqual(['11']);
  });

  it('recarga apos a importacao cancelada por mudanca de filtro tambem deixa a lista desatualizada', () => {
    const recarga = new Subject<ListagemNotasErp>();
    service.listar.and.returnValues(of<ListagemNotasErp>({ erp: 'SAP', notas: [item('10', 100)] }), recarga);
    service.criarTasks.and.returnValue(of<ImportacaoNotasErp>({ resultados: [{ id: '10', status: 'JA_EXISTE' }] }));
    const c = criar();
    c.selecionarEmpresa(empresas[0].cnpj);
    c.buscar();
    c.selecionadas = [...c.notas];
    c.criarTasks();
    expect(c.carregando).toBeTrue();
    c.filtroAlterado(); // cancela a recarga sem mudar nada
    expect(c.carregando).toBeFalse();
    expect(c.podeSelecionar(c.notas[0])).toBeFalse();
  });
});
