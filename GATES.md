# Gates: Curadoria e Integração de Fontes do YouTube em Fontes

Scope: Expandir catálogo seed do YouTube com canais curados de alto sinal para IA, Tech e Brasil, implementar mergeYouTubeFontes com metadados editoriais e plugar na rota /fontes.

- [x] G1: youtube-catalog contém canais curados para ai, tech e brasil com IDs e grupos semânticos válidos
  CHECK: node --experimental-strip-types --test --test-name-pattern="seed catalog" scripts/youtube-fontes.test.mjs
  EXPECT: /pass 1/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 47.275754

- [x] G2: mergeYouTubeFontes devolve linhas no formato InfluenceRow com handle y_*, avatar, bio e siteUrl
  CHECK: node --experimental-strip-types --test --test-name-pattern="mergeYouTubeFontes" scripts/youtube-fontes.test.mjs
  EXPECT: /pass 1/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 55.391858

- [x] G3: fontes.tsx encadeia mergeYouTubeFontes e agrupa os canais respeitando a taxonomia
  CHECK: rg -n "mergeYouTubeFontes" src/routes/fontes.tsx
  EXPECT: mergeYouTubeFontes
  EVIDENCE: 14:import { mergeYouTubeFontes } from "@/lib/news/youtube-catalog.mjs"; | 94:  const withYt = useMemo(() => mergeYouTubeFontes(withRss, secao), [withRss, secao]);

- [x] G4: suite completa de testes, typecheck e lint passam 100% verdes sem regressões
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: /eslint \. --max-warnings=0/
  EVIDENCE: > lint | > eslint . --max-warnings=0
