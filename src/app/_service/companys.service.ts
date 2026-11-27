import { Injectable, InjectionToken, Inject } from '@angular/core';
import { ConfigService } from './config.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Company, ListagemFiliaisErp, ResultadoFilialErp } from '@/_model/Comapny';
import { Erp, ErpDisponivel } from '@/_model/ConsultaErp';

// Criar um InjectionToken para a configuração
export const APP_CONFIG = new InjectionToken<any>('app.config');

@Injectable({
  providedIn: 'root'
})
export class CompanysService {

  private apiUrl : string

  constructor(private config: ConfigService, private http: HttpClient) {
    this.apiUrl = config.apiUrl+"/companys"

  }

  get(): Observable<Array<Company>> {
    let url = `${this.apiUrl}`;
    return this.http.get<any>(url);
  }

  getCnpjsDisponiveis(): Observable<Array<string>> {
    let url = `${this.apiUrl}`;
    return this.http.get<any>(url+"/cnpjs-disponiveis");
  }

  salvar(entry : Company){
    return this.http.post<any>(this.apiUrl,entry);
  }

  getErpsDisponiveis(): Observable<ErpDisponivel[]> {
    return this.http.get<ErpDisponivel[]>(`${this.apiUrl}/erps-disponiveis`);
  }

  atualizarErp(cnpj: string, erpPagamento: Erp | null): Observable<Company> {
    return this.http.put<Company>(`${this.apiUrl}/${encodeURIComponent(cnpj)}/erp`, { erpPagamento });
  }

  atualizarCodigoDealer(cnpj: string, codigoDealer: number | null): Observable<Company> {
    return this.http.put<Company>(`${this.apiUrl}/${encodeURIComponent(cnpj)}/dealer`, { codigoDealer });
  }

  vincularQive(cnpj: string): Observable<Company> {
    return this.http.put<Company>(`${this.apiUrl}/${encodeURIComponent(cnpj)}/qive`, {});
  }

  /** Filiais do ERP (SAP/Dealer) com a situacao no cadastro e na Qive. */
  filiaisErp(erp: Erp): Observable<ListagemFiliaisErp> {
    return this.http.get<ListagemFiliaisErp>(`${this.apiUrl}/filiais-erp`, { params: { erp } });
  }

  /** Cadastra filiais do ERP; vinculo com a Qive so quando o CNPJ existe la. */
  importarFiliaisErp(erp: Erp, cnpjs: string[]): Observable<ResultadoFilialErp[]> {
    return this.http.post<ResultadoFilialErp[]>(`${this.apiUrl}/filiais-erp`, { erp, cnpjs });
  }

  delete(cnpj : string){
    return this.http.delete<any>(this.apiUrl+"/"+cnpj);
  }

}
