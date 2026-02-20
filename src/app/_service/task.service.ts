import { Injectable } from '@angular/core';
import { ConfigService } from './config.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, TaskListQuery } from '@/_model/Task';
import { PageSpring } from '@/_model/PageSpring';

@Injectable({
  providedIn: 'root'
})
export class TasksService {
  private readonly apiUrl: string;

  constructor(private config: ConfigService, private http: HttpClient) {
    this.apiUrl = `${config.apiUrl}/tasks`;
  }

  list(query: TaskListQuery = {}): Observable<PageSpring<Task>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 20));

    if (query.taskType) {
      params = params.set('taskType', query.taskType);
    }

    if (query.status) {
      params = params.set('status', query.status);
    }

    const tomador = query.tomador?.trim();
    if (tomador) {
      params = params.set('tomador', tomador);
    }

    return this.http.get<PageSpring<Task>>(this.apiUrl, { params });
  }

  execute(idTask: string): Observable<void> {
    return this.http.get<void>(`${this.apiUrl}/${idTask}`);
  }
}
