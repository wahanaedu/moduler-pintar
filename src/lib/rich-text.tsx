import React from "react";

type Block =
  | { kind: "ol"; items: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "p"; text: string };

const OL_RE = /^\s*(\d+)[.)]\s+(.*)$/;
const UL_RE = /^\s*[-*•·]\s+(.*)$/;

export function parseRichText(input: string | undefined | null): Block[] {
  if (!input) return [];
  const lines = String(input).replace(/\r\n/g, "\n").split("\n");
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

export function RichText({ text }: { text: string | undefined | null }) {
  const blocks = parseRichText(text);
  if (blocks.length === 0) return null;
  return (
    <>
      {blocks.map((b, idx) => {
        if (b.kind === "ol") {
          return (
            <ol key={idx} className="rich-list">
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