import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { Company } from '@/_model/Comapny';
import { JobMode, JobStatus } from '@/_model/Job';

export interface TriggerResponse {
  triggered: boolean;
}

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly baseUrl: string;

  constructor(private config: ConfigService, private http: HttpClient) {
    this.baseUrl = `${this.config.apiUrl}/schedules`;
  }

  /** Lista todos os jobs */
  list(): Observable<JobStatus[]> {
    return this.http.get<JobStatus[]>(this.baseUrl);
  }

  /** Status de um job */
  status(id: string): Observable<JobStatus> {
    return this.http.get<JobStatus>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** Inicia um job (opcional: delay inicial em ms) — GET /{id}/start */
  start(id: string): Observable<JobStatus> {
    return this.http.get<JobStatus>(`${this.baseUrl}/${encodeURIComponent(id)}/start`);
  }

  /** Para um job — GET /{id}/stop */
  stop(id: string): Observable<JobStatus> {
    return this.http.get<JobStatus>(`${this.baseUrl}/${encodeURIComponent(id)}/stop`);
  }

  /** Executa uma vez imediatamente — GET /{id}/run-once */
  runOnce(id: string): Observable<TriggerResponse> {
    return this.http.get<TriggerResponse>(`${this.baseUrl}/${encodeURIComponent(id)}/run-once`);
  }

  /** Atualiza o período (ms) — GET /{id}/period?ms=...&restartIfRunning=... */
  setPeriod(id: string, minute: number, restartIfRunning: boolean = true): Observable<JobStatus> {
    const params = new HttpParams()
      .set('minute', String(minute))
      .set('restartIfRunning', String(restartIfRunning));
    return this.http.get<JobStatus>(`${this.baseUrl}/${encodeURIComponent(id)}/period`, { params });
  }

  /** Inicia todos — GET /start-all?delayMs=... */
  startAll(delayMs?: number): Observable<JobStatus[]> {
    let params = new HttpParams();
    if (delayMs != null) params = params.set('delayMs', String(delayMs));
    return this.http.get<JobStatus[]>(`${this.baseUrl}/start-all`, { params });
  }

  /** Para todos — POST /stop-all */
  stopAll(): Observable<JobStatus[]> {
    return this.http.post<JobStatus[]>(`${this.baseUrl}/stop-all`, null);
  }
}
