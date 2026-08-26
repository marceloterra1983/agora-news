# Gates: tighten motion per emil review

Scope: apagar zoom da foto em Salvos, press de IconBtn a 160ms/0.97 com hover de cor gated, reduced-motion sem zerar cor/opacity.

- [x] G1: grep no produto sem group-hover:scale na story-card
  CHECK: if grep -F "group-hover:scale" src/components/news/story-card.tsx; then echo G1_FAIL; else echo G1_OK no group-hover:scale; fi
  EXPECT: G1_OK
  EVIDENCE: G1_OK no group-hover:scale

- [x] G2: IconBtn tem transition de transform 160ms + scale 0.97; hover de cor gated
  CHECK: node --input-type=module -e "import { readFileSync } from 'node:fs'; const icon=readFileSync('src/components/news/icon-btn.tsx','utf8'); const css=readFileSync('src/styles.css','utf8'); const src=icon+css; const hasScale=/scale\\(0\\.97\\)|active:scale-\\[0\\.97\\]/.test(src); const hasDur=/160ms/.test(src); const hasEase=/cubic-bezier\\(0\\.23,\\s*1,\\s*0\\.32,\\s*1\\)/.test(src); const hasHoverGate=/hover:\\s*hover/.test(src)&&/pointer:\\s*fine/.test(src); const noOld=!icon.includes('active:scale-[0.96]'); console.log(hasScale&&hasDur&&hasEase&&hasHoverGate&&noOld?'G2_OK':JSON.stringify({hasScale,hasDur,hasEase,hasHoverGate,noOld}));"
  EXPECT: G2_OK
  EVIDENCE: G2_OK

- [x] G3: reduced-motion não zera transition de cor/opacity
  CHECK: node --input-type=module -e "import { readFileSync } from 'node:fs'; const s=readFileSync('src/styles.css','utf8'); const ticker=s.indexOf('.ticker-track'); const head=s.slice(0, ticker<0?s.length:ticker); const i1=head.indexOf('html[data-motion=\"reduce\"]'); const i2=head.indexOf('@media (prefers-reduced-motion: reduce)'); function ok(b){ return !/transition-duration:\\s*0\\.01ms/.test(b) && /transition-property:[\\s\\S]*color/.test(b) && /transition-property:[\\s\\S]*opacity/.test(b); } const pass=i1>=0&&i2>=0&&ok(head.slice(i1,i2))&&ok(head.slice(i2)); console.log(pass?'G3_OK keeps color/opacity; no duration nuke':'G3_FAIL');"
  EXPECT: G3_OK
  EVIDENCE: G3_OK keeps color/opacity; no duration nuke

- [x] G4: npm test fail 0
  CHECK: npm test
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 4935.630966

- [x] G5: typecheck + eslint dos arquivos tocados
  CHECK: npm run typecheck && npx eslint src/components/news/story-card.tsx src/components/news/icon-btn.tsx --max-warnings=0 && echo G5_OK
  EXPECT: G5_OK
  EVIDENCE: > tsc --noEmit | G5_OK

- [x] G6: browser em Vite local — press no ícone ~160ms; Salvos sem zoom na foto; Menos movimento ainda permite hover de cor
  EVIDENCE: Vite :8182 /instalar — transition `transform 0.16s cubic-bezier(0.23, 1, 0.32, 1)`; :active `matrix(0.97, 0, 0, 0.97)`. /salvos `[data-media]` hover `transform:none`, sem group-hover:scale. `data-motion=reduce` hover bg `rgb(231, 225, 211)` (#e7e1d3); transition-property cor/opacity (sem transform); duration 0.16s.
