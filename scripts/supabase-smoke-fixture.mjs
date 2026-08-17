import { createServer } from "node:http";

const port = 3901;
const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const path = url.pathname;
  const known =
    request.method === "GET" &&
    (path === "/health" ||
      path === "/rest/v1/posts" ||
      path === "/rest/v1/x_profiles");
  response.writeHead(known ? 200 : 404, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  if (path === "/health" && known) {
    response.end('{"ok":true}');
    return;
  }
  if (
    path === "/rest/v1/posts" &&
    url.searchParams.get("select")?.includes("summary_pt")
  ) {
    const category = url.searchParams.get("category")?.replace(/^eq\./, "") || "ai";
    response.end(
      JSON.stringify([
        {
          post_id: `smoke-story-${category}`,
          account: "openai",
          posted_at: new Date().toISOString(),
          posted_at_sp: null,
          content: "Smoke do artefato",
          translation_pt: "Notícia de teste do artefato",
          summary_pt: "Notícia de teste do artefato",
          post_url: `https://x.com/openai/status/smoke-story-${category}`,
          media_label: null,
          image_url: null,
          category,
          batch_name: "ci-smoke",
        },
      ]),
    );
    return;
  }
  response.end("[]");
});

server.listen(port, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
