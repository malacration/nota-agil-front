#!/bin/sh
# Gera /assets/config.json na subida do container (rodado pelo entrypoint da imagem nginx, em
# /docker-entrypoint.d). O arquivo nao e versionado nem entra na imagem.
#   - arquivo montado no destino: usado como esta (tem precedencia);
#   - senao, NOTA_AGIL_API_URL: gera {"apiUrl": "<valor>"};
#   - nenhum dos dois: falha a subida (melhor que servir o app sem config).
set -eu

ALVO="${NOTA_AGIL_CONFIG_PATH:-/usr/share/nginx/html/assets/config.json}"

if [ -s "$ALVO" ]; then
  echo "$0: usando $ALVO existente (montado); NOTA_AGIL_API_URL ignorado"
  exit 0
fi

API_URL="${NOTA_AGIL_API_URL:-}"
if [ -z "$API_URL" ]; then
  echo "$0: ERRO: defina NOTA_AGIL_API_URL (ex.: /api ou https://nota-agil-api.exemplo) ou monte $ALVO" >&2
  exit 1
fi

# Uma linha, sem caracteres de controle; escapa \ e " para o JSON.
if [ "$(printf '%s' "$API_URL" | tr -d '[:cntrl:]')" != "$API_URL" ]; then
  echo "$0: ERRO: NOTA_AGIL_API_URL contem caracteres de controle" >&2
  exit 1
fi
ESCAPADO=$(printf '%s' "$API_URL" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

mkdir -p "$(dirname "$ALVO")"
printf '{\n  "apiUrl": "%s"\n}\n' "$ESCAPADO" > "$ALVO.tmp"
chmod 644 "$ALVO.tmp"
mv "$ALVO.tmp" "$ALVO"
echo "$0: $ALVO gerado (apiUrl=$API_URL)"
