import { ConsultaErpItem } from './ConsultaErp';

export type TaskType = 'CreateTask' | 'UploadPdf' | 'UploadPdfErp' | 'CancelTask' | 'ConsultaErp';
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
  consultaErp?: ConsultaErpItem;
  tomador?: string;
  /** Fonte da nota: ausente nas tasks do Qive, 'SAP'/'DEALER' nas importadas de ERP. */
  origem?: 'QIVE' | 'SAP' | 'DEALER' | null;
  /** UploadPdfErp concluida: de onde veio o PDF (QIVE, SAP ou NENHUM). */
  origemAnexo?: string | null;
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
