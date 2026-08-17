# Changelog

All notable changes to this project will be documented here.

## [0.1.0] - 2026-08-17

### Added

- 初始版本：文件 / stdin / 剪贴板（Win PowerShell / macOS pbpaste / Linux wl-paste-xclip）
- 文本清洗：智能引号、零宽字符、多余空行、软连字符、中文括号紧贴
- HTML → GFM Markdown（极简正则版；h1-h6、p、ul/ol、a、img、table、pre/code、blockquote）
- YAML front-matter（source / kind / bytes / chars / convertedAt）
- 代码块保护（检测 ``` 围栏跳过字符替换）
- `--wrap N` 软换行（中英文混排友好）
- `--json` 输出 JSON 包
- 内置测试：`node --test test/`

## [0.1.1] - 2026-08-17

### Fixed

- html2md: \u4e3a h1-h6 \u52a0 # / ## / ### \u524d\u7f00\uff08\u4ee5\u524d\u53ea\u52a0\u4e86 \\n\\n\uff0c\u4e22\u4e86\u8bed\u4e49\uff09
- clean: \u8865\u5165\u300c\u4efb\u4f55\u975e\u4e2d\u6587 + ws + \u4e2d\u6587\u300d\u89c4\u5219\uff08\u89e3\u51b3\u300c( \u662f\u300d\u8fd9\u79cd\u7a7a\u683c\u53bb\u4e0d\u6389\u7684\u95ee\u9898\uff09