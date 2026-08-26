# Gates: deploy cluster+RSS+rank

Scope: Produção em 127.0.0.1:3080 passa a servir main 8543226.

- [x] G1: Checkout em main no commit mergeado
  CHECK: git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD
  EXPECT: 8543226
  EVIDENCE: main | 8543226

- [x] G2: Suíte do repo verde antes do build
  CHECK: npm test
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 3820.830587

- [x] G3: Imagem versionada do HEAD existe
  CHECK: docker image inspect news-news:8543226 --format '{{.Id}} {{.RepoTags}}'
  EXPECT: news-news:8543226
  EVIDENCE: sha256:3f2a843c590a4589f3eab28932d9243e636383564c66e2072ee8b9c197d7f6b3 [news-news:8543226]

- [x] G4: Container healthy na tag nova
  CHECK: docker inspect news-news-1 --format '{{.Config.Image}} {{.State.Health.Status}}'
  EXPECT: news-news:8543226 healthy
  EVIDENCE: news-news:8543226 healthy

- [x] G5: Liveness HTTP 200
  CHECK: curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3080/api/health/live
  EXPECT: 200
  EVIDENCE: 200

- [x] G6: Health detalhado responde
  CHECK: curl -sS -o /tmp/news-health.json -w '%{http_code}' http://127.0.0.1:3080/api/health && python3 -c 'import json; d=json.load(open("/tmp/news-health.json")); print(d.get("ok"), list((d.get("sections") or d).keys()) if isinstance(d, dict) else d)'
  EXPECT: 200
  EVIDENCE: 200True ['ai', 'tech', 'brasil']
