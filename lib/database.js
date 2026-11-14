const { createClient } = require("@libsql/client");

let client;
let schemaPromise;

function getDatabase() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    const error = new Error("Turso database is not configured.");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }

  if (!client) client = createClient({ url, authToken });
  return client;
}

async function ensureSchema() {
  const database = getDatabase();

  if (!schemaPromise) {
    schemaPromise = database
      .execute(`
        CREATE TABLE IF NOT EXISTS messages (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT NOT NULL,
          email      TEXT NOT NULL,
          subject    TEXT,
          message    TEXT NOT NULL,
          ip         TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)
      .catch((error) => {
        schemaPromise = undefined;
        throw error;
      });
  }

  await schemaPromise;
  return database;
}

module.exports = { ensureSchema, getDatabase };
