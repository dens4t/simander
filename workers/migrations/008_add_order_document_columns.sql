-- Run this in Cloudflare D1 Console if columns are missing

ALTER TABLE orders ADD COLUMN paket TEXT;
ALTER TABLE orders ADD COLUMN kontrak TEXT;
ALTER TABLE orders ADD COLUMN invoice TEXT;
ALTER TABLE orders ADD COLUMN drive_link TEXT;
ALTER TABLE orders ADD COLUMN ba TEXT;
ALTER TABLE orders ADD COLUMN subkegiatan_id INTEGER REFERENCES subkegiatan(id);
