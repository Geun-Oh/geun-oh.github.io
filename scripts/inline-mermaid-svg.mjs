import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MERMAID_PRE_BLOCK_RE = /<pre class="mermaid">([\s\S]*?)<\/pre>/g;
const PRE_WITH_CODE_BLOCK_RE = /<pre\b[^>]*>\s*(<code\b[^>]*>[\s\S]*?<\/code>)\s*<\/pre>/gi;

function decodeHtmlEntities(input) {
    return input
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
        .replace(/&quot;/g, "\"")
        .replace(/&apos;/g, "'")
        .replace(/&#34;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}

function getAttrValue(attrs, attrName) {
    const escapedAttrName = attrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const attrRe = new RegExp(
        `\\b${escapedAttrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + "`" + `]+))`,
        "i",
    );
    const match = attrRe.exec(attrs);
    if (!match) {
        return null;
    }
    return (match[1] ?? match[2] ?? match[3] ?? "").trim();
}

function isMermaidCodeAttrs(attrs) {
    const classValue = getAttrValue(attrs, "class");
    if (classValue) {
        const classes = classValue.toLowerCase().split(/\s+/).filter(Boolean);
        if (classes.includes("language-mermaid") || classes.includes("mermaid")) {
            return true;
        }
    }

    const dataLang = getAttrValue(attrs, "data-lang");
    if (dataLang && dataLang.toLowerCase() === "mermaid") {
        return true;
    }

    const lang = getAttrValue(attrs, "lang");
    if (lang && lang.toLowerCase() === "mermaid") {
        return true;
    }

    return false;
}

async function listHtmlFiles(rootDir) {
    const files = [];
    async function walk(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
                continue;
            }
            if (entry.isFile() && fullPath.endsWith(".html")) {
                files.push(fullPath);
            }
        }
    }
    await walk(rootDir);
    return files;
}

function runMmdc(inputPath, outputPath, puppeteerConfigPath) {
    const args = [
        "--no-install",
        "mmdc",
        "-i",
        inputPath,
        "-o",
        outputPath,
        "--backgroundColor",
        "transparent",
        "--puppeteerConfigFile",
        puppeteerConfigPath,
        "--quiet",
    ];
    const result = spawnSync("npx", args, { encoding: "utf8" });
    if (result.error) {
        throw result.error;
    }
    if (result.status === 0) {
        return;
    }

    const stdErr = result.stderr?.trim();
    const stdOut = result.stdout?.trim();
    throw new Error(
        [
            "Failed to render Mermaid with mmdc.",
            stdErr ? `stderr: ${stdErr}` : "",
            stdOut ? `stdout: ${stdOut}` : "",
        ]
            .filter(Boolean)
            .join("\n"),
    );
}

async function loadSvgForMermaid(diagram, cache, tempDir, puppeteerConfigPath) {
    const existing = cache.memory.get(diagram);
    if (existing) {
        cache.hits += 1;
        return existing;
    }

    const hash = crypto
        .createHash("sha256")
        .update(`${cache.salt}\n${diagram}`)
        .digest("hex")
        .slice(0, 32);

    const cachePath = path.join(cache.dir, `${hash}.svg`);
    const cachedSvg = await fs.readFile(cachePath, "utf8").catch(() => null);
    if (cachedSvg) {
        cache.memory.set(diagram, cachedSvg);
        cache.hits += 1;
        return cachedSvg;
    }

    const inputPath = path.join(tempDir, `${hash}.mmd`);
    const outputPath = path.join(tempDir, `${hash}.svg`);

    await fs.writeFile(inputPath, `${diagram}\n`, "utf8");
    runMmdc(inputPath, outputPath, puppeteerConfigPath);
    const svg = await fs.readFile(outputPath, "utf8");
    cache.memory.set(diagram, svg);
    cache.misses += 1;
    await fs.writeFile(cachePath, svg, "utf8");
    return svg;
}

async function processHtmlFile(filePath, cache, tempDir, puppeteerConfigPath) {
    const original = await fs.readFile(filePath, "utf8");
    if (!original.includes("mermaid")) {
        return { changed: false, blocks: 0, discovered: 0 };
    }

    let discovered = 0;
    let blockCount = 0;
    let replaced = await replaceAsync(original, MERMAID_PRE_BLOCK_RE, async (_, encodedDiagram) => {
        discovered += 1;
        const decodedDiagram = decodeHtmlEntities(encodedDiagram).trim();
        const svg = await loadSvgForMermaid(decodedDiagram, cache, tempDir, puppeteerConfigPath);
        blockCount += 1;
        return `<div class="mermaid-svg">\n${svg}\n</div>`;
    });

    replaced = await replaceAsync(replaced, PRE_WITH_CODE_BLOCK_RE, async (fullMatch, codeBlockHtml) => {
        const codeMatch = /^<code\b([^>]*)>([\s\S]*?)<\/code>$/i.exec(codeBlockHtml.trim());
        if (!codeMatch) {
            return fullMatch;
        }

        const attrs = codeMatch[1] ?? "";
        if (!isMermaidCodeAttrs(attrs)) {
            return fullMatch;
        }

        discovered += 1;
        const encodedDiagram = codeMatch[2] ?? "";
        const withoutTags = encodedDiagram.replace(/<[^>]+>/g, "");
        const decodedDiagram = decodeHtmlEntities(withoutTags).trim();
        if (!decodedDiagram) {
            return fullMatch;
        }
        const svg = await loadSvgForMermaid(decodedDiagram, cache, tempDir, puppeteerConfigPath);
        blockCount += 1;
        return `<div class="mermaid-svg">\n${svg}\n</div>`;
    });

    if (replaced === original) {
        return { changed: false, blocks: 0, discovered };
    }

    await fs.writeFile(filePath, replaced, "utf8");
    return { changed: true, blocks: blockCount, discovered };
}

async function replaceAsync(input, regex, replacer) {
    const matches = [];
    input.replace(regex, (...args) => {
        const match = args[0];
        const offset = args.at(-2);
        matches.push({ match, offset, groups: args.slice(1, -2) });
        return match;
    });

    if (matches.length === 0) {
        return input;
    }

    let output = "";
    let lastIndex = 0;
    for (const item of matches) {
        output += input.slice(lastIndex, item.offset);
        output += await replacer(item.match, ...item.groups, item.offset, input);
        lastIndex = item.offset + item.match.length;
    }
    output += input.slice(lastIndex);
    return output;
}

async function main() {
    const publicDir = path.resolve(process.argv[2] ?? "public");
    const stat = await fs.stat(publicDir).catch(() => null);
    if (!stat || !stat.isDirectory()) {
        throw new Error(`Public directory not found: ${publicDir}`);
    }

    const htmlFiles = await listHtmlFiles(publicDir);
    if (htmlFiles.length === 0) {
        console.log("No HTML files found. Skipping Mermaid SVG inlining.");
        return;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mermaid-inline-"));
    const puppeteerConfigPath = path.join(tempDir, "puppeteer-config.json");
    await fs.writeFile(
        puppeteerConfigPath,
        JSON.stringify({ args: ["--no-sandbox", "--disable-setuid-sandbox"] }),
        "utf8",
    );

    const cacheDir = path.resolve(process.env.MERMAID_SVG_CACHE_DIR ?? ".cache/mermaid-svg");
    await fs.mkdir(cacheDir, { recursive: true });

    const cache = {
        dir: cacheDir,
        memory: new Map(),
        salt: process.env.MERMAID_CACHE_SALT ?? "mmdc-v11-bg-transparent",
        hits: 0,
        misses: 0,
    };
    const scannedFiles = htmlFiles.length;
    let changedFiles = 0;
    let changedBlocks = 0;
    let discoveredBlocks = 0;

    try {
        for (const filePath of htmlFiles) {
            const { changed, blocks, discovered } = await processHtmlFile(filePath, cache, tempDir, puppeteerConfigPath);
            discoveredBlocks += discovered;
            if (!changed) {
                continue;
            }
            changedFiles += 1;
            changedBlocks += blocks;
        }
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }

    console.log(
        `Mermaid inline SVG conversion complete: scanned ${scannedFiles} HTML files, discovered ${discoveredBlocks} Mermaid blocks, converted ${changedBlocks} blocks in ${changedFiles} HTML files (${cache.memory.size} unique diagrams in-run, cache hits=${cache.hits}, cache misses=${cache.misses}).`,
    );
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
