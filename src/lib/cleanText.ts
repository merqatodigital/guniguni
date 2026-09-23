/**
 * Strips raw markdown symbols and emojis from text so AI assistant output
 * looks clean, professional, and readable without asterisks, dashes, hashes, or emoji clutter.
 */
export function cleanAgentText(raw: string): string {
  if (!raw) return "";
  let text = String(raw);

  // 1. Remove all emojis and symbol pictographs
  try {
    text = text.replace(/\p{Extended_Pictographic}/gu, "");
  } catch {
    // Fallback regex for environments lacking full Unicode property escapes
    text = text.replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu,
      "",
    );
  }

  // 2. Strip markdown headers: "### Title" -> "Title"
  text = text.replace(/^#{1,6}\s*/gm, "");

  // 3. Strip bold & italics: "**word**" -> "word", "*word*" -> "word", "__word__" -> "word", "_word_" -> "word"
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/(^|\s)_([^_]+)_(\s|$)/g, "$1$2$3");

  // 4. Strip rogue bullet symbols at the start of lines: "- item" -> "item", "* item" -> "item", "• item" -> "item"
  text = text.replace(/^[\s]*[-*•+]\s+/gm, "");

  // 5. Strip code ticks: `code` -> code, ```lang ... ``` -> ...
  text = text.replace(/```[a-zA-Z0-9_-]*\n?/g, "");
  text = text.replace(/`/g, "");

  // 6. Strip blockquotes markers: "> quote" -> "quote"
  text = text.replace(/^>\s*/gm, "");

  // 7. Strip leftover stray asterisks or tildes
  text = text.replace(/~{2,}/g, "");
  text = text.replace(/\*{2,}/g, "");

  // 8. Clean up line-end spaces and collapse 3+ consecutive newlines to 2
  text = text.replace(/[ \t]+$/gm, "");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
