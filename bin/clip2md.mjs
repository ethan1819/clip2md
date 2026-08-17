#!/usr/bin/env node
// clip2md — 把任何复制内容变成 LLM-ready Markdown
// 用法：
//   clip2md <file>            读文件转换
//   clip2md --from-clip       从系统剪贴板读（Windows 走 PowerShell）
//   cat page.html | clip2md   读 stdin
//   clip2md <file> -o out.md  写到文件
//   clip2md <file> --json     输出 JSON 包装

import { run } from "../src/index.mjs";

run(process.argv.slice(2)).catch((err) => {
  console.error("clip2md:", err.message);
  process.exit(1);
});