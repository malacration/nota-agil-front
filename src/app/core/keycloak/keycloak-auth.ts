import { EnvironmentInjector, EnvironmentProviders, Provider, inject, provideAppInitializer, runInInjectionContext } from '@angular/core';
import {
    AutoRefreshTokenService,
    INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
    IncludeBearerTokenCondition,
    KEYCLOAK_EVENT_SIGNAL,
    UserActivityService,
    createInterceptorCondition,
    createKeycloakSignal,
    withAutoRefreshToken
} from 'keycloak-angular';
import Keycloak, { KeycloakInitOptions } from 'keycloak-js';
import { KeycloakRuntimeConfig } from '@/_service/config.service';

/**
 * Verifica se a configuração do Keycloak fornecida pelo backend veio completa.
 * Retorna a lista de campos ausentes/vazios (vazia quando está tudo certo).
 */
export function missingKeycloakConfig(kc: Partial<KeycloakRuntimeConfig> | undefined | null): string[] {
    const required: (keyof KeycloakRuntimeConfig)[] = ['url', 'realm', 'clientId'];
    return required.filter((key) => !kc?.[key] || String(kc[key]).trim() === '');
}

/** Mesma fonte de configuracao do front-sap: o backend define o realm e o client. */
export async function loadKeycloakConfig(apiUrl: string): Promise<KeycloakRuntimeConfig> {
    if (!apiUrl?.trim()) {
        throw new Error('A URL da API não foi configurada.');
    }
    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/auth/config`, {
        signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
        throw new Error(`Não foi possível carregar a configuração de autenticação (HTTP ${response.status}).`);
    }
    const auth = await response.json();
    if (auth.mode !== 'keycloak' || missingKeycloakConfig(auth.keycloak).length > 0) {
        throw new Error('O backend não retornou uma configuração válida do Keycloak.');
    }
    return auth.keycloak;
}

export interface KeycloakReachability {
    ok: boolean;
    /** URL de discovery consultada. */
    discoveryUrl: string;
    /** Mensagem quando `ok` é falso (servidor fora do ar, realm inexistente, etc.). */
    reason?: string;
}

/**
 * Verifica, antes de inicializar o SSO, se o servidor Keycloak está acessível
 * e o realm existe — consultando o endpoint público de discovery OIDC.
 *
 * Isso evita que uma falha de inicialização (servidor fora do ar ou realm
 * errado) seja engolida pela lib e acabe estourando mais tarde no guard.
 */
export async function checkKeycloakReachable(kc: KeycloakRuntimeConfig): Promise<KeycloakReachability> {
    const base = kc.url.replace(/\/+$/, '');
    const discoveryUrl = `${base}/realms/${encodeURIComponent(kc.realm)}/.well-known/openid-configuration`;

    try {
        // Timeout para não pendurar o boot caso o servidor aceite a conexão mas não responda.
        const res = await fetch(discoveryUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
        if (!res.ok) {
            return {
                ok: false,
                discoveryUrl,
                reason: `O servidor respondeu HTTP ${res.status}. Verifique se o realm "${kc.realm}" existe.`
            };
        }
        return { ok: true, discoveryUrl };
    } catch (err) {
        return {
            ok: false,
            discoveryUrl,
            reason: `Não foi possível conectar ao Keycloak em "${base}". Verifique se ele está no ar e se a URL está correta. (${(err as Error).message})`
        };
    }
}

/**
 * Escapa uma URL para uso seguro dentro de uma expressão regular.
 */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Cria a condição que instrui o interceptor a anexar o token Bearer
 * apenas nas requisições destinadas à API do backend (evita vazar o
 * token para hosts de terceiros).
 */
function bearerTokenConditionProvider(apiUrl: string): Provider {
    const condition = createInterceptorCondition<IncludeBearerTokenCondition>({
        urlPattern: new RegExp(`^${escapeRegExp(apiUrl)}(/.*)?$`, 'i'),
        bearerPrefix: 'Bearer'
    });

    return {
        provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
        useValue: condition,
        multi: true
    };
}

/**
 * Cria a instância do Keycloak (sem inicializar).
 */
export function createKeycloakInstance(kc: KeycloakRuntimeConfig): Keycloak {
    return new Keycloak({
        url: kc.url,
        realm: kc.realm,
        clientId: kc.clientId
    });
}

/**
 * Inicializa o Keycloak ANTES do bootstrap do Angular.
 *
 * Por que antes do bootstrap? Se deixássemos o `keycloak-angular` inicializar
 * via APP_INITIALIZER, esse init roda EM PARALELO com a navegação inicial do
 * router (também um app-initializer). O guard executaria antes de o token ser
 * processado e veria `authenticated=false` (corrida). Inicializando aqui,
 * garantimos que o estado de autenticação já esteja pronto quando o guard rodar.
 *
 * O login inicial fica sob responsabilidade do adapter antes do router. Na volta,
 * um callback invalido gera erro recuperavel, sem iniciar um ciclo de redirects.
 *
 * @returns `true` se há sessão ativa. Lança se o servidor for inacessível.
 */
export async function initKeycloak(keycloak: Keycloak): Promise<boolean> {
    const current = new URL(window.location.href);
    const query = current.searchParams;
    const fragment = new URLSearchParams(current.hash.substring(1));
    const callbackMode = query.has('code') || query.has('error') ? 'query'
        : fragment.has('code') || fragment.has('error') ? 'fragment' : undefined;
    const options: KeycloakInitOptions = {
        checkLoginIframe: false,
        pkceMethod: 'S256',
        responseMode: callbackMode ?? 'fragment',
        enableLogging: true
    };
    if (!callbackMode) options.onLoad = 'login-required';

    const authenticated = await keycloak.init(options);
    if (callbackMode && !authenticated) {
        // O adapter valida state, nonce e PKCE. Nao considerar que a existencia
        // de uma tentativa anterior, por si so, comprove uma sessao autenticada.
        const params = callbackMode === 'query' ? current.searchParams : fragment;
        for (const field of ['code', 'state', 'session_state', 'iss', 'error', 'error_description', 'error_uri']) {
            params.delete(field);
        }
        if (callbackMode === 'fragment') current.hash = params.toString();
        throw new KeycloakCallbackError(current.href);
    }
    return authenticated;
}

export class KeycloakCallbackError extends Error {
    constructor(readonly retryUrl: string) {
        super('O retorno do SSO não corresponde a uma solicitação de login válida nesta página. Inicie o login novamente.');
        this.name = 'KeycloakCallbackError';
    }
}

/**
 * Monta os providers do Keycloak para o Angular a partir de uma instância já
 * criada (e normalmente já inicializada). Replica o que o `provideKeycloak`
 * faz, porém SEM o auto-init — a inicialização é feita por `initKeycloak`.
 *
 * IMPORTANTE: chame antes de `initKeycloak`, pois `createKeycloakSignal`
 * registra os handlers (onReady/onAuthSuccess/...) usados durante o init.
 *
 * @param keycloak Instância do Keycloak.
 * @param apiUrl   URL base da API — usada para restringir onde o token Bearer é anexado.
 */
export function buildKeycloakProviders(keycloak: Keycloak, apiUrl: string): (Provider | EnvironmentProviders)[] {
    const autoRefresh = withAutoRefreshToken({
        onInactivityTimeout: 'logout',
        sessionTimeout: 30 * 60 * 1000
    });

    return [
        { provide: Keycloak, useValue: keycloak },
        { provide: KEYCLOAK_EVENT_SIGNAL, useValue: createKeycloakSignal(keycloak) },
        bearerTokenConditionProvider(apiUrl),
        // `withAutoRefreshToken` injeta esses serviços, que não são providedIn: 'root'.
        AutoRefreshTokenService,
        UserActivityService,
        // Configura a feature de auto-refresh no contexto de injeção, pós-bootstrap.
        provideAppInitializer(() => {
            const injector = inject(EnvironmentInjector);
            runInInjectionContext(injector, () => autoRefresh.configure());
        })
    ];
}
