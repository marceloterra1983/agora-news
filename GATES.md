# Gates: toggle de fotos no feed

Scope: Botão mostra/oculta fotos no header da tela principal; mídia some ou volta na hora.

- [x] G1: header do chrome tem ImagesSwitch com data-images-switch
  CHECK: node --experimental-strip-types --test scripts/show-images-settings.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 106.758633

- [x] G2: writeSettings({ showImages: false }) marca html data-images=off
  CHECK: node --experimental-strip-types --test scripts/show-images-settings.test.mjs
  EXPECT: data-images=off
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 155.33564

- [x] G3: CSS esconde [data-media] quando html[data-images=off]
  CHECK: grep -n 'data-images="off"' src/styles.css
  EXPECT: [data-media]
  EVIDENCE: 180:  html[data-images="off"] [data-media] {

- [x] G4: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 17765.27147

- [x] G5: typecheck limpo
  CHECK: npm run typecheck && echo TYPECHECK_OK
  EXPECT: TYPECHECK_OK
  EVIDENCE: > tsc --noEmit | TYPECHECK_OK
