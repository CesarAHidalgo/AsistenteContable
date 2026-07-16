import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(
  projectRoot,
  ".open-next",
  "server-functions",
  "default",
  ".next",
  "server",
  "chunks",
  "static",
  "wasm"
);
const targetDir = path.join(projectRoot, ".open-next", "static", "wasm");
const handlerPath = path.join(
  projectRoot,
  ".open-next",
  "server-functions",
  "default",
  "handler.mjs"
);
const workerPath = path.join(projectRoot, ".open-next", "worker.js");
const generatedWasmPath = path.join(
  projectRoot,
  ".open-next",
  "server-functions",
  "default",
  "generated",
  "prisma",
  "internal",
  "query_engine_bg.wasm"
);

const files = (await readdir(sourceDir)).filter((file) => file.endsWith(".wasm"));

if (files.length === 0) {
  throw new Error(`No se encontraron módulos WASM de Prisma en ${sourceDir}.`);
}

const canonicalByDigest = new Map();
const duplicateHashes = new Map();

for (const file of files.sort()) {
  const contents = await readFile(path.join(sourceDir, file));
  const digest = createHash("sha256").update(contents).digest("hex");
  const canonical = canonicalByDigest.get(digest);

  if (canonical) {
    duplicateHashes.set(path.parse(file).name, path.parse(canonical).name);
  } else {
    canonicalByDigest.set(digest, file);
  }
}

let handler = await readFile(handlerPath, "utf8");

for (const [duplicateHash, canonicalHash] of duplicateHashes) {
  handler = handler.replaceAll(duplicateHash, canonicalHash);
}

const wasmModuleLoaderPattern =
  /getQueryEngineWasmModule:async\(\)=>\{let\{default:[\w$]+\}=await [\w$]+\.e\(\d+\)\.then\([\w$]+\.bind\([\w$]+,\d+\)\);return [\w$]+\}/g;
const loaderMatches = handler.match(wasmModuleLoaderPattern);

if (!loaderMatches?.length) {
  throw new Error("No se encontró el cargador del módulo WASM de Prisma.");
}

handler = handler.replace(
  wasmModuleLoaderPattern,
  "getQueryEngineWasmModule:async()=>globalThis.__PRISMA_QUERY_ENGINE_WASM__"
);

await writeFile(handlerPath, handler);
await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

await Promise.all(
  [...canonicalByDigest.values()].map((file) =>
    copyFile(path.join(sourceDir, file), path.join(targetDir, file))
  )
);

const [canonicalFile] = canonicalByDigest.values();
const worker = await readFile(workerPath, "utf8");
const wasmShim = `import prismaQueryEngine from "./static/wasm/${canonicalFile}";

globalThis.__PRISMA_QUERY_ENGINE_WASM__ = prismaQueryEngine;

`;

await writeFile(workerPath, `${wasmShim}${worker}`);
await rm(sourceDir, { recursive: true, force: true });
await rm(generatedWasmPath, { force: true });

console.log(
  `Preparados ${canonicalByDigest.size} módulo(s) WASM para Cloudflare; ${duplicateHashes.size} duplicado(s) deduplicado(s).`
);
