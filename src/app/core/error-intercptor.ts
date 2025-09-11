import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messages = inject(MessageService);
  const router = inject(Router, { optional: true }); // opcional

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Monte sua mensagem
      const status = err.status || 0;
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
