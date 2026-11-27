import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import Keycloak from 'keycloak-js';
import { canActivateAuth } from './auth.guard';
import { KeycloakLoginService } from './keycloak-login.service';

describe('login compartilhado do Keycloak', () => {
    let keycloak: { authenticated: boolean; didInitialize: boolean; login: jasmine.Spy };
    const guard = () => TestBed.runInInjectionContext(() =>
        canActivateAuth({} as ActivatedRouteSnapshot, { url: '/notas?status=pendente' } as RouterStateSnapshot));

    beforeEach(() => {
        keycloak = { authenticated: false, didInitialize: true, login: jasmine.createSpy('login').and.resolveTo() };
        TestBed.configureTestingModule({ providers: [{ provide: Keycloak, useValue: keycloak }] });
    });

    afterEach(() => sessionStorage.removeItem('kc-login-attempt'));

    it('libera a navegação quando o adapter confirmou a sessão', async () => {
        keycloak.authenticated = true;
        expect(await guard()).toBeTrue();
        expect(keycloak.login).not.toHaveBeenCalled();
    });

    it('uma marca antiga no navegador não impede nova autenticação', async () => {
        sessionStorage.setItem('kc-login-attempt', '1');
        expect(await guard()).toBeFalse();
        expect(keycloak.login).toHaveBeenCalledOnceWith({ redirectUri: `${location.origin}/notas?status=pendente` });
    });

    it('guard e chamadas HTTP simultâneas iniciam somente um login', async () => {
        const navigation = guard();
        await TestBed.inject(KeycloakLoginService).login('/outra-rota');
        await navigation;
        expect(keycloak.login).toHaveBeenCalledTimes(1);
    });

    it('permite tentar novamente quando o redirecionamento falha', async () => {
        const login = TestBed.inject(KeycloakLoginService);
        keycloak.login.and.rejectWith(new Error('indisponível'));
        await expectAsync(login.login('/')).toBeRejected();
        keycloak.login.and.resolveTo();
        await login.login('/');
        expect(keycloak.login).toHaveBeenCalledTimes(2);
    });

    it('não aceita destino em outro domínio', async () => {
        await TestBed.inject(KeycloakLoginService).login('https://outro.example.invalid/');
        expect(keycloak.login).toHaveBeenCalledOnceWith({ redirectUri: location.origin });
    });

    it('bloqueia navegação sem chamar adapter não inicializado', async () => {
        spyOn(console, 'error');
        keycloak.didInitialize = false;
        expect(await guard()).toBeFalse();
        expect(keycloak.login).not.toHaveBeenCalled();
    });
});
