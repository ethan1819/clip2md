// src/frontmatter.mjs — 给转换结果加上 YAML front-matter（方便 Agent 溯源）

function yamlEscape(value) {
  if (value === null || value === undefined) return '""';
  const s = String(value);
  // 简单判断：含特殊字符就用引号
  if (/[:#\n"]/.test(s)) {
    return JSON.stringify(s);
  }
  return s;
}

export function buildFrontMatter(meta) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(meta)) {
    lines.push(`${k}: ${yamlEscape(v)}`);
  }
  lines.push("---");
  return lines.join("\n");
}