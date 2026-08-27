# Gates: fotos ao lado dos temas

Scope: O botão mostrar/ocultar fotos fica imediatamente à direita do seletor IA/Tech/Brasil.

- [x] G1: ImagesSwitch vem depois de data-section-switch e antes de OriginSwitch
  CHECK: node --experimental-strip-types --test scripts/show-images-settings.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 226.095797

- [x] G2: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 9169.873329
