# BUG-2026-08-27T200800: RSS Latin-1 vira � no feed

## Problem

Cards de UOL/Folha mostram losango `�` no lugar de á, õ, í, ç, ã. Exemplo (UOL Economia, 2026-08-27): "Conselho Monet�rio Nacional", "R$ 3 bilh�es", "munic�pios".

O esperado: o texto do feed chega em português com acentos intactos.

Reprodução: abrir o feed Brasil/Economia após ingestão de `https://rss.uol.com.br/feed/economia.xml`.

Security impact: NONE. Sem caminho de exploit. Encoding, não auth.

## Root Cause Analysis

O Fetch `response.text()` sempre decodifica o corpo como UTF-8 (WHATWG). Vários feeds brasileiros são ISO-8859-1:

- UOL: `Content-Type: text/xml;charset=ISO-8859-1` (bytes inválidos em UTF-8; 0xDA = Ú).
- Folha `rss091.xml`: `<?xml encoding="ISO-8859-1"?>` e `Content-Type: text/xml` sem charset.

O ingest e o resolve leem com `res.text()`, o decoder substitui cada byte alto por U+FFFD, e o upsert grava isso em `content` / `translation_pt` / `summary_pt`. IDs já conhecidos não entram de novo, então o card fica envenenado.

Hipóteses:

1. `res.text()` UTF-8 vs Latin-1 — **confirmada**. Feed ao vivo + `res.text()` reproduz o recorte da UI byte a byte. Latin-1/CP1252 devolve "bilhões" / "Monetário".
2. Pipeline de tradução — **falsa**. UOL/Folha já vêm em PT; a corrupção existe no XML mal decodificado, antes do tradutor.
3. Entidades HTML sem decode (`&aacute;`) — **falsa neste recorte**. O feed UOL não usa entidades; são bytes Latin-1 crus.

Produção (2026-08-27 20:07 BRT): 189 posts RSS com U+FFFD (188 em `content`). Contas: Folha agora (81), UOL (33), Folha Mercado (25), Folha Poder (17), UOL Economia (11), Folha Ciência (11), Folha Ilustrada (11).

Risk level: Medium (feed Brasil ilegível; sem risco de segurança).

## Diagnose

### Reproduce

```
curl -sI https://rss.uol.com.br/feed/economia.xml  # charset=ISO-8859-1
# bytes 0xDA etc. falham em UTF-8; TextDecoder UTF-8 → U+FFFD
```

SQL: `content like '%'||chr(65533)||'%'` em posts `source=rss`.

### Isolate

Decode do corpo HTTP no ingest/resolve RSS. Parser XML e UI só repetem o string já quebrado.

### Hypothesize

1. UTF-8 forçado em feed Latin-1 — confirmada.
2. Tradutor — falsa.
3. Entidades HTML — falsa no sample UOL/Folha.

### Verify

Feed UOL economia 200, `charset=ISO-8859-1`, UTF-8 fatal falha na posição 105. O `<description>` do item CMN após UTF-8 replace é o texto do card. Decode `windows-1252` restaura "bilhões", "empréstimos", "municípios".

## TDD Fix Plan

1. **RED**: `decodeRssBody` em bytes ISO-8859-1 (header e `<?xml encoding?>`) devolve "bilhões" sem U+FFFD; UTF-8 válido permanece UTF-8.
   **GREEN**: decoder único usado pelo ingest e pelo resolve (`arrayBuffer` + charset).
   **verify**: `node --experimental-strip-types --test scripts/rss-encoding.test.mjs`

2. **RED**: item já persistido com `�` é reescrito quando o feed ainda o contém.
   **GREEN**: skip de IDs conhecidos não se aplica a posts com U+FFFD; upsert merge atualiza o texto.
   **verify**: `node --experimental-strip-types --test scripts/rss-encoding.test.mjs scripts/rss-ingest.behavior.test.mjs`

**REFACTOR**: nenhuma camada nova; decode vive ao lado do parse RSS.

## Acceptance Criteria

- [ ] Bytes Latin-1 de UOL/Folha viram PT com acento, não `�`
- [ ] Feed UTF-8 (g1 etc.) não sofre mojibake
- [ ] Ingest regrava post RSS ainda no feed se o persistido tem U+FFFD
- [ ] `npm test` passa
- [ ] typecheck e lint passam

## Resolution

Corrigido em `fix/rss-latin1-encoding`. `decodeRssBody` lê `arrayBuffer` e usa UTF-8 fatal ou Windows-1252 (header/`<?xml encoding?>`). Ingest regrava IDs ainda no feed se `content`/`translation_pt`/`summary_pt` tiverem U+FFFD. Live: UOL economia 15 itens, Folha agora 100, g1 100 — 0 FFFD após decode.
