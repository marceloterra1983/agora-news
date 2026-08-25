# Plan Audit — cluster + RSS + ranking

**Date:** 2026-08-25 · **Verdict:** NOT READY → READY após patches no plano  
**Plan:** `docs/superpowers/plans/2026-08-25-cluster-rss-rank.md`  
**Skills:** `audit-plan`, `assess-impact`, `grill-with-docs`, `writing-plans` (self-review), `plan-tests` (lite), `validate-contracts` (key-set), `find-skills`

Não instalei `b-mendoza/agent-skills@validate-implementation-plan` (1,7k installs, **1 star**). Checklist local + evidência no repo.

## Principles Alignment

| Check | Status | Note |
|---|---|---|
| Vertical slices | ✅ | 3 fases shippable; Task 1→3 / 4→6 / 7 |
| Scope bounded | ✅ | in + out of scope explícitos; defaults aprovados |
| Success criteria | ⚠️ | Gates de repo na Task 8; falta Gherkin/ID `SC-e05s*` |
| HARD GATEs | ✅ | Zero schema, zero dep, `avatarInFilter` não alarga |
| Domain language | ⚠️ | `Story.source` (handle) vs coluna DB `source` (`rss`/`x`) — colisão de nome |

## Conventions Completeness

| Check | Status | Note |
|---|---|---|
| AGENTS.md | ✅ | test/typecheck/lint/build; Ask first dep/migration |
| specs/ layout | ✅ | epics e04; este plano vive em `docs/superpowers/plans/` (padrão da casa) |
| Conventional Commits | ✅ | mensagens no plano |
| solo vs team | ✅ | solo-git + auto-land na feature branch |
| Epic capsule e05 | ❌ | `plan-work` / `slice-tasks` não rodados — aceitável neste repo |

## Pre-flight Answers

| Command | Value |
|---|---|
| test | `npm test` |
| typecheck | `npm run typecheck` |
| lint | `npm run lint` |
| build | `npm run build` |
| CI | Playwright smokes + `NEWS_SMOKE_URL` |
| Language | TypeScript + TanStack Start |
| Codebase | existing |

## Grill-with-docs (fatos, não opinião)

| Assunção do plano | Docs / runtime | Resultado |
|---|---|---|
| RSS 2.0 item tem title/link/guid/pubDate | [RSS 2.0](https://www.rssboard.org/rss-specification): **todos os filhos de item são opcionais**; precisa title **ou** description; guid `isPermaLink` default **true** | ✗ plano “ignora sem link e sem guid” está ok; **não** exigir os quatro |
| Atom = `<entry>` | The Verge responde Atom (`<feed xmlns=…>`), 10 entries | ✓ parser Atom é obrigatório, não opcional |
| Seed OpenAI `/blog/rss.xml` | Redirect 200 → `https://openai.com/news/rss.xml`, **1144 items / 695 KB** | ✗ URL canônica + `MAX_RSS_ITEMS` obrigatório |
| Seed G1 tech | 200, **0 `<item>`**, 728 B | ✗ feed morto; trocar antes do commit |
| Seed demais | HF 847 items; Ars 20; TecMundo 40 + `content:encoded` HTML | ⚠️ cap + **não** traduzir `content:encoded` |
| `avatarInFilter` 1–15 `[A-Za-z0-9_]` | `profile-store-core.mjs:66` | ✓ `r_`+12 hex = 14 |
| `sourceLabel` = “The Verge” | `dbPostToStory` sempre faz `` `@${account}` `` | ✗ Task 5 **omite** `supabase.ts` |
| grupo `"sites"` | `catalogFor` só emite grupos em `groupOrderFor` ou `customGroups`. `"sites"` não existe | ✗ some do chrome; usar `imprensa` / `tech-imprensa` / `br-jornais` |
| `user_prefs.rssFeeds` sobrevive | `snapshotPrefs()` não tem o campo; `mergePrefsPreservingLlm` só preserva `_llm` | ✗ próximo `pushCloudPrefs` **apaga** os feeds |
| Client catalog vê RSS | `useSectionCatalog` = seed X + `extra-fontes` only | ✗ grupo ≠ `all` esconde RSS (cai em `novos` ou some) |
| Health se X cair | `/api/health` = last `posted_at` da seção, qualquer `source` | ✓ RSS nas 3 seções segura o 200 |
| Overfetch 80 | `agora-now` trava `PAGE_SIZE === 40` compartilhado | ⚠️ exportar `FEED_CLUSTER_FETCH` sem quebrar o assert de 40 |

## writing-plans self-review

| Check | Status |
|---|---|
| Spec coverage (3 fases) | ✅ cada fase tem tasks |
| Placeholders (`/* strip */`) | ⚠️ estilo da casa (unread plan); aceitável se Task 1 testes forem o contrato |
| Type consistency | ✗ file map `rankClusters` vs Task 7 `rankStories`; `StoryCluster` vs interseção no `Story` |
| File map completo | ✗ faltam `supabase.ts`, `prefs-server.ts`, `prefs-sync.ts`, `prefs-merge.ts`, `dbPostToStory` |

## plan-tests (lite) — cenários P0

| ID | Nível | Risco | Cenário |
|---|---|---|---|
| SC-e05s01-P0-01 | Unit | P0 | Cluster não junta seções; id estável com membro novo |
| SC-e05s02-P0-01 | Unit | P0 | Post fora do catálogo não vira `alsoFrom` |
| SC-e05s05-P0-01 | Behavior | P0 | `r_*` nunca chama fxtwitter |
| SC-e05s05-P0-02 | Behavior | P0 | X throw + RSS write ≠ `ingest_failed` |
| SC-e05s05-P0-03 | Behavior | P0 | 304 sem upsert |
| SC-e05s06-P0-01 | Unit | P0 | `snapshotPrefs` inclui `rssFeeds`; sync não apaga |
| SC-e05s02-P1-01 | Unit | P1 | `hasMore` após overfetch / re-cluster no older |
| SC-e05s04-P1-01 | Unit | P1 | Atom Verge-like + RSS2 + lixo → `[]` |
| SC-e05s07-P2-01 | Unit | P2 | três `ordem` estáveis |

Não mockar ingest/auth/push (AGENTS.md). Parser: fixtures em disco, sem rede.

## Open Gaps (fechar no plano)

- [x] Corrigir seed (OpenAI canônico; G1 morto)
- [x] `MAX_RSS_ITEMS` + não GTX em `content:encoded`
- [x] Grupo taxonômico existente, não `"sites"`
- [x] `dbPostToStory` + `useSectionCatalog` + CloudPrefs/`snapshotPrefs`
- [x] Unificar nome `rankStories`
- [ ] (opcional) epic `e05` + IDs Gherkin — só se for rodar `plan-work`

## Verdict

**READY para implementar** depois dos patches aplicados neste turno no arquivo do plano.  
Não READY se alguém implementar o rascunho de 01:26 sem o addendum de revisão.

Next: `kickoff-branch` → Task 1 (`develop-tdd` / `executing-plans`). Não `grill-me` interativo: decisões de produto já travadas; o que restava era fato de código/docs.
