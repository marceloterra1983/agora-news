# Agora News

PWA de notícias com TanStack Start/Nitro, ingestão de fontes, autenticação
persistente, Supabase e Web Push.

## Desenvolvimento

```bash
npm ci
npm run dev
```

## Verificação

Smokes Playwright exigem NEWS_SMOKE_URL (CI usa :3180). Sem a variável, pulam.
Não apontar para :3080 sem NEWS_SMOKE_ALLOW_PROD=1.

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

O build não acessa bancos. `npm run db:migrate` aplica somente o schema do
Better Auth em `DATABASE_URL`; as tabelas Supabase são aplicadas manualmente
pelos scripts documentados no runbook.

Consulte [docs/production-runbook.md](docs/production-runbook.md) para variáveis,
autenticação email/senha com allowlist, implantação, rollback e backup
criptografado no Google Drive.
