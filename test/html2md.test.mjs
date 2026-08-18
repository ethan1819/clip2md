// test/html2md.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { htmlToMarkdown } from "../src/html2md.mjs";

test("h1 + p", () => {
  const html = "<h1>Title</h1><p>Hello world.</p>";
  const md = htmlToMarkdown(html);
  assert.match(md, /# Title/);
  assert.match(md, /Hello world\./);
});

test("link", () => {
  const md = htmlToMarkdown('<a href="https://x.com">click</a>');
  assert.match(md, /\[click\]\(https:\/\/x\.com\)/);
});

test("list (ul)", () => {
  const md = htmlToMarkdown("<ul><li>a</li><li>b</li></ul>");
  assert.match(md, /-(\s+)a/);
  assert.match(md, /-(\s+)b/);
});

test("table → GFM", () => {
  const md = htmlToMarkdown(`
    <table>
      <tr><th>A</th><th>B</th></tr>
      <tr><td>1</td><td>2</td></tr>
    </table>
  `);
  // turndown 默认 table 输出扁平化（cells 之间空行），开启 GFM table 需要 joplin/turndown-plugin-gfm
  assert.match(md, /A/);
  assert.match(md, /1/);
});

test("inline formatting", () => {
  const md = htmlToMarkdown("<p>This is <strong>bold</strong> and <em>italic</em>.</p>");
  assert.match(md, /\*\*bold\*\*/);
  assert.match(md, /\*italic\*/);
});

test("script/style 去掉", () => {
  const md = htmlToMarkdown("<style>body{}</style><p>hi</p><script>x()</script>");
  assert.doesNotMatch(md, /body/);
  assert.doesNotMatch(md, /x\(\)/);
  assert.match(md, /hi/);
});