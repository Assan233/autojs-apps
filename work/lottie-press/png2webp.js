/**
 * lottie-png2webp.js
 * 将 Lottie JSON 中 assets 的 PNG/JPEG base64 图片转换为 WebP base64
 *
 * 用法:
 *   node png2webp.js <input.json|dir> [output.json] [--quality=80] [--lossless]
 *
 * 参数:
 *   input        必填，输入的 Lottie JSON 文件或文件夹（文件夹时递归处理所有 .json 文件）
 *   output.json  可选，仅在 input 为单文件时有效，指定输出路径；文件夹模式下覆盖原文件
 *   --quality=N  WebP 质量 0-100，默认 80（有损模式）
 *   --lossless   使用无损 WebP，默认关闭
 *
 * 依赖: jimp, webp-wasm（已安装在项目根 node_modules）
 */

"use strict";

const fs = require("fs");
const path = require("path");
const Jimp = require("jimp");
const webpWasm = require("webp-wasm");

// ──────────────────────────────────────────────
// 参数解析
// ──────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { quality: 80, lossless: 0 };
  const positional = [];

  for (const arg of args) {
    if (arg.startsWith("--quality=")) {
      opts.quality = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--lossless") {
      opts.lossless = 1;
    } else {
      positional.push(arg);
    }
  }

  if (positional.length < 1) {
    console.error(
      "用法: node png2webp.js <input.json|dir> [output.json] [--quality=80] [--lossless]"
    );
    process.exit(1);
  }

  const inputPath = path.resolve(positional[0]);
  // 仅单文件模式才有意义的 outputPath
  const outputPath = positional[1] ? path.resolve(positional[1]) : null;

  return { inputPath, outputPath, encodeOpts: opts };
}

// ──────────────────────────────────────────────
// 递归收集目录下所有 .json 文件
// ──────────────────────────────────────────────
function collectJsonFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      results.push(fullPath);
    }
  }
  return results;
}

// ──────────────────────────────────────────────
// 将 data URI 解码为原始 Buffer + MIME 类型
// ──────────────────────────────────────────────
function parseDataUri(dataUri) {
  // 格式: data:<mime>;base64,<data>
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

// ──────────────────────────────────────────────
// 用 jimp 解码图片，获取原始 RGBA 像素数据
// ──────────────────────────────────────────────
async function decodeImageToRgba(buffer) {
  const img = await Jimp.read(buffer);
  // jimp 内部存储格式为 RGBA，bitmap.data 是 Buffer
  return {
    data: new Uint8ClampedArray(img.bitmap.data),
    width: img.bitmap.width,
    height: img.bitmap.height,
  };
}

// ──────────────────────────────────────────────
// 将单个 base64 图片转换为 WebP base64
// ──────────────────────────────────────────────
async function convertToWebp(dataUri, encodeOpts) {
  const parsed = parseDataUri(dataUri);
  if (!parsed) {
    throw new Error("无法解析 data URI");
  }

  const supportedMimes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp"];
  if (!supportedMimes.includes(parsed.mime.toLowerCase())) {
    // 已经是 webp 或不支持的格式，直接跳过
    return null;
  }

  const imgData = await decodeImageToRgba(parsed.buffer);
  const webpBuffer = await webpWasm.encode(imgData, encodeOpts);
  const base64 = webpBuffer.toString("base64");
  return "data:image/webp;base64," + base64;
}

// ──────────────────────────────────────────────
// 处理单个 Lottie JSON 文件，返回统计信息
// ──────────────────────────────────────────────
async function processFile(filePath, outputPath, encodeOpts) {
  const raw = fs.readFileSync(filePath, "utf8");
  let lottie;
  try {
    lottie = JSON.parse(raw);
  } catch (e) {
    return { file: filePath, error: "JSON 解析失败: " + e.message };
  }

  const assets = lottie.assets || [];
  const imgAssets = assets.filter(
    (a) => a.p && typeof a.p === "string" && a.p.startsWith("data:image")
  );

  if (imgAssets.length === 0) {
    return { file: filePath, converted: 0, skipped: 0, noImages: true };
  }

  let converted = 0;
  let skipped = 0;

  for (const asset of imgAssets) {
    const originalMime = (asset.p.match(/^data:([^;]+);/) || [])[1] || "unknown";
    process.stdout.write(`  [${asset.id}] ${originalMime} -> webp ... `);

    try {
      const webpDataUri = await convertToWebp(asset.p, encodeOpts);
      if (webpDataUri === null) {
        console.log("跳过（已是 webp 或不支持）");
        skipped++;
        continue;
      }

      const originalSize = asset.p.length;
      const newSize = webpDataUri.length;
      const ratio = ((newSize / originalSize) * 100).toFixed(1);

      asset.p = webpDataUri;
      console.log(`完成 (${originalSize} -> ${newSize} bytes, ${ratio}%)`);
      converted++;
    } catch (err) {
      console.log(`失败: ${err.message}`);
      skipped++;
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(lottie), "utf8");
  return { file: filePath, converted, skipped };
}

// ──────────────────────────────────────────────
// 主流程
// ──────────────────────────────────────────────
async function main() {
  const { inputPath, outputPath, encodeOpts } = parseArgs(process.argv);

  console.log("编码参数:", JSON.stringify(encodeOpts));

  const stat = fs.statSync(inputPath);
  const isDir = stat.isDirectory();

  if (isDir) {
    // 文件夹模式：递归处理所有 .json，覆盖原文件
    const files = collectJsonFiles(inputPath);
    if (files.length === 0) {
      console.log("目录下未找到任何 .json 文件。");
      process.exit(0);
    }
    console.log(`目录模式，共发现 ${files.length} 个 JSON 文件\n`);

    let totalConverted = 0;
    let totalSkipped = 0;
    let totalFiles = 0;
    let errorFiles = 0;

    for (const file of files) {
      const rel = path.relative(inputPath, file);
      console.log(`处理: ${rel}`);
      const result = await processFile(file, file, encodeOpts); // 覆盖原文件
      if (result.error) {
        console.log(`  错误: ${result.error}`);
        errorFiles++;
      } else if (result.noImages) {
        console.log("  无内嵌图片，跳过");
      } else {
        totalConverted += result.converted;
        totalSkipped += result.skipped;
        totalFiles++;
      }
      console.log();
    }

    console.log("────────────────────────────────");
    console.log(`处理文件: ${totalFiles} 个（错误 ${errorFiles} 个）`);
    console.log(`图片转换: ${totalConverted} 个成功, ${totalSkipped} 个跳过`);
  } else {
    // 单文件模式
    const defaultOutput = inputPath.replace(/\.json$/i, "") + ".webp.json";
    const finalOutput = outputPath || defaultOutput;

    console.log("输入文件:", inputPath);
    console.log("输出文件:", finalOutput);

    const result = await processFile(inputPath, finalOutput, encodeOpts);
    if (result.error) {
      console.error("错误:", result.error);
      process.exit(1);
    } else if (result.noImages) {
      console.log("未找到内嵌 base64 图片资源，无需转换。");
    } else {
      console.log(`\n转换完成: ${result.converted} 个成功, ${result.skipped} 个跳过`);
      console.log("已写入:", finalOutput);
    }
  }
}

main().catch((err) => {
  console.error("错误:", err);
  process.exit(1);
});
