# Sakai19

## Login no Nota Agil

O frontend consulta `GET {apiUrl}/auth/config` no backend para obter a configuracao
do Keycloak de producao (realm `rovema`, client `nota-agil`). O arquivo local
`src/assets/config.json` precisa conter apenas `apiUrl`; use `config.example.json`
como referencia. O login utiliza Authorization Code + PKCE, e as chamadas a API
enviam o access token como Bearer. O backend valida o JWT pelas chaves JWKS do realm.

Configuracao completa e clients de integracao: [Keycloak no backend](../back/docs/keycloak.md).

## Configuracao de runtime (`assets/config.json`)

`src/assets/config.json` nao e versionado (esta no `.gitignore`) e nao entra nas imagens Docker.
Sem ele o front nao inicia e mostra a tela "Configuracao da aplicacao indisponivel".

- **Local (`ng serve`)**: `cp src/assets/config.example.json src/assets/config.json` e ajuste `apiUrl`.
- **Imagens Docker (`Dockerfile` e `Dockerfile.hmg`)**: o script
  `docker/runtime/40-nota-agil-config.sh` roda no entrypoint do nginx e gera o arquivo na subida:
  - se ja existir um arquivo montado em `/usr/share/nginx/html/assets/config.json`, ele e usado (precedencia);
  - senao, gera `{"apiUrl": "$NOTA_AGIL_API_URL"}`;
  - sem nenhum dos dois, o container falha na subida (log `ERRO: defina NOTA_AGIL_API_URL ...`).
- `Dockerfile.hmg` ja define `NOTA_AGIL_API_URL=/api` (o nginx da imagem faz proxy de `/api` para o back);
  o healthcheck consulta `/assets/config.json`.
- `Dockerfile` (imagem publicada) **nao tem padrao**: informe a URL do back vista pelo navegador, por exemplo
  `docker run -e NOTA_AGIL_API_URL=http://<host-do-back>:8091 malacration/nota-agil-front:<versao>`.

O arquivo so deve conter `apiUrl` (nada de segredos: ele e publico para o navegador).

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
