import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Keycloak from 'keycloak-js';
import { AppTopbar } from './app.topbar';
import { AppConfigurator } from './app.configurator';
import { KeycloakLogoutService } from '@/core/keycloak/keycloak-logout.service';
import { PerfilService } from '@/_service/perfil.service';
import { of } from 'rxjs';

/** O configurador de tema real derruba o Chrome headless do Karma; não é alvo deste teste. */
@Component({ selector: 'app-configurator', standalone: true, template: '' })
class StubConfigurator {}

describe('AppTopbar', () => {
    const FAKE_TOKEN = 'header.payload.signature-NAO-DEVE-APARECER';
    let fixture: ComponentFixture<AppTopbar>;
    let keycloak: { token?: string; idToken?: string; tokenParsed?: Record<string, unknown> };
    let logoutService: { logout: jasmine.Spy };
    let perfilService: { limparMeuCache: jasmine.Spy };
    let messages: MessageService;

    afterEach(() => fixture?.destroy());

    const el = (): HTMLElement => fixture.nativeElement;
    const text = () => el().textContent ?? '';
    const byTestId = (id: string) => el().querySelectorAll<HTMLElement>(`[data-testid="${id}"]`);

    beforeEach(async () => {
        keycloak = {
            token: FAKE_TOKEN,
            idToken: FAKE_TOKEN,
            tokenParsed: { name: 'Maria Teste', preferred_username: 'maria.teste', email: 'maria@example.invalid' }
        };
        logoutService = { logout: jasmine.createSpy('logout').and.resolveTo() };
        perfilService = { limparMeuCache: jasmine.createSpy('limparMeuCache').and.returnValue(of(null)) };

        await TestBed.configureTestingModule({
            imports: [AppTopbar],
            providers: [
                provideRouter([]),
                provideNoopAnimations(),
                providePrimeNG(),
                MessageService,
                { provide: Keycloak, useValue: keycloak },
                { provide: KeycloakLogoutService, useValue: logoutService },
                { provide: PerfilService, useValue: perfilService }
            ]
        })
            .overrideComponent(AppTopbar, { remove: { imports: [AppConfigurator] }, add: { imports: [StubConfigurator] } })
            .compileComponents();

        messages = TestBed.inject(MessageService);
        fixture = TestBed.createComponent(AppTopbar);
        fixture.detectChanges();
    });

    it('não exibe mais os botões Calendar e Messages', () => {
        expect(text()).not.toContain('Calendar');
        expect(text()).not.toContain('Messages');
        expect(el().querySelector('.pi-calendar')).toBeNull();
        expect(el().querySelector('.pi-inbox')).toBeNull();
    });

    it('mostra o nome do usuário no botão da sessão', () => {
        const button = byTestId('user-button')[0];
        expect(button.querySelector('.pi-user')).not.toBeNull();
        expect(button.textContent).toContain('Maria Teste');
    });

    it('exibe nome, usuário e e-mail no menu mobile, com a ação Sair', () => {
        const mobile = byTestId('user-info-mobile')[0];
        expect(mobile.textContent).toContain('Maria Teste');
        expect(mobile.textContent).toContain('maria.teste');
        expect(mobile.textContent).toContain('maria@example.invalid');
        expect(mobile.querySelector('[data-testid="logout-button"]')).not.toBeNull();
    });

    it('abre o painel com os dados da sessão ao clicar no botão do usuário', async () => {
        byTestId('user-button')[0].click();
        fixture.detectChanges();
        await fixture.whenStable();
        const panel = document.querySelector<HTMLElement>('[data-testid="user-info-popover"]');
        expect(panel).not.toBeNull();
        expect(panel!.textContent).toContain('maria.teste');
        expect(panel!.textContent).toContain('maria@example.invalid');
        expect(panel!.querySelector('[data-testid="logout-button"]')).not.toBeNull();
    });

    it('usa preferred_username quando não há nome e omite campos ausentes', () => {
        keycloak.tokenParsed = { preferred_username: 'joao' };
        fixture.detectChanges();
        expect(byTestId('user-button')[0].textContent).toContain('joao');
        expect(byTestId('user-email').length).toBe(0);
    });

    it('nunca renderiza o token bruto', () => {
        expect(el().innerHTML).not.toContain(FAKE_TOKEN);
    });

    it('Sair chama o logout do SSO', async () => {
        byTestId('logout-button')[0].querySelector('button')!.click();
        await fixture.whenStable();
        expect(perfilService.limparMeuCache).toHaveBeenCalledTimes(1);
        expect(logoutService.logout).toHaveBeenCalledTimes(1);
    });

    it('avisa o usuário e libera nova tentativa quando o logout falha', async () => {
        spyOn(console, 'error');
        const add = spyOn(messages, 'add');
        logoutService.logout.and.rejectWith(new Error('indisponível'));

        await fixture.componentInstance.logout();

        expect(add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', summary: 'Não foi possível sair' }));
        expect(fixture.componentInstance.loggingOut).toBeFalse();
        expect((console.error as jasmine.Spy).calls.allArgs().flat().join(' ')).not.toContain(FAKE_TOKEN);
    });
});
