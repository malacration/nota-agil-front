import { Injectable, InjectionToken, Inject } from '@angular/core';
import { ConfigService } from './config.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Company } from '@/_model/Comapny';

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

  delete(cnpj : string){
    return this.http.delete<any>(this.apiUrl+"/"+cnpj);
  }

}