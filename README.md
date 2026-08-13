# Agora News

PWA de notícias de IA + sincronização AGORA_FEED (Google Sheets) + notificações push.

## Planilha canônica (app)

`17vT9DNCF5A3OHJv4ovaY6ErkYeOZZzFuxQ-2tlQv1l4`

## Estrutura

- `public/` — service worker e manifest PWA
- `src/` — registro do SW, push client, componente UI
- `api/` — exemplos de rotas subscribe/send (web-push + VAPID)
- `apps-script/` — consolidação horária + disparo de push
- `tests/` — testes automatizados (`node --test`)

## Integrar no frontend (App Builder / TanStack)

1. Copiar `public/*` para a pasta pública do app
2. Registrar SW no bootstrap
3. Usar `PushToggle` ou `enablePush()`
4. Publicar API routes a partir de `api/push-examples.ts`
5. Configurar env VAPID
6. Colar `apps-script/agora-feed-sync.gs` no Google Apps Script e rodar `setupTriggers`

## Testes

```bash
node --test tests/push-notifications.test.mjs
```
