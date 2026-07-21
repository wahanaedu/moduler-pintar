import React from "react";

type Block =
  | { kind: "ol"; items: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "p"; text: string };

const OL_RE = /^\s*(\d+)[.)]\s+(.*)$/;
const UL_RE = /^\s*[-*•·]\s+(.*)$/;

// Inline patterns: catch enumerations that arrive on a single line, e.g.
// "1. Foo 2. Bar 3. Baz" or "- Foo - Bar - Baz"
const INLINE_OL_RE = /(?:^|\s)(\d+)[.)]\s+/g;
const INLINE_UL_RE = /(?:^|\s)[-*•·]\s+/g;

function splitInline(line: string): string[] | null {
  // ordered: needs at least "1." and "2." present
  const olMatches = [...line.matchAll(INLINE_OL_RE)];
  if (olMatches.length >= 2) {
    const parts: string[] = [];
    for (let i = 0; i < olMatches.length; i++) {
      const start = olMatches[i].index! + olMatches[i][0].length;
      const end = i + 1 < olMatches.length ? olMatches[i + 1].index! : line.length;
      parts.push(`${olMatches[i][1]}. ${line.slice(start, end).trim()}`);
    }
    return parts;
  }
  const ulMatches = [...line.matchAll(INLINE_UL_RE)];
  if (ulMatches.length >= 2) {
    const parts: string[] = [];
    for (let i = 0; i < ulMatches.length; i++) {
      const start = ulMatches[i].index! + ulMatches[i][0].length;
      const end = i + 1 < ulMatches.length ? ulMatches[i + 1].index! : line.length;
      parts.push(`- ${line.slice(start, end).trim()}`);
    }
    return parts;
  }
  return null;
}

export function parseRichText(input: string | undefined | null): Block[] {
  if (!input) return [];
  const rawLines = String(input).replace(/\r\n/g, "\n").split("\n");
  // Expand inline enumerations into separate lines so they render as list items.
  const lines: string[] = [];
  for (const l of rawLines) {
    const split = splitInline(l);
    if (split) lines.push(...split);
    else lines.push(l);
  }
  const blocks: Block[] = [];
  let buf: string[] = [];
  const flushPara = () => {
    if (buf.length) {
      blocks.push({ kind: "p", text: buf.join(" ").trim() });
      buf = [];
    }
  };
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) { flushPara(); i++; continue; }
    const ol = line.match(OL_RE);
    const ul = line.match(UL_RE);
    if (ol) {
      flushPara();
      const items: string[] = [ol[2].trim()];
      i++;
      while (i < lines.length) {
        const m = lines[i].trim().match(OL_RE);
        if (!m) break;
        items.push(m[2].trim());
        i++;
      }
      blocks.push({ kind: "ol", items });
    } else if (ul) {
      flushPara();
      const items: string[] = [ul[1].trim()];
      i++;
      while (i < lines.length) {
        const m = lines[i].trim().match(UL_RE);
        if (!m) break;
        items.push(m[1].trim());
        i++;
      }
      blocks.push({ kind: "ul", items });
    } else {
      buf.push(line);
      i++;
    }
  }
  flushPara();
  return blocks;
}

export function RichText({ text, startNumber }: { text: string | undefined | null; startNumber?: number }) {
  const blocks = parseRichText(text);
  if (blocks.length === 0) return null;
  let counter = startNumber ?? 1;
  return (
    <>
      {blocks.map((b, idx) => {
        if (b.kind === "ol") {
          const start = counter;
          counter += b.items.length;
          return (
            <ol key={idx} className="rich-list" start={start}>
              {b.items.map((t, i) => <li key={i}>{t}</li>)}
            </ol>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={idx} className="rich-list">
              {b.items.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          );
        }
        return <p key={idx} style={{ whiteSpace: "pre-wrap" }}>{b.text}</p>;
      })}
    </>
  );
}

// How many <li> would appear in ordered blocks — used to continue numbering
// sequentially across sibling RichText sections.
export function countOrderedItems(text: string | undefined | null): number {
  return parseRichText(text).reduce((n, b) => n + (b.kind === "ol" ? b.items.length : 0), 0);
}