-- Ensure subkegiatan table exists
-- Run this in Cloudflare D1 Console if subkegiatan table is missing

CREATE TABLE IF NOT EXISTS subkegiatan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subkegiatan TEXT NOT NULL,
  ppk TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);
