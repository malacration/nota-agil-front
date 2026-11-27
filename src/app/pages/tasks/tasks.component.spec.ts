import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Clipboard } from '@angular/cdk/clipboard';
import { of } from 'rxjs';
import { TasksComponent } from './tasks.component';
import { TasksService } from '@/_service/task.service';
import { JsonViewComponent } from '@/_components/JsonViewComponent';
import { Task } from '@/_model/Task';

@Component({ selector: 'json-view', standalone: true, template: '' })
class JsonViewStub { @Input() data: unknown; }

describe('tabela única de tarefas', () => {
  let service: jasmine.SpyObj<TasksService>;
  const erp: Task = {
    id: 'erp-ConsultaErp', name: 'Pagamento FXP-NA000001 / mock-baixa-001', taskType: 'ConsultaErp',
    status: 'READY', createdAt: '2026-11-12T19:08:23Z', consultaErp: {
      id: 'erp', requisicao: { workflowId: 'FXP-NA000001', solicitacaoId: 'mock-baixa-001',
        cpfcnpjtomador: '12345678000190', cnpjprestador: '98765432000100', numdocfiscal: '000123', valorparcela: 125.5 },
      status: 'PENDENTE', erp: null, resultado: null, tentativasRetorno: 0, ultimoErro: null,
      criadaEm: '2026-11-12T19:08:23Z', atualizadaEm: '2026-11-12T19:08:23Z', concluidaEm: null
    }
  };
  const old: Task = { id: 'pdf', name: 'Envio de documento', taskType: 'UploadPdf', status: 'READY', createdAt: erp.createdAt };

  beforeEach(() => {
    service = jasmine.createSpyObj('TasksService', ['list', 'execute', 'updateStatus']);
    service.list.and.returnValue(of({ content: [erp, old], totalElements: 2, totalPages: 1, number: 0,
      size: 20, first: true, last: true, empty: false }));
    TestBed.configureTestingModule({ imports: [TasksComponent], providers: [
      { provide: TasksService, useValue: service }, { provide: Clipboard, useValue: { copy: () => true } }, provideNoopAnimations()
    ] });
    TestBed.overrideComponent(TasksComponent, { remove: { imports: [JsonViewComponent] }, add: { imports: [JsonViewStub] } });
  });

  it('exibe ERP e tarefas antigas na mesma tabela com uma única requisição', () => {
    const fixture = TestBed.createComponent(TasksComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('p-table').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('mock-baixa-001');
    expect(fixture.nativeElement.textContent).toContain('Envio de documento');
    expect(fixture.nativeElement.textContent).toContain('000123');
    expect(service.list).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.totalElements).toBe(2);
  });

  it('usa o filtro de tipo existente para consultar somente ERP', () => {
    const component = TestBed.createComponent(TasksComponent).componentInstance;
    component.filtersForm.taskType = 'ConsultaErp';
    component.filtersForm.status = 'READY';
    component.filtersForm.tomador = ' 12345678000190 ';
    component.page = 3;
    component.applyFilters();
    expect(service.list).toHaveBeenCalledOnceWith({ page: 0, size: 20, taskType: 'ConsultaErp', status: 'READY', tomador: '12345678000190' });
    expect(component.taskTypeOptions.some(option => option.value === 'UploadPdf')).toBeTrue();
  });

  it('mantém os detalhes ERP no diálogo existente e altera paginação na mesma consulta', () => {
    const component = TestBed.createComponent(TasksComponent).componentInstance;
    component.showDuplicata(erp);
    expect(component.selectedTask).toBe(erp);
    expect(component.isShowDuplicata).toBeTrue();
    component.onPageSizeChange(50);
    expect(service.list).toHaveBeenCalledOnceWith({ page: 0, size: 50 });
  });
});
