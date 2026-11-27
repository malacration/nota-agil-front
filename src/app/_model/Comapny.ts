
import { Erp } from './ConsultaErp';

export class Company{
    cnpj : string = ""
    nome : string = ""
    erpPagamento?: Erp | null = null
    vinculadoQive?: boolean = true
    /** Codigo da empresa no Dealer (Titulo_EmpresaCod), para importar notas do Dealer. */
    codigoDealer?: number | null = null
}

/** Filial do ERP para cadastro de empresas (GET /companys/filiais-erp). */
export interface FilialErpItem {
    cnpj: string;
    nome: string;
    codigoDealer?: number | null;
    ativa: boolean;
    cadastrada: boolean;
    /** Vinculo da empresa ja cadastrada; null quando nao cadastrada. */
    vinculadoQive?: boolean | null;
    /** CNPJ existe na Qive; null quando a Qive nao respondeu. */
    disponivelNoQive?: boolean | null;
    problema?: string | null;
}

export interface ListagemFiliaisErp {
    erp: Erp;
    qiveRespondeu: boolean;
    filiais: FilialErpItem[];
}

export type StatusFilialErp = 'CRIADA' | 'ATUALIZADA' | 'JA_CADASTRADA' | 'NAO_ENCONTRADA' | 'ERRO';

export interface ResultadoFilialErp {
    cnpj: string;
    status: StatusFilialErp;
    mensagem?: string | null;
}
