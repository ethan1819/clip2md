// src/html2md.mjs — 极简 HTML → Markdown（正则版）
// MVP 范围：标题、段落、列表（有序/无序）、链接、图片、表格、代码块、强调。
// 不追求覆盖所有 HTML/Edge case；遇到复杂结构会保留内层文本。

export function htmlToMarkdown(html) {
  let s = String(html ?? "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");

  // 标题块级标签 -> 加 # / ## / ### 前缀（必须在块级 替换之前）
  for (let _lv = 1; _lv <= 6; _lv++) {
    const _hash = '#'.repeat(_lv);
    const _re = new RegExp('<h' + _lv + '[^>]*>([\\s\\S]*?)</h' + _lv + '>', 'gi');
    s = s.replace(_re, function(_m, _t) { return '\n\n' + _hash + ' ' + _t.trim() + '\n\n'; });
  }


  s = s.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**");
  s = s.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "*$2*");
  s = s.replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`");
  s = s.replace(/<a [^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  s = s.replace(/<img [^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, "![$2]($1)");
  s = s.replace(/<img [^>]*src=["']([^"']+)["'][^>]*\/?>/gi, "![]($1)");

  // 列表项：先转成 "- X" 文本，避免后面块级换行吃掉 marker
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, inner) => {
    // 清掉内层标签
    const cleaned = inner.replace(/<[^>]+>/g, "").trim();
    return `\n- ${cleaned}`;
  });
  s = s.replace(/<\/?(ul|ol)[^>]*>/gi, "\n");

  // 表格 → GFM（在块级替换之前；表格自带换行）
  s = s.replace(/<table[\s\S]*?<\/table>/gi, (m) => {
    const rows = [];
    const trRe = /<tr[\s\S]*?<\/tr>/gi;
    let isHeader = true;
    let trMatch;
    while ((trMatch = trRe.exec(m)) !== null) {
      const cells = [];
      const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let cMatch;
      while ((cMatch = cellRe.exec(trMatch[0])) !== null) {
        const content = cMatch[1]
          .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**")
          .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "*$2*")
          .replace(/<a [^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        cells.push(content);
      }
      rows.push({ header: isHeader, cells });
      isHeader = false;
    }
    if (rows.length === 0) return "";
    const out = [];
    out.push(`| ${rows[0].cells.join(" | ")} |`);
    out.push(`| ${rows[0].cells.map(() => "---").join(" | ")} |`);
    for (let i = 1; i < rows.length; i++) {
      out.push(`| ${rows[i].cells.join(" | ")} |`);
    }
    return "\n\n" + out.join("\n") + "\n\n";
  });

  // 块级标签前后加换行
  const blockTags = ["p", "div", "section", "article", "main", "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "pre"];
  for (const t of blockTags) {
    s = s.replace(new RegExp(`<${t}[^>]*>`, "gi"), "\n\n");
    s = s.replace(new RegExp(`</${t}>`, "gi"), "\n\n");
  }
  s = s.replace(/<hr[^>]*\/?>/gi, "\n\n---\n\n");
  s = s.replace(/<br[^>]*\/?>/gi, "  \n");

  // 多空行 → 单空行
  s = s.replace(/\n{3,}/g, "\n\n");

  // 去掉残余标签
  s = s.replace(/<[^>]+>/g, "");

  // 反转义
  s = s.replace(/&amp;/g, "&")
       .replace(/&lt;/g, "<")
       .replace(/&gt;/g, ">")
       .replace(/&quot;/g, "\"")
       .replace(/&#39;/g, "'")
       .replace(/&nbsp;/g, " ");

  return s.trim() + "\n";
}