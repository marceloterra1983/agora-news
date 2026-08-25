# Gates: correções P0+P1 da crítica de UX

Scope: 6 correções aprovadas — header de Fontes a 390px, Salvos sem filtro de
seção, salvar no feed com confirmação, foco do seletor de seção, dock de
grupos movido para o header, modal de perfil com fechar + focus trap.

- [x] G1: Fontes a 390px — toolbar e menu sem sobreposição; "Mover em lote" alcançável
  EVIDENCE: playwright @390px (vite dev): select "Ordenar fontes" 107×44 right=269, chip lote right=317, menu 334–378; h-scroll scrollWidth==clientWidth (sem corte); screenshot new-fontes-390.png

- [x] G2: Salvos lista salvos de todas as seções
  CHECK: node --experimental-strip-types --test scripts/salvos-all-sections.test.mjs
  EXPECT: fail 0

- [x] G3: variant reader tem botão salvar com aria-pressed e estado salvo visível
  CHECK: grep -c "aria-pressed" src/components/news/story-card.tsx
  EXPECT: 2

- [x] G4: seletor de seção focável — sem select sr-only, pílulas sem aria-hidden
  CHECK: grep -c 'data-section-select\|aria-hidden="true"' src/components/news/app-chrome.tsx
  EXPECT: 0

- [x] G5: dock de grupos fora do fluxo fixo — chips no header, sem --agora-groups no padding
  CHECK: grep -c 'data-chrome="groups"' src/components/news/app-chrome.tsx
  EXPECT: 0

- [x] G6: modal de perfil com botão fechar dentro do dialog e focus trap
  CHECK: grep -c 'trapTab\|data-testid="profile-close"' src/components/news/feed-profile-popup.tsx
  EXPECT: 3

- [x] G7: suíte, typecheck, lint e build verdes
  CHECK: npm test && npm run typecheck && npm run lint && npm run build
  EXPECT: eslint

- [x] G8: smoke visual a 390px das telas alteradas (feed, fontes, salvos, modal)
  EVIDENCE: playwright @390px (vite dev 8082): feed com 6 chips no header (0 artigos sobrepostos, pb main 44px), salvar no card alterna aria-pressed e persiste savedIds, Salvos em ?secao=ai lista grupos IA e Tech, modal com fechar interno 44px e Tab preso no dialog (defaultPrevented=true, volta ao primeiro focável)
