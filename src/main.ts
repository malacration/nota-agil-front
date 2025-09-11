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

async function main() {
  const response = await fetch('/assets/config.json');
  const configData = await response.json();

  const newAppConfig = {
    ...appConfig,
    providers: [
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
      provideHttpClient(withInterceptors([errorInterceptor,loadingInterceptor])),
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
