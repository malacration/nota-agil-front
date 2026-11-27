import { TestBed } from '@angular/core/testing';
import Keycloak from 'keycloak-js';
import { KeycloakLogoutService } from './keycloak-logout.service';

describe('KeycloakLogoutService', () => {
    let keycloak: { didInitialize: boolean; logout: jasmine.Spy; clearToken: jasmine.Spy };
    let service: KeycloakLogoutService;

    beforeEach(() => {
        keycloak = {
            didInitialize: true,
            logout: jasmine.createSpy('logout').and.resolveTo(),
            clearToken: jasmine.createSpy('clearToken')
        };
        TestBed.configureTestingModule({ providers: [{ provide: Keycloak, useValue: keycloak }] });
        service = TestBed.inject(KeycloakLogoutService);
    });

    it('encerra a sessão SSO voltando para a raiz da origem atual', async () => {
        await service.logout();
        expect(keycloak.logout).toHaveBeenCalledOnceWith({ redirectUri: `${location.origin}/` });
    });

    it('não limpa o token localmente (evitaria um novo login em paralelo)', async () => {
        await service.logout();
        expect(keycloak.clearToken).not.toHaveBeenCalled();
    });

    it('cliques repetidos reaproveitam a mesma tentativa', async () => {
        let finish!: () => void;
        keycloak.logout.and.returnValue(new Promise<void>((resolve) => (finish = resolve)));
        const first = service.logout();
        const second = service.logout();
        finish();
        await Promise.all([first, second]);
        expect(keycloak.logout).toHaveBeenCalledTimes(1);
    });

    it('propaga a falha e permite tentar novamente', async () => {
        keycloak.logout.and.rejectWith(new Error('indisponível'));
        await expectAsync(service.logout()).toBeRejectedWithError('indisponível');
        keycloak.logout.and.resolveTo();
        await service.logout();
        expect(keycloak.logout).toHaveBeenCalledTimes(2);
    });

    it('recusa sair quando o adapter não foi inicializado', async () => {
        keycloak.didInitialize = false;
        await expectAsync(service.logout()).toBeRejected();
        expect(keycloak.logout).not.toHaveBeenCalled();
    });
});
