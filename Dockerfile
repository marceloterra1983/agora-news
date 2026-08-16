# Produção: bundle Vite + Nitro node-server. Sem servidor de desenvolvimento. Sem .env na imagem.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations

# Só o bundle. db:migrate fica de fora — precisa DATABASE_URL do .env montado.
RUN npx vite build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3080 \
    NITRO_PORT=3080 \
    NITRO_HOST=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && chown node:node /app

USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=node:node /app/.output ./.output

EXPOSE 3080
CMD ["node", ".output/server/index.mjs"]
