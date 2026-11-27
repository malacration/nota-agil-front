import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthGuardData, createAuthGuard } from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { KeycloakLoginService } from './keycloak-login.service';

/**
 * Regra de acesso: exige um usuário autenticado. Caso não haja sessão,
 * dispara o login do Keycloak preservando a rota de destino para retorno.
 *
 * Roles podem ser exigidas usando `authData.grantedRoles`, por exemplo:
 *   return authenticated && grantedRoles.realmRoles.includes('admin');
 */
const isAccessAllowed = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
    authData: AuthGuardData
): Promise<boolean | UrlTree> => {
    const { authenticated } = authData;
    const keycloak = inject(Keycloak);

    if (authenticated) {
        return true;
    }

    // Só é seguro chamar login() se o Keycloak inicializou (senão daria TypeError).
    if (!keycloak.didInitialize) {
        console.error('[Keycloak] Instância não inicializada — navegação bloqueada.');
        return false;
    }

    // Sessao perdida depois do bootstrap: uma unica nova autenticacao, sem flag
    // persistente que possa bloquear o usuario ao atualizar ou voltar pelo SSO.
    await inject(KeycloakLoginService).login(state.url);
    return false;
};

export const canActivateAuth = createAuthGuard<CanActivateFn>(isAccessAllowed);
