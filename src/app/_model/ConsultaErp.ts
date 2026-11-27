export type Erp = 'SAP' | 'DEALER';
export type StatusConsultaErp = 'PENDENTE' | 'RETORNO_PENDENTE' | 'RETORNO_FALHOU' | 'CONCLUIDA';

export interface ErpDisponivel {
  erp: Erp;
  nome: string;
}

export interface ResultadoConsultaErp {
  sucesso: boolean;
  codigo: string;
  mensagem: string;
  dados: Record<string, string>;
}

export interface ConsultaErpItem {
  id: string;
  requisicao: {
    workflowId: string;
    solicitacaoId: string;
    cpfcnpjtomador: string;
    cnpjprestador: string;
    numdocfiscal: string;
    valorparcela: number;
    seriedocfiscal?: string | null;
    numeroparcela?: string | null;
    tipodoc?: string | null;
    chaveacesso?: string | null;
  };
  status: StatusConsultaErp;
  erp: Erp | null;
  resultado: ResultadoConsultaErp | null;
  tentativasRetorno: number;
  ultimoErro: string | null;
  criadaEm: string;
  atualizadaEm: string;
  concluidaEm: string | null;
  consultas?: number;
  ultimaConsulta?: ResultadoConsultaErp | null;
  ultimaConsultaEm?: string | null;
  proximaTentativa?: string | null;
  esperaPagamentoAte?: string | null;
  ultimaFalhaTecnica?: ResultadoConsultaErp | null;
  ultimaFalhaTecnicaEm?: string | null;
  falhasTecnicas?: number;
  falhasRetorno?: number;
}
