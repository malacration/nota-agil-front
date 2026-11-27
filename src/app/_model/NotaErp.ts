import { Erp } from './ConsultaErp';
import { TaskStatus } from './Task';

export type TipoNota = 'Nfe' | 'Nfse' | 'Cte' | 'NaoDetectado';
export type OrigemNota = 'QIVE' | 'SAP' | 'DEALER';
export type StatusImportacao = 'CRIADA' | 'JA_EXISTE' | 'NAO_ENCONTRADA' | 'ERRO';

/** ERP com importacao de notas e se esta disponivel (flag NOTAS_ERP_<ERP>_ENABLED + conexao). */
export interface ErpNotasDisponivel {
  erp: Erp;
  nome: string;
  disponivel: boolean;
  habilitado: boolean;
  configurado: boolean;
  motivo?: string | null;
}

export interface EmpresaNotasErp {
  cnpj: string;
  nome: string;
  motivoIndisponivel?: string | null;
}

/** Nota de entrada normalizada (igual para SAP e Dealer). */
export interface NotaEntradaErp {
  id: string;
  erp: Erp;
  numero?: number | null;
  serie?: string | null;
  modelo?: string | null;
  tipo: TipoNota;
  chaveAcesso?: string | null;
  dataEmissao?: string | null;
  dataLancamento?: string | null;
  nomeFornecedor?: string | null;
  cpfCnpjFornecedor?: string | null;
  valorTotal?: number | null;
  valorBruto?: number | null;
  valorLiquido?: number | null;
  parcelas: number;
  anexosPdf: number;
}

export interface TaskResumo {
  id: string;
  status: TaskStatus;
  origem: OrigemNota;
  recordID?: string;
}

export interface NotaErpListItem {
  nota: NotaEntradaErp;
  task?: TaskResumo | null;
  problema?: string | null;
}

export interface ListagemNotasErp {
  erp: Erp;
  notas: NotaErpListItem[];
}

export interface FiltroNotasErp {
  erp: Erp;
  cnpj: string;
  dataInicial: string;
  dataFinal: string;
  fornecedor?: string;
  numero?: string;
}

export interface ResultadoImportacao {
  id: string;
  status: StatusImportacao;
  taskId?: string | null;
  mensagem?: string | null;
}

export interface ImportacaoNotasErp {
  resultados: ResultadoImportacao[];
}
