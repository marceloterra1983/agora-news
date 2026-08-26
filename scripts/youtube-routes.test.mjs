import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const videosRoute = readFileSync(join(root, "src/routes/videos.tsx"), "utf8");
const videoDetailRoute = readFileSync(
  join(root, "src/routes/videos.$id.tsx"),
  "utf8",
);

test("videos route exports Route", () => {
  assert.match(videosRoute, /export const Route = createFileRoute/);
  assert.match(videosRoute, /createFileRoute\("\/videos"\)/);
});

test("videos route has empty state copy", () => {
  assert.match(videosRoute, /Nenhum vídeo ainda\./);
});

test("videos route has channel filter", () => {
  assert.match(videosRoute, /canal/i);
  assert.match(videosRoute, /Todos/);
});

test("video detail route exports Route", () => {
  assert.match(videoDetailRoute, /export const Route = createFileRoute/);
  assert.match(videoDetailRoute, /createFileRoute\("\/videos\/\$id"\)/);
});

test("video detail route has Ao Vivo badge pattern", () => {
  // Badge é renderizado pelo VideoDetail component
  const videoDetailComponent = readFileSync(
    join(root, "src/components/news/video-detail.tsx"),
    "utf8",
  );
  assert.match(videoDetailComponent, /Ao Vivo/);
});

test("VideoCard component has thumbnail and channel name", () => {
  const videoCard = readFileSync(
    join(root, "src/components/news/video-card.tsx"),
    "utf8",
  );
  assert.match(videoCard, /thumbnail_url/);
  assert.match(videoCard, /channel\?\.name/);
  assert.match(videoCard, /relativeTime/);
});

test("VideoDetail component has YouTube CTA", () => {
  const videoDetail = readFileSync(
    join(root, "src/components/news/video-detail.tsx"),
    "utf8",
  );
  assert.match(videoDetail, /Assistir no YouTube/);
  assert.match(videoDetail, /watch_url/);
});
