import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const html = await readFile("public/index.html", "utf8");
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((reference) => !reference.startsWith("http") && !reference.startsWith("#"));

for (const reference of references) {
  await access(join("public", reference.split(/[?#]/)[0]));
}
JSON.parse(await readFile("public/data/movies.json", "utf8"));
console.log(`Static assets and data OK: ${references.length} local references`);
