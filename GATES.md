# Gates: toggle Mostrar fotos

Scope: o botão "Mostrar fotos" em Configurações liga/desliga de fato
(`localStorage` + `html[data-images]` + mídia do feed some/volta).

- [x] G1: writeSettings({ showImages: false }) persiste e marca html data-images=off
  CHECK: node --experimental-strip-types --test scripts/show-images-settings.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 70.667973

- [x] G2: evento agora-settings com { fromRemote: true } não apaga showImages do estado
  CHECK: node --experimental-strip-types --test scripts/show-images-settings.test.mjs
  EXPECT: fromRemote
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 65.82501

- [x] G3: suíte do repo verde
  CHECK: npm test
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 7231.683173

- [x] G4: typecheck e lint dos arquivos TS do fix
  CHECK: npx tsc --noEmit && npx eslint src/lib/news/settings.ts src/lib/news/use-settings.ts src/lib/news/prefs-sync.ts scripts/show-images-settings.test.mjs --max-warnings=0 && echo lint-ok
  EXPECT: lint-ok
  EVIDENCE: lint-ok

- [x] G5: no browser, clicar Mostrar fotos esconde [data-media] no feed
  EVIDENCE: 8181 after fromRemote aria-checked=false (not null); click → on; feed data-images=off, 24/24 [data-media] display:none, 0 foto de matéria visível
