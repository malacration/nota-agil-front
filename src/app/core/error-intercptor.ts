import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import Keycloak from 'keycloak-js';
import { KeycloakLoginService } from './keycloak/keycloak-login.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messages = inject(MessageService);
  const router = inject(Router, { optional: true }); // opcional
  const keycloak = inject(Keycloak, { optional: true });
  const login = inject(KeycloakLoginService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const status = err.status || 0;

      // Sessão expirada/ausente: reautentica via Keycloak em vez de apenas notificar.
      if (status === 401 && keycloak && !keycloak.authenticated) {
        void login.login(window.location.href).catch(() => {
          messages.add({ severity: 'error', summary: 'Login indisponível', detail: 'Não foi possível iniciar uma nova autenticação.' });
        });
        return throwError(() => err);
      }

      // Monte sua mensagem
      const summary = `Erro HTTP ${status}`;
      const detail =
        (err.error?.message as string) ||
        (typeof err.error === 'string' ? err.error : err.message) ||
        'Ocorreu um erro inesperado.';

      messages.add({
        severity: status >= 500 ? 'error' : 'warn',
        summary,
        detail,
        life: 8000
      });

      return throwError(() => err);
    })
  );
};
