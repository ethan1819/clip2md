// test/clean.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanText } from "../src/clean.mjs";

test("智能引号 → 直引号", () => {
  const input = `\u201cHello\u201d \u2018world\u2019`;
  const out = cleanText(input);
  assert.match(out, /"Hello" 'world'/);
});

test("零宽字符删除", () => {
  const input = "abc\u200B\u200Cdef";
  const out = cleanText(input);
  assert.equal(out.trim(), "abcdef");
});

test("多空行合并", () => {
  const input = "a\n\n\n\n\nb";
  const out = cleanText(input);
  assert.match(out, /a\n\nb/);
});

test("不破坏代码块", () => {
  const input = "```js\nconst x = `\u201cfoo\u201d`;\n```";
  const out = cleanText(input);
  assert.match(out, /const x = `\u201cfoo\u201d`;/); // 代码块内字符原样
});

test("soft wrap 生效", () => {
  const input = "abcdefghij ".repeat(20);
  const out = cleanText(input, { wrap: 50 });
  const lines = out.split("\n");
  for (const l of lines) {
    if (l.trim()) assert.ok(l.length <= 55, `line too long: ${l.length}`);
  }
});

test("中文括号紧贴", () => {
  const input = "今天 ( 是 周一 )";
  const out = cleanText(input);
  assert.match(out, /今天\(是周一\)/);
});

test("软连字符删除", () => {
  const input = "im\u00ADpossible";
  const out = cleanText(input);
  assert.match(out, /impossible/);
});