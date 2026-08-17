// src/clean.mjs — 文本清洗：智能引号、零宽字符、多余空行、软换行、缩进代码块保护
//
// 设计原则：
// 1) 不破坏 Markdown / 代码块的语义结构
// 2) 默认是「保守清洗」——只修对 LLM 友好度有害的部分
// 3) 用户可以用 --wrap 强制软换行；不传则不动

const REPLACEMENTS = [
  // 智能引号 → 直引号（LLM 训练语料里直引号更多，更稳定）
  [/[\u2018\u2019]/g, "'"],
  [/[\u201C\u201D]/g, '"'],
  // 智能破折号 → 双连字符
  [/\u2013/g, "-"], // en dash
  [/\u2014/g, "--"], // em dash
  // 智能省略号 → 三个点
  [/\u2026/g, "..."],
  // 不间断空格 → 普通空格
  [/\u00A0/g, " "],
  // 零宽字符（ZWSP, ZWNJ, ZWJ, BOM 之类）直接删
  [/[\u200B-\u200D\uFEFF]/g, ""],
  // 中文/全角空格 → 普通空格（保留中文标点不动）
  [/\u3000/g, " "],
  // 软连字符（PDF 复制常见）→ 删
  [/\u00AD/g, ""],
];

// 中英混排紧贴规则（按顺序；前一规则可能让后一规则多匹配几处）
const MIXED_REPLACEMENTS = [
  // 中文 + ws + 中文
  [/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2"],
  // 中文 + ws + 半角左括号 / 全角左括号
  [/([\u4e00-\u9fa5])\s+([(\uff08])/g, "$1$2"],
  // 半角右括号 / 全角右括号 + ws + 中文
  // 任何非中文 + ws + 中文 → 去掉空格（覆盖 \u00a0("[ 是") 等场景）
  [/([^\u4e00-\u9fa5\s])\s+([\u4e00-\u9fa5])/g, ''],
  [/([\u4e00-\u9fa5])\s+([)\uff09])/g, ''],
  [/([)\uff09])\s+([\u4e00-\u9fa5])/g, "$1$2"],
];

export function cleanText(input, opts = {}) {
  const wrap = opts.wrap > 0 ? opts.wrap : 0;
  let text = String(input ?? "");

  // 1) 规范化换行
  text = text.replace(/\r\n?/g, "\n");

  // 2) 按行应用字符替换（避免破坏代码块里的字符），并处理中英混排紧贴
  const lines = text.split("\n");
  const out = [];
  let inFence = false;
  for (const raw of lines) {
    const trimmed = raw.trimEnd();
    const isFence = /^```/.test(trimmed);
    if (isFence) inFence = !inFence;
    if (inFence) {
      out.push(raw);
      continue;
    }
    let line = raw;
    for (const [re, to] of REPLACEMENTS) line = line.replace(re, to);
    // 反复应用中英混排规则直到稳定（前面的替换可能让后面多匹配）
    let prev;
    do {
      prev = line;
      for (const [re] of MIXED_REPLACEMENTS) line = line.replace(re, (m, a, b) => a + b);
    } while (line !== prev);
    out.push(line);
  }
  text = out.join("\n");

  // 3) 多余空行（3+ → 2）
  text = text.replace(/\n{3,}/g, "\n\n");

  // 4) 行首行尾空白
  text = text.split("\n").map((l) => l.replace(/[ \t]+$/g, "")).join("\n");

  // 5) 可选软换行
  if (wrap > 0) {
    text = softWrap(text, wrap);
  }

  return text.trim() + "\n";
}

function softWrap(text, width) {
  // 仅对「普通段落」软换行；列表、表格、代码块、标题不动
  const lines = text.split("\n");
  const result = [];
  let buffer = "";
  let inFence = false;

  function flush() {
    if (buffer.length === 0) return;
    const wrapped = wrapParagraph(buffer, width);
    result.push(...wrapped);
    buffer = "";
  }

  for (const line of lines) {
    if (/^```/.test(line.trimEnd())) {
      inFence = !inFence;
      flush();
      result.push(line);
      continue;
    }
    if (inFence) {
      result.push(line);
      continue;
    }
    if (/^\s*$/.test(line)) {
      flush();
      result.push(line);
      continue;
    }
    // 列表、表格、标题、引用：原样保留
    if (/^(\s*([-*+]|\d+\.)\s+|\s*\|.+\||\s*#{1,6}\s|\s*>\s)/.test(line)) {
      flush();
      result.push(line);
      continue;
    }
    // 普通段落：累积到 buffer
    if (buffer && !buffer.endsWith(" ")) buffer += " ";
    buffer += line.trim();
  }
  flush();
  return result.join("\n");
}

function wrapParagraph(text, width) {
  // 在标点或空格处断行；中英文混排时优先在空格 / 中文标点处断
  const out = [];
  let remaining = text;
  while (remaining.length > width) {
    let cut = -1;
    for (let i = width; i > Math.max(0, width - 30); i--) {
      const c = remaining[i];
      if (c === " " || c === "\t" || /[\u3002\uff0c\uff1b\uff1a\u3001]/.test(c)) {
        cut = i;
        break;
      }
    }
    if (cut <= 0) cut = width;
    out.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) out.push(remaining);
  return out;
}
