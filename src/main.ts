import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { AppComponent } from './app.component';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_CONFIG } from '@/_service/config.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { errorInterceptor } from '@/core/error-intercptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { loadingInterceptor } from '@/core/loading.interceptor';
import { HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';
import { includeBearerTokenInterceptor } from 'keycloak-angular';
import { buildKeycloakProviders, checkKeycloakReachable, createKeycloakInstance, initKeycloak, KeycloakCallbackError, loadKeycloakConfig } from '@/core/keycloak/keycloak-auth';
import { KEYCLOAK_SETUP_ERROR, KeycloakConfigErrorComponent, KeycloakSetupError } from '@/core/keycloak/keycloak-config-error';

async function bootstrapKeycloakError(error: KeycloakSetupError) {
  await bootstrapApplication(KeycloakConfigErrorComponent, {
    providers: [{ provide: KEYCLOAK_SETUP_ERROR, useValue: error }]
  }).catch((err) => console.error('Erro ao iniciar o app:', err));
}

/**
 * Config de runtime por ambiente (/assets/config.json, so `apiUrl`). Nao e versionada: a imagem
 * Docker gera o arquivo na subida a partir de NOTA_AGIL_API_URL (ou ele e montado); local, copie
 * src/assets/config.example.json. Sem ela, mostra o erro em vez de uma tela em branco.
 */
async function loadRuntimeConfig(): Promise<any> {
  const url = '/assets/config.json';
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    throw new Error(`Falha ao buscar ${url}: ${(err as Error)?.message ?? String(err)}`);
  }
  if (!response.ok) throw new Error(`${url} respondeu HTTP ${response.status}.`);
  let config: any;
  try {
    config = await response.json();
  } catch {
    throw new Error(`${url} não é um JSON válido.`);
  }
  if (!config || typeof config.apiUrl !== 'string' || !config.apiUrl.trim()) {
    throw new Error(`${url} não define "apiUrl".`);
  }
  return config;
}

async function main() {
  let configData: any;
  try {
    configData = await loadRuntimeConfig();
  } catch (err) {
    console.error('[Config] Configuração de runtime indisponível:', err);
    await bootstrapKeycloakError({
      title: 'Configuração da aplicação indisponível',
      description: 'O arquivo de configuração do ambiente (assets/config.json) não foi encontrado ou é inválido. ' +
        'Na imagem Docker, defina NOTA_AGIL_API_URL ou monte o arquivo; localmente, copie src/assets/config.example.json.',
      detail: (err as Error)?.message ?? String(err)
    });
    return;
  }

  // O backend e a fonte do realm/client, como no front-sap.
  try {
    configData.keycloak = await loadKeycloakConfig(configData.apiUrl);
  } catch (err) {
    await bootstrapKeycloakError({
      title: 'Configuração de autenticação indisponível',
      description: 'Não foi possível obter a configuração de login do servidor da aplicação.',
      detail: (err as Error)?.message ?? String(err)
    });
    return;
  }

  // 1) Keycloak inacessível ou realm inexistente — detecta antes de inicializar
  //    o SSO (a lib engole esse erro e ele estouraria depois no guard).
  const reachability = await checkKeycloakReachable(configData.keycloak);
  if (!reachability.ok) {
    console.error(`[Keycloak] ${reachability.reason} (discovery: ${reachability.discoveryUrl})`);
    await bootstrapKeycloakError({
      title: 'Keycloak indisponível',
      description: 'O SSO não pôde ser inicializado porque o servidor Keycloak não respondeu. Confira a configuração e se o serviço está no ar.',
      detail: `${reachability.reason}\n\nDiscovery: ${reachability.discoveryUrl}`
    });
    return;
  }

  // 2) Inicializa o Keycloak ANTES do bootstrap para evitar a corrida entre o
  //    init e a navegação inicial do router (o guard rodaria antes da auth).
  const keycloak = createKeycloakInstance(configData.keycloak);
  const keycloakProviders = buildKeycloakProviders(keycloak, configData.apiUrl);
  try {
    await initKeycloak(keycloak);
  } catch (err) {
    console.error('[Keycloak] Falha ao inicializar o SSO:', err);
    await bootstrapKeycloakError({
      title: 'Falha ao inicializar o SSO',
      description: err instanceof KeycloakCallbackError
        ? 'Não foi possível concluir esta tentativa de login.'
        : 'Não foi possível concluir a autenticação no servidor de login.',
      detail: (err as Error)?.message ?? String(err),
      retryUrl: err instanceof KeycloakCallbackError ? err.retryUrl : undefined
    });
    return;
  }

  const newAppConfig = {
    ...appConfig,
    providers: [
      // Instância do Keycloak já inicializada + providers do SSO.
      ...keycloakProviders,
      {
        provide: HIGHLIGHT_OPTIONS,
        useValue: {
          coreLibraryLoader: () => import('highlight.js/lib/core'),
          languages: {
            json: () => import('highlight.js/lib/languages/json'),
          },
        },
      },
      ...(appConfig.providers || []),
      provideAnimationsAsync(),
      providePrimeNG(),
      { provide: APP_CONFIG, useValue: configData },
      // `includeBearerTokenInterceptor` anexa o token nas requisições da API (ver keycloak-auth.ts).
      provideHttpClient(withInterceptors([includeBearerTokenInterceptor, errorInterceptor, loadingInterceptor])),
      MessageService,
      ConfirmationService
    ]
  };

  // Inicializar a aplicação
  bootstrapApplication(AppComponent, newAppConfig).catch((err) =>
    console.error('Erro ao iniciar o app:', err)
  );
}

main();
