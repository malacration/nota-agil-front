import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { perfilGuard } from './perfil.guard';
import { PerfilService } from '@/_service/perfil.service';

describe('perfilGuard', () => {
  let perfil: jasmine.SpyObj<PerfilService>;

  beforeEach(() => {
    perfil = jasmine.createSpyObj('PerfilService', ['usuario']);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: PerfilService, useValue: perfil }] });
  });

  function executar(url: string): boolean | UrlTree {
    let resultado: boolean | UrlTree = false;
    TestBed.runInInjectionContext(() =>
      (perfilGuard('ADMIN')({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot) as Observable<boolean | UrlTree>)
        .subscribe((r) => (resultado = r))
    );
    return resultado;
  }

  it('falha transitoria leva a tela de nova tentativa com a rota pedida; depois libera', () => {
    perfil.usuario.and.returnValues(throwError(() => ({ status: 502 })), of({ login: 'ana', perfil: 'ADMIN' }));
    const router = TestBed.inject(Router);
    const r1 = executar('/tasks');
    expect(router.serializeUrl(r1 as UrlTree)).toBe('/sem-perfil?indisponivel=1&voltar=%2Ftasks');
    expect(executar('/tasks')).toBeTrue();
  });

  it('sem perfil (null) vai para a tela explicativa', () => {
    perfil.usuario.and.returnValue(of(null));
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(executar('/tasks') as UrlTree)).toBe('/sem-perfil');
  });
});
