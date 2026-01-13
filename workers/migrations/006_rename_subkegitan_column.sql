-- Rename column subkegitan -> subkegiatan
-- SQLite doesn't support rename column directly; recreate table

PRAGMA foreign_keys=off;

ALTER TABLE subkegiatan RENAME TO subkegiatan_old;

CREATE TABLE subkegiatan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subkegiatan TEXT NOT NULL,
  ppk TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  updated_at TEXT
);

INSERT INTO subkegiatan (id, subkegiatan, ppk, status, created_at, updated_at)
SELECT id,
       COALESCE(subkegiatan, subkegitan),
       ppk,
       status,
       created_at,
       updated_at
FROM subkegiatan_old;

DROP TABLE subkegiatan_old;

PRAGMA foreign_keys=on;
