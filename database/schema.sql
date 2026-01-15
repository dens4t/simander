-- Database Schema for Order 2025 System
-- Cloudflare D1 Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    status TEXT NOT NULL DEFAULT 'active',
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    npwp TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    order_date DATE NOT NULL,
    shopping_name TEXT NOT NULL,
    contract_number TEXT NOT NULL,
    vendor_id INTEGER NOT NULL,
    contract_value REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    paket TEXT,
    kontrak TEXT,
    invoice TEXT,
    drive_link TEXT,
    ba TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Subkegiatan table
CREATE TABLE IF NOT EXISTS subkegiatan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subkegiatan TEXT NOT NULL,
    ppk TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bidang table
CREATE TABLE IF NOT EXISTS bidang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_bidang TEXT NOT NULL,
    kode_bidang TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    message TEXT NOT NULL,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add subkegiatan_id column to orders table

ALTER TABLE orders ADD COLUMN subkegiatan_id INTEGER REFERENCES subkegiatan(id);

-- Add extended order detail columns
ALTER TABLE orders ADD COLUMN paket TEXT;
ALTER TABLE orders ADD COLUMN kontrak TEXT;
ALTER TABLE orders ADD COLUMN invoice TEXT;
ALTER TABLE orders ADD COLUMN drive_link TEXT;
ALTER TABLE orders ADD COLUMN ba TEXT;

-- Backfill defaults for existing orders
UPDATE orders SET paket = '{"id_paket":"","no_surat_pesanan":""}' WHERE paket IS NULL;
UPDATE orders SET kontrak = '[]' WHERE kontrak IS NULL;
UPDATE orders SET invoice = '[]' WHERE invoice IS NULL;
UPDATE orders SET drive_link = '' WHERE drive_link IS NULL;
UPDATE orders SET ba = '[]' WHERE ba IS NULL;

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    action TEXT NOT NULL,
    user_id INTEGER,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bidang_nama ON bidang(nama_bidang);
CREATE INDEX IF NOT EXISTS idx_bidang_kode ON bidang(kode_bidang);


-- Insert default admin user (password: admin - will be hashed)
-- NOTE: Hash the password 'admin' with SHA-256 in production
INSERT INTO users (email, password_hash, name, role, status) 
VALUES ('admin@dlh.com', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Administrator', 'admin', 'active');

-- Sample vendors
INSERT INTO vendors (name, npwp, email, phone, status) VALUES
('ALIMAH KATERING', '12.345.678.9-123.000', 'alimah@katering.com', '081234567890', 'active'),
('CV MAJU JAYA', '23.456.789.0-234.000', 'majujaya@example.com', '081234567891', 'active'),
('PT SEJAHTERA ABADI', '34.567.890.1-345.000', 'sehaterabadi@example.com', '081234567892', 'active');
