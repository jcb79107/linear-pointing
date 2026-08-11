const FIGMA_PATH_PREFIXES = ["/design/", "/file/", "/proto/", "/board/"];

export function isFigmaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "figma.com" || url.hostname.endsWith(".figma.com")) &&
      FIGMA_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
    );
  } catch {
    return false;
  }
}

export function extractFigmaUrls(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches =
    text.match(
      /https:\/\/(?:[\w-]+\.)?figma\.com\/(?:design|file|proto|board)\/[^\s<>"']+/gi,
    ) ?? [];

  return Array.from(
    new Set(
      matches
        .map((match) => match.replace(/[),.;!?]+$/g, ""))
        .filter(isFigmaUrl),
    ),
  );
}

export function figmaEmbedUrl(value: string): string {
  return `https://www.figma.com/embed?embed_host=linear-pointing&url=${encodeURIComponent(value)}`;
}

export function figmaPreviewTitle(value: string): string {
  try {
    const url = new URL(value);
    const slug = url.pathname.split("/").filter(Boolean).at(2);
    if (!slug) return "Figma design";
    return decodeURIComponent(slug).replaceAll("-", " ");
  } catch {
    return "Figma design";
  }
}
