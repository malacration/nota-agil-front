import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PerfilService, UsuarioLogado } from './perfil.service';
import { APP_CONFIG } from './config.service';

describe('PerfilService', () => {
  let service: PerfilService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: APP_CONFIG, useValue: { apiUrl: 'http://api' } }]
    });
    service = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('falha transitoria nao fica em cache: a proxima chamada consulta de novo e obtem o perfil', () => {
    let erro: any;
    service.usuario().subscribe({ error: (e) => (erro = e) });
    http.expectOne('http://api/me').flush('down', { status: 503, statusText: 'Unavailable' });
    expect(erro?.status).toBe(503);

    let usuario: UsuarioLogado | null | undefined;
    let carregado: UsuarioLogado | null | undefined;
    service.usuarioCarregado$.subscribe((u) => (carregado = u));
    service.usuario().subscribe((u) => (usuario = u));
    http.expectOne('http://api/me').flush({ login: 'ana', perfil: 'OPERADOR' });
    expect(usuario?.perfil).toBe('OPERADOR');
    expect(carregado?.perfil).toBe('OPERADOR');

    // Sucesso fica em cache.
    service.usuario().subscribe();
    http.expectNone('http://api/me');
  });

  it('erro de rede tambem permite nova tentativa', () => {
    service.usuario().subscribe({ error: () => {} });
    http.expectOne('http://api/me').error(new ProgressEvent('error'));
    service.usuario().subscribe();
    http.expectOne('http://api/me').flush({ login: 'ana', perfil: 'ADMIN' });
  });

  it('403 (sem perfil) vira null e fica em cache', () => {
    let usuario: UsuarioLogado | null | undefined;
    service.usuario().subscribe((u) => (usuario = u));
    http.expectOne('http://api/me').flush({ mensagem: 'sem perfil' }, { status: 403, statusText: 'Forbidden' });
    expect(usuario).toBeNull();
    service.usuario().subscribe();
    http.expectNone('http://api/me');
  });
});
