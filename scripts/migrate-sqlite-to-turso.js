require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { createClient } = require("@libsql/client");

const localPath = path.resolve(process.env.LOCAL_DB_PATH || path.join(__dirname, "..", "data.db"));
const remoteUrl = process.env.TURSO_DATABASE_URL;
const remoteAuthToken = process.env.TURSO_AUTH_TOKEN;

async function main() {
  if (!fs.existsSync(localPath)) {
    throw new Error(`Local database not found at ${localPath}. Set LOCAL_DB_PATH if it is elsewhere.`);
  }
  if (!remoteUrl || !remoteAuthToken) {
    throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before migrating.");
  }

  const local = createClient({ url: pathToFileURL(localPath).href });
  const remote = createClient({ url: remoteUrl, authToken: remoteAuthToken });

  await remote.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      subject    TEXT,
      message    TEXT NOT NULL,
      ip         TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const result = await local.execute(
    "SELECT id, name, email, subject, message, ip, created_at FROM messages ORDER BY id"
  );
  const rows = result.rows;

  for (let start = 0; start < rows.length; start += 100) {
    const batch = rows.slice(start, start + 100).map((row) => ({
      sql: `INSERT OR IGNORE INTO messages (id, name, email, subject, message, ip, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [row.id, row.name, row.email, row.subject, row.message, row.ip, row.created_at],
    }));
    await remote.batch(batch, "write");
  }

  console.log(`Migrated ${rows.length} message(s). Existing IDs were preserved.`);
  local.close();
  remote.close();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
