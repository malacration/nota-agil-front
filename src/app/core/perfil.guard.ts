import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Perfil, PerfilService } from '@/_service/perfil.service';

/**
 * Exige um dos perfis. Operador que cai numa tela de admin vai para Notas ERP; usuario sem perfil
 * vai para a tela explicativa. A autorizacao real e do back (403); isto so evita telas quebradas.
 * Se o /me falhar por erro transitorio, a tela explicativa oferece tentar de novo a rota pedida.
 */
export function perfilGuard(...permitidos: Perfil[]): CanActivateFn {
  return (_route, state) => {
    const router = inject(Router);
    return inject(PerfilService).usuario().pipe(
      map((u) => {
        if (u && permitidos.includes(u.perfil)) return true;
        if (u?.perfil === 'OPERADOR') return router.parseUrl('/notas-erp');
        return router.parseUrl('/sem-perfil');
      }),
      catchError(() =>
        of(router.createUrlTree(['/sem-perfil'], { queryParams: { indisponivel: 1, voltar: state.url } }))
      )
    );
  };
}
