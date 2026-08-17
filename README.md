# Agora News

PWA de notícias com TanStack Start/Nitro, ingestão de fontes, autenticação
persistente, Supabase e Web Push.

## Desenvolvimento

```bash
npm ci
npm run dev
```

## Verificação

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
callbacks OAuth e ordem segura de implantação/rotação.
