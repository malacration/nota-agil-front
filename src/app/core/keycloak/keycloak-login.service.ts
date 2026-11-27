import { Injectable, inject } from '@angular/core';
import Keycloak from 'keycloak-js';

/** Compartilha o redirecionamento entre guard e interceptor, somente nesta pagina. */
@Injectable({ providedIn: 'root' })
export class KeycloakLoginService {
    private readonly keycloak = inject(Keycloak);
    private pending?: Promise<void>;

    login(returnUrl: string): Promise<void> {
        if (this.pending) return this.pending;

        const target = new URL(returnUrl, window.location.origin);
        const redirectUri = target.origin === window.location.origin ? target.href : window.location.origin;
        this.pending = this.keycloak.login({ redirectUri }).catch((error) => {
            this.pending = undefined;
            throw error;
        });
        return this.pending;
    }
}
