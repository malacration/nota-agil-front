FROM node:22 as build
WORKDIR /app

ENV PATH /usr/src/app/node_modules/.bin:$PATH
COPY package*.json /app/

RUN npm install
RUN npm install -g @angular/cli
RUN npm install --save-dev @angular-devkit/build-angular --force
COPY . /app
RUN ng build --configuration production --deploy-url / --base-href /

FROM nginx
COPY --from=build /app/dist/nota-agil-ng/browser/ /usr/share/nginx/html
COPY nginx-custom.conf /etc/nginx/conf.d/default.conf
# assets/config.json nao entra na imagem (nao versionado): e gerado na subida a partir de
# NOTA_AGIL_API_URL (URL do back acessivel pelo navegador) ou montado em
# /usr/share/nginx/html/assets/config.json. Sem nenhum dos dois, o container nao sobe.
COPY docker/runtime/40-nota-agil-config.sh /docker-entrypoint.d/40-nota-agil-config.sh
RUN chmod 755 /docker-entrypoint.d/40-nota-agil-config.sh \
    && rm -f /usr/share/nginx/html/assets/config.json
