import { Injectable, InjectionToken, Inject } from '@angular/core';
import { ConfigService } from './config.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Company } from '@/_model/Comapny';
import { Task } from '@/_model/Task';
import { PageSpring } from '@/_model/PageSpring';

// Criar um InjectionToken para a configuração
export const APP_CONFIG = new InjectionToken<any>('app.config');

@Injectable({
  providedIn: 'root'
})
export class TasksService {

  private apiUrl : string

  constructor(private config: ConfigService, private http: HttpClient) {
    this.apiUrl = config.apiUrl+"/tasks"
  }

  get(page : string): Observable<PageSpring<Task>> {
    
    let params = new HttpParams().set('page', page)
      
    let url = `${this.apiUrl}`;
    return this.http.get<any>(url,{params});
  }

  execute(idTask : string): Observable<void> {
    let url = `${this.apiUrl}/${idTask}`;
    return this.http.get<any>(url);
  }

}