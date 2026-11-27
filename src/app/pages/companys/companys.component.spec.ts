import { of, Subject, throwError } from 'rxjs';
import { Company } from '@/_model/Comapny';
import { CompanysService } from '@/_service/companys.service';
import { CompanysComponent } from './companys.component';

describe('ERP de pagamento no cadastro de empresas', () => {
  let service: jasmine.SpyObj<CompanysService>;
  let component: CompanysComponent;
  const company: Company = { cnpj: '12345678000190', nome: 'Empresa teste', erpPagamento: null, vinculadoQive: true };

  beforeEach(() => {
    service = jasmine.createSpyObj('CompanysService', ['get', 'getCnpjsDisponiveis', 'getErpsDisponiveis', 'atualizarErp', 'salvar', 'vincularQive']);
    service.get.and.returnValue(of([company]));
    service.getCnpjsDisponiveis.and.returnValue(of([company.cnpj]));
    service.getErpsDisponiveis.and.returnValue(of([]));
    component = new CompanysComponent(service, jasmine.createSpyObj('NotasErpService', ['erps']), jasmine.createSpyObj('ConfirmationService', ['confirm']));
  });

  it('oferece somente Nenhum quando o backend não lista métodos implementados', () => {
    component.ngOnInit();
    expect(component.erpOptions).toEqual([{ label: 'Nenhum', value: null }]);
    expect(component.companys).toEqual([company]);
    expect(component.loadingErps).toBeFalse();
  });

  it('utiliza o catálogo do backend e mantém vínculo antigo indisponível sem permitir selecionar', () => {
    service.getErpsDisponiveis.and.returnValue(of([{ erp: 'SAP', nome: 'SAP' }]));
    component.loadErpsDisponiveis();
    expect(component.erpOptions.map(option => option.value)).toEqual([null, 'SAP']);
    expect(component.erpOptionsFor({ ...company, erpPagamento: 'DEALER' })[2].disabled).toBeTrue();
  });

  it('permite remover vínculo e impede envios concorrentes da mesma empresa', () => {
    const response = new Subject<Company>();
    const linked: Company = { ...company, erpPagamento: 'SAP' };
    component.companys = [linked];
    service.atualizarErp.and.returnValue(response);
    component.atualizarErp(linked, null);
    component.atualizarErp(linked, 'DEALER');
    expect(service.atualizarErp).toHaveBeenCalledOnceWith(company.cnpj, null);
    expect(component.isUpdatingErp(company.cnpj)).toBeTrue();
    response.next(company);
    response.complete();
    expect(component.companys[0].erpPagamento).toBeNull();
    expect(component.isUpdatingErp(company.cnpj)).toBeFalse();
  });

  it('preserva o vínculo quando o backend rejeita um ERP não implementado', () => {
    component.companys = [company];
    service.atualizarErp.and.returnValue(throwError(() => ({ error: { mensagem: 'ERP não implementado' } })));
    component.atualizarErp(company, 'SAP');
    expect(component.errorMessage).toBe('ERP não implementado');
    expect(component.companys[0].erpPagamento).toBeNull();
    expect(component.companys[0]).not.toBe(company);
  });

  it('envia o vínculo escolhido no cadastro da empresa', () => {
    service.salvar.and.returnValue(of(company));
    component.selectedCnpj = company.cnpj;
    component.nome = company.nome;
    component.erpPagamento = null;
    component.salvar();
    expect(service.salvar).toHaveBeenCalledOnceWith(company);
    expect(component.saving).toBeFalse();
  });

  it('permite cadastrar CNPJ manual sem depender de uma opção da Qive', () => {
    service.salvar.and.returnValue(of({ ...company, vinculadoQive: false }));
    component.modoCadastro = 'MANUAL';
    component.cnpjManual = '12.345.678/0001-90';
    component.nome = company.nome;
    expect(component.canSave()).toBeTrue();
    component.salvar();
    expect(service.salvar).toHaveBeenCalledOnceWith({ ...company, vinculadoQive: false });
  });

  it('vincula empresa manual à Qive posteriormente preservando o ERP', () => {
    const manual: Company = { ...company, vinculadoQive: false, erpPagamento: 'SAP' };
    component.companys = [manual];
    component.cnpjsOptions = [{ label: company.cnpj, value: company.cnpj }];
    const linked = { ...manual, vinculadoQive: true };
    service.vincularQive.and.returnValue(of(linked));
    expect(component.qiveDisponivel(manual)).toBeTrue();
    component.vincularQive(manual);
    expect(service.vincularQive).toHaveBeenCalledOnceWith(company.cnpj);
    expect(component.companys[0]).toEqual(linked);
    expect(component.isLinkingQive(company.cnpj)).toBeFalse();
  });

  describe('cadastro de filiais do ERP', () => {
    beforeEach(() => {
      service = jasmine.createSpyObj('CompanysService', ['get', 'filiaisErp', 'importarFiliaisErp']);
      service.get.and.returnValue(of([]));
      component = new CompanysComponent(service, jasmine.createSpyObj('NotasErpService', ['erps']), jasmine.createSpyObj('ConfirmationService', ['confirm']));
    });

    it('descarta a resposta atrasada de outro ERP e cadastra no ERP que gerou a tabela', () => {
      const sap = new Subject<any>();
      const dealer = of({ filiais: [{ cnpj: '22222222000122', nome: 'Dealer B' }], qiveRespondeu: true } as any);
      service.filiaisErp.and.returnValues(sap, dealer, dealer); // a terceira e a recarga apos o cadastro
      service.importarFiliaisErp.and.returnValue(of([]));
      component.carregarFiliais('SAP');
      component.carregarFiliais('DEALER');
      sap.next({ filiais: [{ cnpj: '11111111000111', nome: 'SAP A' }], qiveRespondeu: true });

      expect(component.filiais.map(f => f.cnpj)).toEqual(['22222222000122']);
      expect(component.erpFiliaisListado).toBe('DEALER');
      component.filiaisSelecionadas = [...component.filiais];
      component.importarFiliais();
      expect(service.importarFiliaisErp).toHaveBeenCalledOnceWith('DEALER', ['22222222000122']);
      expect(service.filiaisErp.calls.mostRecent().args).toEqual(['DEALER']);
    });

    it('nao cadastra enquanto a tabela do ERP escolhido ainda carrega', () => {
      const dealer = new Subject<any>();
      service.filiaisErp.and.returnValues(of({ filiais: [{ cnpj: '11111111000111', nome: 'SAP A' }], qiveRespondeu: true } as any), dealer);
      component.carregarFiliais('SAP');
      component.filiaisSelecionadas = [...component.filiais];
      component.carregarFiliais('DEALER');
      component.filiaisSelecionadas = [{ cnpj: '11111111000111', nome: 'SAP A' } as any];
      component.importarFiliais();
      expect(service.importarFiliaisErp).not.toHaveBeenCalled();
    });

    it('resposta de cadastro de um ERP anterior e descartada ao trocar de ERP', () => {
      const cadastro = new Subject<any>();
      service.filiaisErp.and.returnValue(of({ filiais: [{ cnpj: '11111111000111', nome: 'SAP A' }], qiveRespondeu: true } as any));
      service.importarFiliaisErp.and.returnValue(cadastro);
      component.carregarFiliais('SAP');
      component.filiaisSelecionadas = [...component.filiais];
      component.importarFiliais();
      component.carregarFiliais('DEALER');
      cadastro.next([{ cnpj: '11111111000111', status: 'CRIADA' }]);
      expect(component.resultadosFiliais).toEqual([]);
      expect(component.importandoFiliais).toBeFalse();
    });
  });
});
