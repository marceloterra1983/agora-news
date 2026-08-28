# Gates: clique no texto do feed abre a mensagem em popup

Scope: No feed (reader), clicar no texto do post abre a mensagem completa num dialog; Escape e backdrop fecham.

- [x] G1: o título reader vira botão com testid e aria-haspopup=dialog
  CHECK: rg -n "feed-story-text|aria-haspopup=.dialog.|onOpenStory" src/components/news/story-card.tsx
  EXPECT: feed-story-text
  EVIDENCE: 161:              aria-haspopup="dialog" | 164:              onClick={() => onOpenStory(story)}

- [x] G2: o Feed monta FeedStoryPopup quando há story aberto
  CHECK: rg -n "FeedStoryPopup|onOpenStory|openStory" src/components/news/feed.tsx
  EXPECT: FeedStoryPopup
  EVIDENCE: 281:      {openStory ? ( | 282:        <FeedStoryPopup story={openStory} onClose={() => setOpenStoryId(null)} />

- [x] G3: o popup é dialog modal, fecha no Escape e mostra o corpo completo
  CHECK: rg -n "role=.dialog.|aria-modal|feed-story-popup|Escape|ArticleView" src/components/news/feed-story-popup.tsx
  EXPECT: feed-story-popup
  EVIDENCE: 76:        data-testid="feed-story-popup" | 93:          <ArticleView story={story} embedded />

- [x] G4: teste de contrato do popup
  CHECK: node --experimental-strip-types --test scripts/feed-story-popup.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 49.893689

- [x] G5: suite do repo
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 6147.461037

- [x] G6: typecheck e lint
  CHECK: npm run typecheck && npm run lint && echo TYPECHECK_LINT_OK
  EXPECT: TYPECHECK_LINT_OK
  EVIDENCE: > eslint . --max-warnings=0 | TYPECHECK_LINT_OK

- [x] G7: no browser, clicar o texto abre o dialog com o corpo e Escape fecha
  EVIDENCE: 127.0.0.1:8083/?secao=ai fchollet card 171 chars ("absorvendo cada vez mais o…") → popup body 226 chars ("universo computacional… infinito por construção"); Escape removeu [data-testid=feed-story-popup]; NEWS_SMOKE_URL=http://127.0.0.1:8083 feed-story-popup.test.mjs 2/2 fail 0
