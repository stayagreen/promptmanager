import { translate } from "google-translate-ts";

const translationCache = new Map<string, string>();

export async function translateToChinese(text: string): Promise<string> {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();
  if (!normalizedText) {
    return "";
  }

  const cacheKey = `en:zh-CN:${normalizedText}`;
  const cached = translationCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const translatedText = await translateInChunks(normalizedText);
  translationCache.set(cacheKey, translatedText);
  return translatedText;
}

async function translateInChunks(text: string): Promise<string> {
  const chunks = chunkText(text, 4200);
  const translatedChunks = await Promise.all(
    chunks.map(async (chunk) => {
      const result = await translate({
        text: chunk,
        sourceLang: "en",
        targetLang: "zh-CN",
      });
      return result.translatedText;
    }),
  );

  return translatedChunks.join("\n\n");
}

function chunkText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  paragraphs.forEach((paragraph) => {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length <= maxLength) {
      current = next;
      return;
    }

    if (current) {
      chunks.push(current);
    }

    if (paragraph.length <= maxLength) {
      current = paragraph;
      return;
    }

    const hardChunks = paragraph.match(new RegExp(`.{1,${maxLength}}`, "gs")) ?? [];
    chunks.push(...hardChunks);
    current = "";
  });

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
