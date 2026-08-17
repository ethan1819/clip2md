// src/index.mjs — 对外 API + 命令行编排
import { promises as fs } from "node:fs";
import process from "node:process";
import { detectInput, readClipboard, readStdin } from "./read.mjs";
import { cleanText } from "./clean.mjs";
import { htmlToMarkdown } from "./html2md.mjs";
import { buildFrontMatter } from "./frontmatter.mjs";

function printHelp() {
  console.log(`clip2md — 把任何复制内容变成 LLM-ready Markdown

用法:
  clip2md <file>            读文件并转换（自动判别 text/html）
  clip2md --from-clip       从系统剪贴板读（Win 走 PowerShell Get-Clipboard）
  cat page.html | clip2md   从 stdin 读

选项:
  -o, --output <file>       写到文件（默认 stdout）
  --json                    输出 JSON { markdown, meta }
  --wrap <n>                在第 n 列软换行（默认 0 = 不换）
  --no-frontmatter          不输出 YAML front-matter
  --source-label <str>      覆盖 front-matter 的 source 字段
  --html                    强制按 HTML 处理（即使扩展名是 .txt）
  -h, --help                看这个

示例:
  clip2md README.html -o README.md
  clip2md --from-clip -o paste.md
  clip2md notes.txt --wrap 100
`);
}

function parseArgs(argv) {
  const opts = {
    input: null,
    output: null,
    json: false,
    wrap: 0,
    frontmatter: true,
    sourceLabel: null,
    forceHtml: false,
    help: false,
    fromClip: false,
  };
  const args = [...argv];
  while (args.length) {
    const a = args.shift();
    switch (a) {
      case "-h":
      case "--help":
        opts.help = true;
        break;
      case "-o":
      case "--output":
        opts.output = args.shift();
        break;
      case "--json":
        opts.json = true;
        break;
      case "--wrap":
        opts.wrap = parseInt(args.shift(), 10);
        break;
      case "--no-frontmatter":
        opts.frontmatter = false;
        break;
      case "--source-label":
        opts.sourceLabel = args.shift();
        break;
      case "--html":
        opts.forceHtml = true;
        break;
      case "--from-clip":
        opts.fromClip = true;
        break;
      default:
        if (!opts.input) opts.input = a;
        else throw new Error(`未知参数：${a}`);
    }
  }
  return opts;
}

export async function run(argv) {
  const opts = parseArgs(argv);
  if (opts.help || (!opts.input && !opts.fromClip && process.stdin.isTTY)) {
    printHelp();
    return;
  }

  const source = await detectInput(opts);
  const raw = await source.read();
  const detectedKind = source.kind;

  let markdown;
  if (opts.forceHtml || detectedKind === "html") {
    markdown = htmlToMarkdown(raw);
  } else {
    markdown = cleanText(raw, { wrap: opts.wrap });
  }

  const meta = {
    source: opts.sourceLabel || source.label,
    kind: opts.forceHtml ? "html" : detectedKind,
    bytes: Buffer.byteLength(raw, "utf8"),
    chars: raw.length,
    convertedAt: new Date().toISOString(),
  };

  if (opts.frontmatter) {
    markdown = buildFrontMatter(meta) + "\n" + markdown;
  }

  if (opts.output) {
    await fs.writeFile(opts.output, markdown, "utf8");
    if (!opts.json) {
      console.error(`✓ ${opts.output}  (${meta.chars} chars, ${meta.kind})`);
    } else {
      console.log(JSON.stringify({ markdown, meta }, null, 2));
    }
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify({ markdown, meta }, null, 2));
  } else {
    process.stdout.write(markdown);
    if (!markdown.endsWith("\n")) process.stdout.write("\n");
  }
}