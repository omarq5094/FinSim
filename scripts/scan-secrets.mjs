import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { log, error } from "node:console";
import process from "node:process";

const ignored = new Set([".git","node_modules",".next","coverage","test-results","playwright-report"]);
const patterns = [
  /sb_secret_[A-Za-z0-9_-]{20,}/,
  /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{30,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/,
];
let count=0, failed=false;
function scan(dir) {
  for (const entry of readdirSync(dir,{withFileTypes:true})) {
    if (ignored.has(entry.name) || entry.isSymbolicLink()) continue;
    if (entry.name.startsWith(".env") && entry.name!==".env.example") continue;
    const path=join(dir,entry.name);
    if (entry.isDirectory()) { scan(path); continue; }
    if (!/\.(?:ts|tsx|mjs|json|md|sql|toml|ya?ml)$/.test(path) && ![".gitignore",".env.example"].includes(entry.name)) continue;
    const content=readFileSync(path,"utf8"); count++;
    if (patterns.some(pattern=>pattern.test(content))) { error(`Possible credential pattern in ${path}; inspect locally. Match not printed.`); failed=true; }
  }
}
scan(process.cwd());
if (failed) process.exitCode=1;
else log(`No credential patterns found in ${count} source/config/documentation files. Local environment files excluded.`);
