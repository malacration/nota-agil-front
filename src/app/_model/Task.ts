export type TaskType = 'CreateTask' | 'CancelTask';
export type TaskStatus = 'READY' | 'FAILED' | 'FINISHED';

export interface TaskDuplicata {
  razaoTomador: string;
  cpfCnpjTomador: string;
  razaoPrestador: string;
  numero: string;
  tipo: string;
  chaveAcesso?: string;
}

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  taskType: TaskType;
  createdAt: string;
  duplicata?: TaskDuplicata;
}

export interface TaskFilters {
  taskType?: TaskType;
  status?: TaskStatus;
  tomador?: string;
}

export interface TaskListQuery extends TaskFilters {
  page?: number;
  size?: number;
}
