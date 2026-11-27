import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { Erp } from '@/_model/ConsultaErp';
import {
  EmpresaNotasErp,
  ErpNotasDisponivel,
  FiltroNotasErp,
  ImportacaoNotasErp,
  ListagemNotasErp
} from '@/_model/NotaErp';

/** Notas fiscais de entrada (contas a pagar) dos ERPs, fonte alternativa ao Qive, sob demanda. */
@Injectable({ providedIn: 'root' })
export class NotasErpService {
  private readonly apiUrl: string;

  constructor(config: ConfigService, private http: HttpClient) {
    this.apiUrl = config.apiUrl + '/erp/notas-entrada';
  }

  erps(): Observable<ErpNotasDisponivel[]> {
    return this.http.get<ErpNotasDisponivel[]>(`${this.apiUrl}/erps`);
  }

  empresas(erp: Erp): Observable<EmpresaNotasErp[]> {
    return this.http.get<EmpresaNotasErp[]>(`${this.apiUrl}/empresas`, { params: { erp } });
  }

  listar(filtro: FiltroNotasErp): Observable<ListagemNotasErp> {
    let params = new HttpParams()
      .set('erp', filtro.erp)
      .set('cnpj', filtro.cnpj)
      .set('dataInicial', filtro.dataInicial)
      .set('dataFinal', filtro.dataFinal);
    if (filtro.fornecedor?.trim()) params = params.set('fornecedor', filtro.fornecedor.trim());
    if (filtro.numero?.trim()) params = params.set('numero', filtro.numero.trim());
    return this.http.get<ListagemNotasErp>(this.apiUrl, { params });
  }

  criarTasks(erp: Erp, cnpj: string, ids: string[]): Observable<ImportacaoNotasErp> {
    return this.http.post<ImportacaoNotasErp>(`${this.apiUrl}/tasks`, { erp, cnpj, ids });
  }
}
