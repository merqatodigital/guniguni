import { uid } from "@/lib/format";
import type { KnowledgeFile } from "@/data/site";

/**
 * Bulk knowledge template for the AI agent.
 *
 * Two entry styles, both paste-friendly for AI-generated content:
 *   1. Q&A block   — a question guests ask + the exact answer
 *   2. TOPIC block — free-form paragraphs about one subject
 *
 * The downloadable .md file carries its instructions inside HTML comments
 * (stripped on import) plus one worked example of each style that the admin
 * replaces. Uploading a filled template splits it into separate knowledge
 * entries. The same parser powers the "paste bulk text" box.
 */

export const TEMPLATE_FILENAME = "guni-guni-knowledge-template.md";
export const EXAMPLE_FILENAME = "guni-guni-knowledge-example.md";
const MAX_CHARS = 60_000;

export function buildTemplateMd(): string {
  return `<!--
====================================================================
GUNI GUNI BISTRO — AI KNOWLEDGE BULK TEMPLATE
====================================================================
HOW TO USE (this comment block is ignored on upload):
1. Download this file, or copy it into any AI chat (ChatGPT, Claude,
   Gemini) and ask it to fill it in for you.
2. TWO block styles — use as many as you like, in any order:
   • TOPIC block  = paragraphs about ONE subject
                    (happy hour, parking, large groups, history...)
   • Q&A block    = one guest question + the exact answer.
                    Put several Q/A pairs in one block if you like.
3. Separate every block with a line containing only:  ---
4. Delete the two EXAMPLE blocks (or leave them — they are skipped
   automatically because they say EXAMPLE).
5. Upload the filled file with "Upload knowledge files".
   Everything here is PUBLIC — guests will read it. Never add
   costs, wages, passwords or private data.
====================================================================
-->

---
## TOPIC: EXAMPLE — Happy Hour (delete me or leave me, I am skipped)
Happy Hour runs daily from 4:00 PM to 7:00 PM at the bistro bar.
Guests ask about it every afternoon, so keep this short and clear.

---
## Q&A (EXAMPLE — delete me or leave me, I am skipped)
Q: Do you have vegetarian pasta?
A: Yes. Try the Spicy Marinara at ₱320 or the Truffle Cream at ₱390. Both carry the green leaf mark on the menu.

Q: What time is happy hour?
A: Daily from 4:00 PM to 7:00 PM.

---
## TOPIC: YOUR SUBJECT HERE
Paste or type paragraphs about ONE subject here.
Keep facts exact: times, prices in pesos, addresses, phone numbers.
Add another --- block below for the next subject.

---
## Q&A
Q: PASTE OR TYPE THE FIRST QUESTION HERE
A: PASTE OR TYPE THE EXACT ANSWER HERE

Q: PASTE OR TYPE THE NEXT QUESTION HERE
A: PASTE OR TYPE THE EXACT ANSWER HERE
`;
}

export function buildExampleMd(): string {
  return `<!--
GUNI GUNI BISTRO — worked example. Upload this file as-is to see
how one file becomes several knowledge entries, then delete it.
-->

---
## TOPIC: Happy Hour
Happy Hour runs daily from 4:00 PM to 7:00 PM at the GUNI GUNI Bistro bar in Puerto Princesa.
It covers selected cocktails, local beers and house wine by the glass. Ask the server for the daily list, because bottles and promos change.

---
## TOPIC: Getting Here and Parking
We are at 263 Manalo Extension, Barangay Milagrosa, Puerto Princesa City, Palawan 5300.
Tricycles stop right outside. Parking for cars is limited in the evening, so coming a little early helps for big groups.

---
## Q&A
Q: Do you have vegetarian pasta?
A: Yes. Try the Spicy Marinara at ₱320 or the Truffle Cream at ₱390. Both carry the green leaf mark on the menu.

Q: Can we pay by card?
A: We take cash and cards at the counter. Orders are placed from your table on the website, then you settle the bill with the server.

Q: Do you allow big groups or parties?
A: Yes, big groups are welcome. Message or call +63 917 771 3992 in advance so the team can set tables together.
`;
}

/** Prompt the admin can copy into any AI chat to get a filled template back. */
export function buildAiPrompt(): string {
  return `I run GUNI GUNI Bistro in Puerto Princesa, Palawan (bistro open 7:00 AM to 10:00 PM, happy hour 4:00 PM to 7:00 PM, phone +63 917 771 3992, address 263 Manalo Extension, Barangay Milagrosa).

Fill in the knowledge template below for my website AI host. Write warm, funny, plain-text answers with NO markdown symbols (no asterisks, no dashes at line starts) and NO emojis. Prices in Philippine pesos must match the ones I give you.

RULES:
- Keep every TOPIC block about ONE subject, 2 to 6 short paragraphs.
- Keep every Q block to one real guest question and every A block to the exact short answer.
- Cover: opening hours, happy hour, location and parking, table ordering and payment, vegetarian options, large groups and parties, kids and family policy, WiFi, takeaway.

TEMPLATE TO FILL:
---
## TOPIC: <subject>
<paragraphs>
---
## Q&A
Q: <question>
A: <answer>

(Repeat blocks as needed. Separate every block with a line containing only ---.)`;
}

/* ------------------------------- parsing -------------------------------- */

export interface ParsedEntry {
  kind: "qa" | "topic";
  title: string;
  text: string;
}

const PLACEHOLDER_RE =
  /PASTE OR TYPE|YOUR SUBJECT HERE|YOUR TITLE HERE|PASTE PARAGRAPHS HERE|TYPE PARAGRAPHS|^\s*Content:\s*$/i;

function isExample(text: string): boolean {
  return /EXAMPLE\s*(—|-)?\s*(delete me|leave me)?/i.test(text);
}

function stripComments(src: string): string {
  return src.replace(/<!--[\s\S]*?-->/g, "");
}

function splitBlocks(src: string): string[] {
  const clean = stripComments(src).replace(/\r\n?/g, "\n");
  return clean
    .split(/^\s*---+\s*$/m)
    .map((b) => b.replace(/[ \t]+$/gm, "").trim())
    .filter((b) => b.length > 0);
}

function parseQaBlock(block: string): ParsedEntry[] {
  // The worked example inside the blank template is skipped automatically.
  if (isExample(block)) return [];
  const out: ParsedEntry[] = [];
  const re = /(?:^|\n)\s*(?:Q|Question)\s*:\s*(.+?)\n\s*(?:A|Answer)\s*:\s*([\s\S]+?)(?=\n\s*(?:Q|Question)\s*:|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const q = m[1].replace(/\s+/g, " ").trim();
    const a = m[2].trim();
    if (!q || !a) continue;
    if (PLACEHOLDER_RE.test(q) || PLACEHOLDER_RE.test(a)) continue;
    const text = `Q: ${q}\nA: ${a}`;
    out.push({ kind: "qa", title: q.length > 60 ? q.slice(0, 57) + "…" : q, text });
  }
  return out;
}

function parseTopicBlock(block: string): ParsedEntry | null {
  const head = block.match(/^\s*#{1,3}\s*(?:TOPIC|SUBJECT|TITLE)\s*:\s*(.+?)\s*$/im);
  if (!head) return null;
  const title = head[1].trim();
  if (!title || PLACEHOLDER_RE.test(title)) return null;
  let body = block.slice(head[0].length).trim().replace(/^\s*Content\s*:\s*/i, "");
  if (!body || PLACEHOLDER_RE.test(body) || body.length < 10) return null;
  if (isExample(block)) return null;
  return { kind: "topic", title: title.length > 70 ? title.slice(0, 67) + "…" : title, text: `${title}\n\n${body}` };
}

function parsePlainBlock(block: string): ParsedEntry | null {
  // A block with real paragraphs but no markers — treat as a topic.
  if (/^(?:Q|Question)\s*:/im.test(block)) return null;
  if (/^#{1,3}\s*(?:TOPIC|SUBJECT|TITLE)\s*:/im.test(block)) return null;
  if (/^#\s+GUNI GUNI/i.test(block)) return null; // template title header
  if (/^>/.test(block.trim())) return null; // blockquote instructions
  if (isExample(block)) return null;
  const text = block.trim();
  if (text.length < 30) return null;
  if (PLACEHOLDER_RE.test(text)) return null;
  const firstLine = text.split("\n")[0].trim();
  const title = firstLine.length > 70 ? firstLine.slice(0, 67) + "…" : firstLine;
  return { kind: "topic", title, text };
}

/** Split pasted / uploaded bulk text into knowledge entries. Never throws. */
export function parseBulkKnowledge(src: string): ParsedEntry[] {
  const out: ParsedEntry[] = [];
  for (const block of splitBlocks(src)) {
    const qas = parseQaBlock(block);
    if (qas.length) {
      out.push(...qas);
      continue;
    }
    const topic = parseTopicBlock(block);
    if (topic) {
      out.push(topic);
      continue;
    }
    const plain = parsePlainBlock(block);
    if (plain) out.push(plain);
  }
  return out;
}

export function looksLikeTemplate(src: string): boolean {
  return /##\s*(TOPIC|Q&A)/i.test(src) || /(?:^|\n)\s*(?:Q|Question)\s*:/i.test(src);
}

export function toKnowledgeFiles(entries: ParsedEntry[], sourceName: string): KnowledgeFile[] {
  const now = new Date().toISOString();
  return entries.map((e, i) => {
    const text = e.text.slice(0, MAX_CHARS);
    const base = e.kind === "qa" ? `Q&A — ${e.title}` : e.title;
    return {
      id: uid("kb_"),
      name: `${base} (from ${sourceName}${entries.length > 1 ? ` ${i + 1}/${entries.length}` : ""})`.slice(0, 120),
      size: new Blob([text]).size,
      text,
      addedAt: now,
    };
  });
}
