import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import pg from "pg";
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../drizzle");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const baseline = process.argv.includes("--baseline");

async function main(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  const db = drizzle(pool);

  if (baseline) {
    console.log(
      "Baseline mode: registering existing migrations as already applied without executing SQL.",
    );
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      )
    `);

    const journalPath = path.join(MIGRATIONS_DIR, "meta", "_journal.json");
    const journal: { entries: { idx: number; tag: string; when: number }[] } =
      JSON.parse(readFileSync(journalPath, "utf-8"));

    for (const entry of journal.entries) {
      const sqlFile = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
      const sqlContent = readFileSync(sqlFile, "utf-8");
      // Must match drizzle-orm's migrator hash exactly so future `migrate`
      // runs see this baseline as already-applied. Drizzle hashes the raw
      // file contents (sha256(query)) — do NOT split or trim.
      const hash = createHash("sha256").update(sqlContent).digest("hex");

      const existing = await db.execute(
        sql`SELECT id FROM drizzle.__drizzle_migrations WHERE hash = ${hash} LIMIT 1`,
      );
      if (existing.rows.length > 0) {
        console.log(`  · ${entry.tag} already registered`);
        continue;
      }
      await db.execute(
        sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${entry.when})`,
      );
      console.log(`  ✓ ${entry.tag} marked as applied`);
    }
  } else {
    console.log(`Applying migrations from ${MIGRATIONS_DIR}...`);
    const before = listFiles();
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    const after = listFiles();
    console.log(`Done. ${after - before} new file(s) seen.`);
  }

  await pool.end();
}

function listFiles(): number {
  try {
    return readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).length;
  } catch {
    return 0;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
