import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { COMMON, INPUTS, TABLE, UIKIT } from '@/modules';
import { TasksService } from '@/_service/task.service';
import { Task, TaskFilters, TaskListQuery, TaskStatus, TaskType } from '@/_model/Task';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { MessageService } from 'primeng/api';
import { JsonViewComponent } from '@/_components/JsonViewComponent';

@Component({
  selector: 'app-tasks',
  standalone: true,
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss',
  imports: [
    ...COMMON,
    ...INPUTS,
    ...TABLE,
    ...UIKIT,
    ClipboardModule,
    JsonViewComponent
  ],
  providers: [MessageService]
})
export class TasksComponent implements OnInit {
  tasks: Task[] = [];
  loading = false;
  errorMessage = '';

  page = 0;
  size = 20;
  totalPages = 0;
  totalElements = 0;
  isShowDuplicata = false;
  selectedTask: Task | null = null;
  private readonly runningIds = new Set<string>();

  readonly sizeOptions = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 }
  ];

  readonly taskTypeOptions: { label: string; value: TaskType | null }[] = [
    { label: 'Todos', value: null },
    { label: 'CreateTask', value: 'CreateTask' },
    { label: 'CancelTask', value: 'CancelTask' }
  ];

  readonly statusOptions: { label: string; value: TaskStatus | null }[] = [
    { label: 'Todos', value: null },
    { label: 'READY', value: 'READY' },
    { label: 'FAILED', value: 'FAILED' },
    { label: 'FINISHED', value: 'FINISHED' }
  ];

  filtersForm: {
    taskType: TaskType | null;
    status: TaskStatus | null;
    tomador: string;
  } = {
    taskType: null,
    status: null,
    tomador: ''
  };

  private appliedFilters: TaskFilters = {};

  constructor(
    private readonly service: TasksService,
    private readonly clipboard: Clipboard,
    private readonly messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  applyFilters(): void {
    this.appliedFilters = {
      taskType: this.filtersForm.taskType ?? undefined,
      status: this.filtersForm.status ?? undefined,
      tomador: this.filtersForm.tomador.trim() || undefined
    };

    this.page = 0;
    this.load();
  }

  clearFilters(): void {
    this.filtersForm = {
      taskType: null,
      status: null,
      tomador: ''
    };

    this.appliedFilters = {};
    this.page = 0;
    this.load();
  }

  previousPage(): void {
    if (this.page > 0 && !this.loading) {
      this.page -= 1;
      this.load();
    }
  }

  nextPage(): void {
    if (this.page + 1 < this.totalPages && !this.loading) {
      this.page += 1;
      this.load();
    }
  }

  onPageSizeChange(newSize: number): void {
    if (!newSize || newSize === this.size) {
      return;
    }

    this.size = newSize;
    this.page = 0;
    this.load();
  }

  getStatusSeverity(status: TaskStatus): 'success' | 'danger' | 'warning' {
    if (status === 'FINISHED') {
      return 'success';
    }

    if (status === 'FAILED') {
      return 'danger';
    }

    return 'warning';
  }

  get pageNumberLabel(): string {
    if (this.totalPages === 0) {
      return '0 / 0';
    }

    return `${this.page + 1} / ${this.totalPages}`;
  }

  getLabel(id: string): string {
    if (!id) {
      return '';
    }
    const head = id.split('-')[0] ?? id;
    return head.slice(0, 6);
  }

  copy(value: string): void {
    const ok = this.clipboard.copy(value);
    this.messageService.add({
      severity: ok ? 'success' : 'warn',
      summary: ok ? 'Copiado' : 'Falhou',
      detail: ok ? 'ID copiado para a área de transferência.' : 'Não foi possível copiar o ID.'
    });
  }

  showDuplicata(task: Task): void {
    this.selectedTask = task;
    this.isShowDuplicata = true;
  }

  runTask(task: Task): void {
    if (this.runningIds.has(task.id)) {
      return;
    }

    this.runningIds.add(task.id);
    this.service.execute(task.id).pipe(
      finalize(() => this.runningIds.delete(task.id))
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Executada',
          detail: 'Task executada com sucesso.'
        });
        this.load();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Falha',
          detail: 'Não foi possível executar a task.'
        });
      }
    });
  }

  isRunning(task: Task): boolean {
    return this.runningIds.has(task.id);
  }

  private load(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: TaskListQuery = {
      page: this.page,
      size: this.size,
      ...this.appliedFilters
    };

    this.service
      .list(query)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (resp) => {
          this.tasks = resp.content ?? [];
          this.totalElements = resp.totalElements ?? 0;
          this.totalPages = resp.totalPages ?? 0;
          this.page = resp.number ?? this.page;
          this.size = resp.size ?? this.size;
        },
        error: () => {
          this.tasks = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.errorMessage = 'Erro ao carregar tasks. Tente novamente.';
        }
      });
  }
}
