import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap, timeout } from 'rxjs/operators';
import { ConfigService } from './config.service';

export type Perfil = 'ADMIN' | 'OPERADOR' | 'INTEGRACAO';

export interface UsuarioLogado {
  login: string;
  perfil: Perfil;
}

export interface EntradaCacheFiliais {
  login: string;
  erp: 'SAP' | 'DEALER';
  filiais: number;
  carregadoEm: string;
  expiraEm: string;
}

export interface CacheFiliais {
  ttl: string;
  entradas: EntradaCacheFiliais[];
}

/**
 * Perfil do usuario logado (GET /me), carregado uma vez por sessao. admin: tudo; operador: so a
 * tela Notas ERP, nas filiais que o SAP/Dealer liberam para ele. Sem perfil (403): null, guardado.
 * Falha transitoria (rede, 5xx, 401...) nao fica em cache: o erro sobe e a proxima chamada tenta de novo.
 */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly apiUrl: string;
  private atual$?: Observable<UsuarioLogado | null>;
  private readonly carregado = new ReplaySubject<UsuarioLogado | null>(1);
  /** Ultimo perfil obtido com sucesso (o menu acompanha, inclusive depois de uma nova tentativa). */
  readonly usuarioCarregado$ = this.carregado.asObservable();

  constructor(config: ConfigService, private http: HttpClient) {
    this.apiUrl = config.apiUrl;
  }

  usuario(): Observable<UsuarioLogado | null> {
    this.atual$ ??= this.http.get<UsuarioLogado>(`${this.apiUrl}/me`).pipe(
      catchError((e) => {
        if (e?.status === 403) return of(null);
        this.atual$ = undefined;
        return throwError(() => e);
      }),
      tap((u) => this.carregado.next(u)),
      shareReplay(1)
    );
    return this.atual$;
  }

  ehAdmin(): Observable<boolean> {
    return this.usuario().pipe(map((u) => u?.perfil === 'ADMIN'));
  }

  /** Logout: limpa o cache das filiais do proprio usuario no back (falha nao impede o logout). */
  limparMeuCache(): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/me/cache-filiais`).pipe(timeout(3000), catchError(() => of(null)));
  }

  cacheFiliais(): Observable<CacheFiliais> {
    return this.http.get<CacheFiliais>(`${this.apiUrl}/admin/cache-filiais`);
  }

  invalidarTudo(): Observable<{ removidas: number }> {
    return this.http.delete<{ removidas: number }>(`${this.apiUrl}/admin/cache-filiais`);
  }

  invalidarUsuario(login: string): Observable<{ removidas: number }> {
    return this.http.delete<{ removidas: number }>(`${this.apiUrl}/admin/cache-filiais/${encodeURIComponent(login)}`);
  }
}
