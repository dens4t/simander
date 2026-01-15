-- Create bidang table
CREATE TABLE IF NOT EXISTS bidang (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_bidang TEXT NOT NULL,
  kode_bidang TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bidang_nama ON bidang(nama_bidang);
CREATE INDEX IF NOT EXISTS idx_bidang_kode ON bidang(kode_bidang);
