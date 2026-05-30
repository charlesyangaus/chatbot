/** Split Markdown on `##` sections, then size-limit each section. */
export function chunkMarkdown(
  text: string,
  options: { maxChars?: number; overlap?: number } = {},
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const sections = normalized.split(/(?=^##\s)/m).map((s) => s.trim()).filter(Boolean);
  if (sections.length <= 1) {
    return chunkText(normalized, options);
  }

  return sections.flatMap((section) => chunkText(section, options));
}

export function chunkText(
  text: string,
  options: { maxChars?: number; overlap?: number } = {},
): string[] {
  const maxChars = options.maxChars ?? 800;
  const overlap = options.overlap ?? 100;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);

    if (paragraph.length <= maxChars) {
      current = paragraph;
      continue;
    }

    for (let i = 0; i < paragraph.length; i += maxChars - overlap) {
      chunks.push(paragraph.slice(i, i + maxChars));
    }
    current = "";
  }

  if (current) chunks.push(current);
  return chunks;
}