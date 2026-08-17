// src/read.mjs — 输入源：文件 / stdin / 剪贴板
import { promises as fs } from "node:fs";
import process from "node:process";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";

export async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function readClipboardWindows() {
  return new Promise((resolve, reject) => {
    const ps = spawn("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Get-Clipboard -Raw",
    ], { windowsHide: true });
    let out = "";
    let err = "";
    ps.stdout.on("data", (d) => (out += d.toString("utf8")));
    ps.stderr.on("data", (d) => (err += d.toString("utf8")));
    ps.on("error", reject);
    ps.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Get-Clipboard exit ${code}: ${err}`));
      // PowerShell 把换行转成 \r\n，去掉尾部空白
      resolve(out.replace(/\r/g, "").replace(/\n+$/, ""));
    });
  });
}

async function readClipboardMac() {
  return new Promise((resolve, reject) => {
    const p = spawn("pbpaste", [], { windowsHide: true });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString("utf8")));
    p.stderr.on("data", (d) => (err += d.toString("utf8")));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(`pbpaste exit ${code}: ${err}`));
      resolve(out);
    });
  });
}

async function readClipboardLinux() {
  // 优先 wl-paste（Wayland），回退 xclip（X11）
  for (const cmd of [["wl-paste", []], ["xclip", ["-selection", "clipboard", "-o"]]]) {
    try {
      return await new Promise((resolve, reject) => {
        const p = spawn(cmd[0], cmd[1], { windowsHide: true });
        let out = "";
        let err = "";
        p.stdout.on("data", (d) => (out += d.toString("utf8")));
        p.stderr.on("data", (d) => (err += d.toString("utf8")));
        p.on("error", reject);
        p.on("close", (code) => {
          if (code === 0) resolve(out);
          else reject(new Error(err || `exit ${code}`));
        });
      });
    } catch (e) {
      // 试下一个
    }
  }
  throw new Error("没找到 wl-paste 或 xclip。请装一个：apt install xclip / wl-clipboard");
}

export async function readClipboard() {
  const p = os.platform();
  if (p === "win32") return readClipboardWindows();
  if (p === "darwin") return readClipboardMac();
  return readClipboardLinux();
}

function sniffKindFromFilename(filename, body) {
  if (!filename) return "text";
  const ext = path.extname(filename).toLowerCase();
  if ([".html", ".htm", ".xhtml"].includes(ext)) return "html";
  if ([".md", ".markdown"].includes(ext)) return "markdown";
  // 内容嗅探
  const head = body.slice(0, 200).trimStart().toLowerCase();
  if (head.startsWith("<!doctype html") || head.startsWith("<html") || head.startsWith("<?xml")) return "html";
  return "text";
}

export async function detectInput(opts) {
  if (opts.fromClip) {
    const text = await readClipboard();
    return {
      kind: "text",
      label: "clipboard",
      read: async () => text,
    };
  }
  if (opts.input && opts.input !== "-") {
    const filename = opts.input;
    const body = await fs.readFile(filename, "utf8");
    const kind = sniffKindFromFilename(filename, body);
    return {
      kind,
      label: filename,
      read: async () => body,
    };
  }
  // stdin
  const body = await readStdin();
  const kind = sniffKindFromFilename(null, body);
  return {
    kind,
    label: "stdin",
    read: async () => body,
  };
}