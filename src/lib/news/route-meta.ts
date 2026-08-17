export function routeMeta(title: string, description: string) {
  const fullTitle = title === "Agora" ? title : `${title} — Agora`;
  return [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
  ];
}
