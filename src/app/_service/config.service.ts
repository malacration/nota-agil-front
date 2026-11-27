import { Injectable, InjectionToken, Inject } from '@angular/core';

// Criar um InjectionToken para a configuração
export const APP_CONFIG = new InjectionToken<any>('app.config');

export interface KeycloakRuntimeConfig {
  url: string;
  realm: string;
  clientId: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: any;

  constructor(@Inject(APP_CONFIG) config: any) {
    this.config = config || {};
  }

  get apiUrl(): string {
    return this.config.apiUrl || 'http://localhost:8080';
  }

  get keycloak(): KeycloakRuntimeConfig {
    return this.config.keycloak || {};
  }

  get(key: string): any {
    return this.config[key];
  }
}
