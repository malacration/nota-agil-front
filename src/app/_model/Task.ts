
type TaskStatus = 'READY' | 'RUNNING' | 'FAILED' | 'PAUSED' | 'SUCCESS' | 'UNKNOWN';

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  lastRunAt?: string;
}