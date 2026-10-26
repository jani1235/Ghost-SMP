CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, minecraft TEXT NOT NULL, discord TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created TEXT NOT NULL, reviewer TEXT, reviewed TEXT);
CREATE INDEX IF NOT EXISTS idx_status ON applications(status);
