# clip2md

> 把任何复制内容变成 LLM-ready Markdown。复制到 AI 的最后一道工序。
> Turn any clipboard payload into LLM-ready Markdown.

## TL;DR

- **定位（犀利版）**：`复制到 AI 的最后一道工序`
- **解决什么**：从 PDF / Word / 网页 / 图片复制出来的内容，粘贴到 Claude / Codex / Cursor 里之前，还得手动修智能引号、零宽字符、多余空行、表格、引用——这一步每次都在重复
- **跟谁抢用户**：手动复制粘贴 + sed 改；anydoc（单文件 .docx → MD，但不会清剪贴板）；npx turndown（HTML→MD 但不做文本清洗）
- **为什么是你做**：clip2md 把「剪贴板 → LLM-ready MD」做成一条命令，**带本地 front-matter 溯源**，并主动跳过代码块不破坏格式

## 安装

```bash
npm install -g clip2md
```

或者直接 npx（不需要本地装）：

```bash
npx clip2md --help
```

## 用法

```bash
# 1) 从文件转换（自动判别 text/html/markdown）
clip2md README.html -o README.md

# 2) 从系统剪贴板读（Windows 走 PowerShell Get-Clipboard；macOS 走 pbpaste；Linux 走 wl-paste/xclip）
clip2md --from-clip -o paste.md

# 3) 走 stdin
cat page.html | clip2md -o page.md

# 4) 给纯文本做温和清洗（去掉智能引号 / 零宽字符 / 多余空行）
clip2md notes.txt --wrap 100 -o notes.clean.md

# 5) 输出 JSON（含 front-matter 元信息）方便 Agent 直接消费
clip2md README.html --json -o README.json
```

## 演示

> 演示 GIF 还在录。占位：把 `examples/messy-input.txt` 喂给 clip2md，得到 LLM 友好的 Markdown。

### Before

```text
"hello", 'world'. Em—dashes too.
There is   extra    whitespace. And some zero-width chars lurking in there.



Multiple


blank


lines.

中文括号之间 ( 有时候 ) 会被 加 多余空格。
```

### After

```markdown
---
source: examples/messy-input.txt
kind: text
bytes: 326
chars: 326
convertedAt: 2026-08-17T10:00:00.000Z
---

"hello", 'world'. Em--dashes too.
There is extra whitespace. And some zero-width chars lurking in there.

Multiple

blank

lines.

中文括号之间(有时候)会被加多余空格。
```

## 它做了什么 / 不做什么

| 会做 | 不会做 |
| --- | --- |
| 智能引号 → 直引号；em-dash → `--`；零宽字符删除 | OCR（图片转文字）—— 留给 vision 模型 |
| 多余空行 3+ → 2；行尾空白删除 | PDF 表格结构还原 —— 留给你用 anydoc / doc7 |
| HTML → GFM Markdown（标题、列表、链接、表格、代码块） | 完整 HTML → MD（不替代 turndown，只是更轻的 90%） |
| **不破坏代码块字符** —— 检测到 ``` 自动跳过 | 截图识别 —— 用专门的 OCR 工具 |
| YAML front-matter（source / kind / bytes / convertedAt） |  |
| 中文括号紧贴 + 中英混排软换行 |  |

## 跟同类相比

| 工具 | 输入 | 输出 | 主动清洗 | 保护代码块 | front-matter |
| --- | --- | --- | --- | --- | --- |
| **clip2md** | file / stdin / 剪贴板 | MD | ✅ | ✅ | ✅ |
| `npx turndown` | HTML string | MD | ❌ | ⚠️ 部分 | ❌ |
| anydoc (12K⭐) | .docx/.pdf/.pptx | MD | ⚠️ 文档层 | ✅ | ❌ |
| 手动 sed | 任意 | 任意 | 看心情 | ❌ | ❌ |

## 工作原理（一段话）

`bin/clip2md.mjs` 接 CLI 参数 → `src/read.mjs` 决定读 stdin / 文件 / 剪贴板（Windows 用 PowerShell `Get-Clipboard`，macOS 用 `pbpaste`，Linux 用 `wl-paste` 或 `xclip` 回退） → `src/clean.mjs` 按行清洗智能引号 / 零宽字符 / 多余空行，并跟踪 ```` ``` ```` 围栏不破坏代码块 → 若检测到 HTML 走 `src/html2md.mjs` 转 GFM → `src/frontmatter.mjs` 包一层 YAML 溯源信息 → 输出到 stdout 或 `-o` 文件。

## 路线图

- [x] v0.1: 文件 / stdin / 剪贴板；HTML→MD；YAML front-matter
- [ ] v0.2: 剪贴板图片存盘 + 占位符（`![clipboard-image](out.png)`）
- [ ] v0.3: `--vision <endpoint>` —— 把图片剪贴板丢给 OpenAI-compatible 视觉模型，输出图说
- [ ] v0.4: `--diff` —— 对比上次结果，给 LLM 看的 patch
- [ ] v0.5: 多文件批处理 + `clip2md.config.json`（默认 wrap / 默认 front-matter 字段）

## 风险 / 局限

- HTML→MD 是正则版，复杂页面（嵌套表格 / colspan / rowspan）会丢结构。要严格场景请用 turndown。
- 剪贴板读取依赖外部命令（PowerShell / pbpaste / wl-paste / xclip）。Linux 桌面没装的话会报错。
- 大文件（>10MB）会一次进内存；后面想加流式。
- 智能引号替换是「全文替换」，**代码块会被显式跳过**，但代码块外的 inline code 仍可能被替换。

## 协议

MIT © Ethan