import fs from "node:fs/promises";
import { seedMovies } from "../api/_lib/database.js";

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set POSTGRES_URL before seeding the database.");

const records = JSON.parse(await fs.readFile(new URL("../public/data/movies.json", import.meta.url), "utf8"));
await seedMovies(records, process.env.GITHUB_SEED_OWNER || "abilash9007");
console.log(`Seeded ${records.length} movies.`);
