-- Migration: Create subkegiatan table and add subkegiatan_id to orders
-- Run this in Cloudflare D1 Console

-- Create subkegiatan table
CREATE TABLE IF NOT EXISTS subkegiatan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subkegiatan TEXT NOT NULL,
  ppk TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

-- Add subkegiatan_id column to orders table
ALTER TABLE orders ADD COLUMN subkegiatan_id INTEGER REFERENCES subkegiatan(id);
