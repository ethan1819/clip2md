// src/html2md.mjs — HTML → Markdown (turndown + LLM 清洗)
// turndown 是 battle-tested 的 HTML→MD 库，处理嵌套 / 表格 / 代码块都靠它
// 我们覆盖 turndown 不做的部分：style/script strip、bullet 风格、emphasis 风格
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",          // # / ## / ###
  bulletListMarker: "-",        // 用 - 不用 *
  codeBlockStyle: "fenced",     // ``` 而不是缩进
  fence: "```",
  emDelimiter: "*",            // *italic* 而不是 _italic_
  strongDelimiter: "**",
  linkStyle: "inlined",         // [text](url)
  linkReferenceStyle: "full",
});

export function htmlToMarkdown(html, options = {}) {
  let input = String(html ?? "");
  // 先去掉 turndown 默认会保留的 <style>/<script>/<noscript>/注释
  input = input.replace(/<script[\s\S]*?<\/script>/gi, "");
  input = input.replace(/<style[\s\S]*?<\/style>/gi, "");
  input = input.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  input = input.replace(/<!--[\s\S]*?-->/g, "");
  let md = turndown.turndown(input);
  // LLM 友好清理：连续空行合并 + 行尾空白去掉
  md = md.replace(/\n{3,}/g, "\n\n");
  md = md.replace(/[ \t]+\n/g, "\n");
  return md.trim() + "\n";
}

export function normalizeUnicode(s, form = "NFC") {
  return String(s ?? "").normalize(form);
}