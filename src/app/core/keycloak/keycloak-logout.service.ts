import { Injectable, inject } from '@angular/core';
import Keycloak from 'keycloak-js';

/**
 * Encerra a sessao SSO (RP-initiated logout) e volta para a raiz da aplicacao.
 *
 * - O retorno e sempre a origem atual com barra final (`http://host:porta/`), que
 *   casa com `http://host:porta/*` nas Valid (Post Logout) Redirect URIs do client
 *   e nao depende da rota atual.
 * - O adapter envia `client_id` e `id_token_hint`; o Keycloak encerra a sessao sem
 *   pedir confirmacao (aceita inclusive ID token vencido).
 * - Nao chama `clearToken()`: com `onLoad: 'login-required'` o adapter dispararia
 *   um novo login em paralelo ao logout.
 * - Cliques repetidos reaproveitam a mesma tentativa; em caso de erro, libera nova
 *   tentativa e propaga o erro para a UI avisar o usuario.
 */
@Injectable({ providedIn: 'root' })
export class KeycloakLogoutService {
    private readonly keycloak = inject(Keycloak);
    private pending?: Promise<void>;

    logout(): Promise<void> {
        if (this.pending) return this.pending;

        this.pending = this.redirectToEndSession().catch((error) => {
            this.pending = undefined;
            throw error;
        });
        return this.pending;
    }

    private async redirectToEndSession(): Promise<void> {
        if (!this.keycloak.didInitialize) {
            throw new Error('O SSO não foi inicializado; não há sessão para encerrar.');
        }
        await this.keycloak.logout({ redirectUri: `${window.location.origin}/` });
    }
}
