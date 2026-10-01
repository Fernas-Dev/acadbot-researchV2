/**
 * Correção pontual: reverte mojibake (UTF-8 lido como cp1252 e regravado
 * como UTF-8) introduzido por um Set-Content do PowerShell 5.1 sem encoding.
 *
 * Uso: node scripts/fix-encoding.cjs [--apply]
 * Sem --apply apenas reporta os ficheiros afetados.
 */
const fs = require("node:fs");
const path = require("node:path");
const iconv = require("iconv-lite");

const ROOT = path.resolve(__dirname, "..");
const TARGETS = ["backend/src", "frontend/src"];
const APPLY = process.argv.includes("--apply");

/** Marcadores típicos de mojibake (sequências que não ocorrem em PT correto). */
const MOJIBAKE = /[ÃÂ][\u0080-\u00BF]|â€|Ã§|Ã£|Ã©|Ãµ|Ã¡|Ã­|Ã³|Ãº|Ã¢|Ãª|Ã´|Ã |Ã‰/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|cjs|json|md|sql|css|html)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function reverseMojibake(text) {
  // cp1252 → bytes → UTF-8 (reverte exatamente o dano introduzido)
  return iconv.decode(iconv.encode(text, "win1252"), "utf8");
}

const files = TARGETS.flatMap((target) => walk(path.join(ROOT, target)));
const affected = [];
let fixed = 0;

for (const file of files) {
  let buffer = fs.readFileSync(file);
  const hadBom = buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  if (hadBom) buffer = buffer.subarray(3);

  const text = buffer.toString("utf8");
  if (!MOJIBAKE.test(text)) {
    if (hadBom && APPLY) fs.writeFileSync(file, text, "utf8");
    continue;
  }

  const repaired = reverseMojibake(text);
  const stillBroken = MOJIBAKE.test(repaired);
  affected.push({ file: path.relative(ROOT, file), bom: hadBom, stillBroken });

  if (APPLY && !stillBroken) {
    fs.writeFileSync(file, repaired, "utf8");
    fixed += 1;
  }
}

console.log(`Ficheiros analisados: ${files.length}`);
console.log(`Ficheiros com mojibake: ${affected.length}`);
for (const entry of affected) {
  console.log(`  - ${entry.file}${entry.stillBroken ? "  (ATENÇÃO: ainda suspeito)" : ""}`);
}
if (APPLY) console.log(`Ficheiros corrigidos: ${fixed}`);
else console.log("(execução de relatório — usa --apply para corrigir)");