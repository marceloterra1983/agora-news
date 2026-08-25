# Gates: P1 da crítica rodada 2

Scope: 3 correções — card do feed totalmente tocável, chip de grupo sem
estouro de caixa, bio da conta depois do conteúdo na matéria.

- [x] G1: card reader tocável — link esticado no título, controles acima do overlay
  CHECK: grep -c "after:absolute after:inset-0" src/components/news/story-card.tsx
  EXPECT: 1
  EVIDENCE: 1

- [x] G2: chips 32px sem estouro — min-height + padding vertical 0
  CHECK: grep -c "padding: 0 12px" src/lib/news/phone-layout.css
  EXPECT: 1
  EVIDENCE: 1

- [x] G3: matéria — "Sobre @handle" depois do conteúdo, não antes
  CHECK: python3 -c "s=open('src/components/news/article-view.tsx').read(); import sys; sys.exit(0 if 0 < s.find('PostText') < s.find('Sobre @') else 1)" && echo ordem-ok
  EXPECT: ordem-ok
  EVIDENCE: ordem-ok

- [x] G4: suíte, typecheck, lint e build verdes
  CHECK: npm test && npm run typecheck && npm run lint && npm run build
  EXPECT: eslint
  EVIDENCE: ℹ Generated .output/nitro.json | [nitro] ✔ You can preview this build using npx vite preview

- [x] G5: comportamento no browser — clique no meio do card navega para /materia; chip mede 32px sem transbordo
  EVIDENCE: playwright @dev: elementFromPoint no meio do card → a[href=/materia/2092386565045747719]; botão salvar continua clicável por cima; chip h=32, padding-top 0, scrollHeight==clientHeight
