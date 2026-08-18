#!/usr/bin/env node
// bench/compare.mjs — clip2md vs turndown 直接调用
// 目的：验证 clip2md 不比 turndown 慢，且增加了 LLM 友好清理
import TurndownService from "turndown";
import { htmlToMarkdown } from "../src/html2md.mjs";

const samples = [
  { name: "github-readme", html: `<h1>Title</h1><p>Some <strong>bold</strong> text.</p><ul><li>a</li><li>b</li></ul>` },
  { name: "complex-doc", html: `<article><h1>H1</h1><h2>H2</h2><p>Paragraph.</p><pre><code class="language-js">const x = 1;</code></pre><table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table></article>` },
];

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced", emDelimiter: "*", strongDelimiter: "**" });

console.log("tool            sample          ms/op    bytes-in  bytes-out");
console.log("-".repeat(72));

for (const s of samples) {
  const inBytes = Buffer.byteLength(s.html, "utf8");
  // turndown raw
  const t0 = performance.now();
  const tOut = turndown.turndown(s.html);
  const tMs = performance.now() - t0;
  console.log(`turndown        ${s.name.padEnd(14)}  ${tMs.toFixed(2).padStart(6)}   ${String(inBytes).padStart(8)}  ${String(Buffer.byteLength(tOut, "utf8")).padStart(9)}`);
  // clip2md (turndown + cleanText)
  const c0 = performance.now();
  const cOut = htmlToMarkdown(s.html);
  const cMs = performance.now() - c0;
  console.log(`clip2md         ${s.name.padEnd(14)}  ${cMs.toFixed(2).padStart(6)}   ${String(inBytes).padStart(8)}  ${String(Buffer.byteLength(cOut, "utf8")).padStart(9)}`);
  console.log("");
}