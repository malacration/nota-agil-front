import { Component, InjectionToken, inject } from '@angular/core';

export interface KeycloakSetupError {
    retryUrl?: string;
    /** Título curto do problema. */
    title: string;
    /** Explicação para o desenvolvedor. */
    description: string;
    /** Chaves ausentes na configuração (quando o problema é config incompleta). */
    missingKeys?: string[];
    /** Detalhe técnico adicional (ex.: URL do realm, mensagem do fetch). */
    detail?: string;
    /** Exibe o snippet de exemplo do config.json. */
    showSnippet?: boolean;
}

/** Payload com o motivo do erro de configuração do Keycloak, injetado no bootstrap de erro. */
export const KEYCLOAK_SETUP_ERROR = new InjectionToken<KeycloakSetupError>('keycloak.setup.error');

/**
 * Tela exibida quando o SSO não pôde ser inicializado — seja porque o bloco
 * `keycloak` do /assets/config.json está ausente/incompleto, seja porque o
 * servidor Keycloak não respondeu (não está rodando ou realm inexistente).
 *
 * Em vez de a aplicação quebrar de forma obscura, ela carrega e mostra ao
 * desenvolvedor exatamente o que precisa ser corrigido.
 */
@Component({
    // Usa 'app-root' para montar no elemento existente do index.html. Este
    // componente só é inicializado no caminho de erro (quando o AppComponent
    // NÃO é inicializado), portanto não há conflito de seletor.
    selector: 'app-root',
    standalone: true,
    template: `
        <div class="kc-error">
            <div class="kc-card">
                <div class="kc-icon">⚠️</div>
                <h1>{{ error.title }}</h1>
                <p>{{ error.description }}</p>

                @if (error.retryUrl) {
                    <a class="kc-retry" [href]="error.retryUrl">Iniciar login novamente</a>
                }

                @if (error.missingKeys?.length) {
                    <p class="kc-label">Campos faltando:</p>
                    <ul class="kc-missing">
                        @for (key of error.missingKeys; track key) {
                            <li><code>keycloak.{{ key }}</code></li>
                        }
                    </ul>
                }

                @if (error.detail) {
                    <p class="kc-label">Detalhe:</p>
                    <pre class="kc-snippet">{{ error.detail }}</pre>
                }

                @if (error.showSnippet) {
                    <p class="kc-label">Configure em <code>/assets/config.json</code>:</p>
                    <pre class="kc-snippet">{{ snippet }}</pre>
                }
            </div>
        </div>
    `,
    styles: [
        `
            :host {
                display: block;
            }
            .kc-error {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                background: #0f172a;
                color: #e2e8f0;
                font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            }
            .kc-card {
                max-width: 560px;
                width: 100%;
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 16px;
                padding: 2.5rem;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
            }
            .kc-retry {
                display: inline-block;
                margin: 1rem 0;
                color: #a5f3fc;
            }
            .kc-icon {
                font-size: 2.5rem;
                line-height: 1;
                margin-bottom: 1rem;
            }
            h1 {
                font-size: 1.5rem;
                font-weight: 600;
                margin: 0 0 1rem;
                color: #f8fafc;
            }
            p {
                margin: 0 0 1rem;
                line-height: 1.6;
                color: #cbd5e1;
            }
            .kc-label {
                font-weight: 600;
                color: #f8fafc;
                margin-bottom: 0.5rem;
            }
            .kc-missing {
                margin: 0 0 1.5rem;
                padding-left: 1.25rem;
            }
            .kc-missing li {
                margin-bottom: 0.25rem;
            }
            code {
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 6px;
                padding: 0.1rem 0.4rem;
                font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
                font-size: 0.85em;
                color: #fbbf24;
            }
            .kc-snippet {
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 10px;
                padding: 1rem;
                overflow-x: auto;
                margin: 0 0 1rem;
                color: #a5f3fc;
                white-space: pre-wrap;
                word-break: break-word;
                font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
                font-size: 0.85rem;
                line-height: 1.5;
            }
        `
    ]
})
export class KeycloakConfigErrorComponent {
    readonly error = inject(KEYCLOAK_SETUP_ERROR);

    readonly snippet = [
        '{',
        '    "apiUrl": "http://172.18.10.76:8091",',
        '    "keycloak": {',
        '        "url": "http://localhost:8080",',
        '        "realm": "nota-agil",',
        '        "clientId": "nota-agil-front"',
        '    }',
        '}'
    ].join('\n');
}
