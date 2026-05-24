import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "listings.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        asking_price TEXT,
        annual_revenue TEXT,
        net_cash_flow TEXT,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        first_seen TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen TEXT NOT NULL DEFAULT (datetime('now')),
        last_checked TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

export interface Listing {
  id: number;
  url: string;
  title: string;
  asking_price: string | null;
  annual_revenue: string | null;
  net_cash_flow: string | null;
  description: string | null;
  status: string;
  first_seen: string;
  last_seen: string;
  last_checked: string;
}

export function upsertListing(listing: Omit<Listing, "id" | "first_seen" | "last_seen" | "last_checked" | "status">) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO listings (url, title, asking_price, annual_revenue, net_cash_flow, description, status, last_seen, last_checked)
    VALUES (@url, @title, @asking_price, @annual_revenue, @net_cash_flow, @description, 'active', datetime('now'), datetime('now'))
    ON CONFLICT(url) DO UPDATE SET
      title = @title,
      asking_price = @asking_price,
      annual_revenue = @annual_revenue,
      net_cash_flow = @net_cash_flow,
      description = @description,
      status = 'active',
      last_seen = datetime('now'),
      last_checked = datetime('now')
  `);
  stmt.run(listing);
}

export function markMissingListings(currentUrls: string[]) {
  const db = getDb();
  if (currentUrls.length === 0) return;
  const placeholders = currentUrls.map(() => "?").join(",");
  db.prepare(`
    UPDATE listings
    SET status = 'gone', last_checked = datetime('now')
    WHERE status = 'active' AND url NOT IN (${placeholders})
  `).run(...currentUrls);
}

export function getAllListings(): Listing[] {
  const db = getDb();
  return db.prepare("SELECT * FROM listings ORDER BY status ASC, last_seen DESC").all() as Listing[];
}

export function getListingStats() {
  const db = getDb();
  const active = (db.prepare("SELECT COUNT(*) as count FROM listings WHERE status = 'active'").get() as { count: number }).count;
  const gone = (db.prepare("SELECT COUNT(*) as count FROM listings WHERE status = 'gone'").get() as { count: number }).count;
  const lastCheck = (db.prepare("SELECT MAX(last_checked) as ts FROM listings").get() as { ts: string | null }).ts;
  return { active, gone, lastCheck };
}
