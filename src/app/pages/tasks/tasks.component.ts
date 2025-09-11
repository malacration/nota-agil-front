import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { COMMON, INPUTS, TABLE, UIKIT } from '@/modules';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TableLazyLoadEvent } from 'primeng/table';
import { TasksService } from '@/_service/task.service';
import { Task } from '@/_model/Task';
import { Dialog } from "primeng/dialog";
import { JsonViewComponent } from '@/_components/JsonViewComponent';
import { Clipboard } from '@angular/cdk/clipboard';


@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.html',
  styleUrls: ['./tasks.scss'],
  imports: [
    ...COMMON,
    ...INPUTS,
    ...TABLE,
    ...UIKIT,
    JsonViewComponent,
    Dialog
],
  providers: [
      MessageService
  ],
})
export class TasksComponent implements OnInit {
  tasks: Task[] = [];
  loading = false;

  // paginação/ordenação
  rows = 20;            // page size
  first = 0;            // índice do primeiro item na página
  totalRecords = 0;
  sortField: string | undefined = 'name';
  sortOrder: 1 | -1 = 1;
  taskSelecionada : Task = {
    id : "",
    name : "",
    status : 'READY',
  }
  isShowTask = false

  private runningIds = new Set<string | number>();
  private readonly apiBase = ''; // ex.: '/api'

  constructor(private service: TasksService, 
    private messageService: MessageService,
    private clipboard: Clipboard,
  ) {}

  ngOnInit(): void {
    this.load(); // carrega primeira página
  }

  onLazyLoad(ev: TableLazyLoadEvent): void {
    // Atualiza estado vindo do paginator/sort
    this.rows = ev.rows ?? this.rows;
    this.first = ev.first ?? 0;
    this.sortField = (ev.sortField as string) ?? this.sortField;
    this.sortOrder = (ev.sortOrder as 1 | -1 | undefined) ?? this.sortOrder;
    console.log(ev)
    this.load();
  }

  private load(): void {
    this.loading = true;

    const page = Math.floor((this.first || 0) / (this.rows || 10));
    console.log(page,"pagina numero")

    this.service.get(page.toString()).subscribe(resp => {
      this.tasks = resp.content;
      this.totalRecords = resp.totalElements;
      this.loading = false
    })
  }

  runOnce(task: Task): void {
    this.service.execute(task.id).subscribe(it =>{
      this.ngOnInit()
    })
  }

  isRunning(task: Task): boolean {
    return this.runningIds.has(task.id);
  }

  showTask(task : Task){
    this.isShowTask = true
    this.taskSelecionada = task
  }

   getLabel(id: string): string {
    if (!id) return '';
    const head = id.split('-')[0] ?? id;
    return head.slice(0, 6);
  }

  copy(value: string) {
    const ok = this.clipboard.copy(value);
    this.messageService.add({
      severity: ok ? 'success' : 'warn',
      summary: ok ? 'Copiado' : 'Falhou',
      detail: ok ? 'Valor copiado para a área de transferência.' : 'Não foi possível copiar.'
    });
  }

}