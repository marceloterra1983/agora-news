# Produção: bundle Vite + Nitro node-server. Sem servidor de desenvolvimento. Sem .env na imagem.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
# Mesmo npm@11 do job check — o lockfile não fecha no npm 10 da imagem Node 22.
RUN npm install -g npm@11 && npm ci

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
  && npm install -g npm@11 \
  && chown node:node /app

USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build --chown=node:node /app/src/lib/pg-ssl.mjs ./src/lib/pg-ssl.mjs
COPY --from=build --chown=node:node /app/src/lib/supabase-ca-2021.mjs ./src/lib/supabase-ca-2021.mjs
COPY --from=build --chown=node:node /app/migrations ./migrations

# Nitro empacota o JS do PGLite mas não os sidecars wasm/data (ENOENT em runtime).
RUN cp node_modules/@electric-sql/pglite/dist/pglite.data \
       node_modules/@electric-sql/pglite/dist/pglite.wasm \
       node_modules/@electric-sql/pglite/dist/initdb.wasm \
       .output/server/_libs/

EXPOSE 3080
CMD ["node", ".output/server/index.mjs"]
