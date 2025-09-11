import { Injectable, InjectionToken, Inject } from '@angular/core';
import { ConfigService } from './config.service';
import { HttpClient, HttpParams } from '@angular/common/http';

// Criar um InjectionToken para a configuração
export const APP_CONFIG = new InjectionToken<any>('app.config');

@Injectable({
  providedIn: 'root'
})
export class JobStateService {
  private apiUrl : string

  constructor(private config: ConfigService, private http: HttpClient) {
    this.apiUrl = config.apiUrl+"/job-state"

  }

  update(id : string, cursor : number, lastFrom : number){
    let url = `${this.apiUrl}/${id}`;
    let params = new HttpParams()
      .set('cursor', String(cursor))
      .set('lastFrom', String(lastFrom)); // em segundos (epoch)

    return this.http.put<void>(url, null, { params });
  }

 
}
