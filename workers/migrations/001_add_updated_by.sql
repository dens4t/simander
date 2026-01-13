-- Migration: Add updated_by column to orders table
-- Run this in Cloudflare D1 Console

ALTER TABLE orders ADD COLUMN updated_by INTEGER REFERENCES users(id);
