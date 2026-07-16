import { cp, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = process.env.PRISMA_RUNTIME_TARGET === "cloudflare" ? "cloudflare" : "node";
const sourceDir = path.join(projectRoot, "generated", `prisma-${runtime}`);
const targetDir = path.join(projectRoot, "generated", "prisma");

try {
  await stat(sourceDir);
} catch {
  throw new Error(
    `No existe el cliente Prisma para ${runtime}. Ejecuta "prisma generate" antes del build.`
  );
}

await rm(targetDir, { recursive: true, force: true });
await cp(sourceDir, targetDir, { recursive: true });

console.log(`Cliente Prisma seleccionado para ${runtime}.`);
