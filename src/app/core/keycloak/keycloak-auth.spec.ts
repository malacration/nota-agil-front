import Keycloak from 'keycloak-js';
import { initKeycloak, KeycloakCallbackError, loadKeycloakConfig } from './keycloak-auth';

describe('configuração Keycloak fornecida pelo backend', () => {
    it('consulta auth/config e utiliza realm e client do backend', async () => {
        const config = { url: 'https://sso.example.invalid', realm: 'teste', clientId: 'nota-agil' };
        const request = spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({ mode: 'keycloak', keycloak: config })));

        expect(await loadKeycloakConfig('/api/')).toEqual(config);
        expect(request.calls.mostRecent().args[0]).toBe('/api/auth/config');
    });

    it('interrompe a inicialização quando o backend falha', async () => {
        spyOn(window, 'fetch').and.resolveTo(new Response('', { status: 503 }));
        await expectAsync(loadKeycloakConfig('/api')).toBeRejectedWithError(/HTTP 503/);
    });

    it('rejeita configuração incompleta ou modo diferente', async () => {
        const request = spyOn(window, 'fetch');
        for (const config of [{ mode: 'internal' }, { mode: 'keycloak', keycloak: { url: 'https://sso.example.invalid' } }]) {
            request.and.resolveTo(new Response(JSON.stringify(config)));
            await expectAsync(loadKeycloakConfig('/api')).toBeRejectedWithError(/configuração válida/);
        }
    });

    it('exige endereço da API sem disparar requisição', async () => {
        const request = spyOn(window, 'fetch');
        await expectAsync(loadKeycloakConfig('')).toBeRejectedWithError(/URL da API/);
        expect(request).not.toHaveBeenCalled();
    });
});

describe('retorno do SSO antes do router', () => {
    let originalUrl: string;
    let keycloak: Keycloak;
    const state = 'nota-agil-regression-state';
    const nonce = 'nota-agil-regression-nonce';

    beforeEach(() => {
        originalUrl = location.href;
        keycloak = new Keycloak({ url: 'https://sso.example.invalid', realm: 'teste', clientId: 'nota-agil' });
    });

    afterEach(() => {
        history.replaceState(null, '', originalUrl);
        localStorage.removeItem(`kc-callback-${state}`);
        keycloak.clearToken();
    });

    function callback(mode: 'query' | 'fragment', storeState = true) {
        history.replaceState(null, '', `/notas?filtro=abertas${mode === 'query' ? '&' : '#'}code=temporary-code&state=${state}&session_state=session&iss=https%3A%2F%2Fsso.example.invalid`);
        if (storeState) {
            localStorage.setItem(`kc-callback-${state}`, JSON.stringify({
                state, nonce, redirectUri: `${location.origin}/notas?filtro=abertas`,
                pkceCodeVerifier: 'test-verifier', expires: Date.now() + 60000
            }));
        }
    }

    function mockTokenResponse(idNonce = nonce) {
        // Apenas tokens sintéticos para o adapter. A assinatura é validada no backend.
        const jwt = (claims: object) => `e30.${btoa(JSON.stringify(claims))}.test`;
        const now = Math.floor(Date.now() / 1000);
        return spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({
            access_token: jwt({ sub: 'test-user', iat: now, exp: now + 300 }),
            refresh_token: jwt({ sub: 'test-user' }),
            id_token: jwt({ sub: 'test-user', nonce: idNonce })
        })));
    }

    it('delega o login inicial ao adapter antes de iniciar navegação', async () => {
        history.replaceState(null, '', '/notas');
        const init = spyOn(keycloak, 'init').and.resolveTo(true);
        expect(await initKeycloak(keycloak)).toBeTrue();
        expect(init).toHaveBeenCalledOnceWith(jasmine.objectContaining({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false }));
    });

    for (const mode of ['fragment', 'query'] as const) {
        it(`processa callback ${mode}, valida nonce e troca code com PKCE`, async () => {
            callback(mode);
            const fetch = mockTokenResponse();
            expect(await initKeycloak(keycloak)).toBeTrue();
            expect(keycloak.authenticated).toBeTrue();
            expect(location.href).toBe(`${location.origin}/notas?filtro=abertas`);
            const [url, request] = fetch.calls.mostRecent().args;
            expect(url).toBe('https://sso.example.invalid/realms/teste/protocol/openid-connect/token');
            const body = new URLSearchParams(String(request?.body));
            expect(body.get('code')).toBe('temporary-code');
            expect(body.get('code_verifier')).toBe('test-verifier');
            expect(body.get('client_id')).toBe('nota-agil');
            expect(localStorage.getItem(`kc-callback-${state}`)).toBeNull();
        });

        it(`callback ${mode} sem state salvo oferece reinício sem loop nem código na URL`, async () => {
            callback(mode, false);
            const login = spyOn(keycloak, 'login');
            const fetch = spyOn(window, 'fetch');
            try {
                await initKeycloak(keycloak);
                fail('callback inválido deveria ser rejeitado');
            } catch (error) {
                expect(error).toBeInstanceOf(KeycloakCallbackError);
                expect((error as KeycloakCallbackError).retryUrl).toBe(`${location.origin}/notas?filtro=abertas`);
                expect(String(error)).not.toContain('temporary-code');
            }
            expect(login).not.toHaveBeenCalled();
            expect(fetch).not.toHaveBeenCalled();
            expect(keycloak.authenticated).toBeFalse();
        });
    }

    it('continua rejeitando nonce divergente em vez de aceitar sessão inválida', async () => {
        callback('fragment');
        mockTokenResponse('outro-nonce');
        await expectAsync(initKeycloak(keycloak)).toBeRejectedWithError('Invalid nonce.');
        expect(keycloak.authenticated).toBeFalse();
        expect(keycloak.token).toBeUndefined();
    });
});
