-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MindTabs — Supabase Database Schema                           ║
-- ╚══════════════════════════════════════════════════════════════════╝


-- ─── Tabs Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tabs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  url TEXT,
  favicon TEXT,
  tag TEXT,
  created_at BIGINT NOT NULL,
  last_visited BIGINT
);

CREATE INDEX IF NOT EXISTS idx_tabs_user_id ON tabs(user_id);
CREATE INDEX IF NOT EXISTS idx_tabs_user_last_visited ON tabs(user_id, last_visited DESC);

-- ─── Reminders Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_id TEXT REFERENCES tabs(id) ON DELETE CASCADE,
  remind_at BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_tab_id ON reminders(tab_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_status ON reminders(user_id, status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reminders_status_check'
  ) THEN
    ALTER TABLE reminders
      ADD CONSTRAINT reminders_status_check
      CHECK (status IN ('pending', 'completed', 'cancelled'));
  END IF;
END $$;

-- ─── Row Level Security ─────────────────────────────────────────
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Users can only CRUD their own tabs
CREATE POLICY "Users can select own tabs"
  ON tabs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tabs"
  ON tabs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tabs"
  ON tabs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tabs"
  ON tabs FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only CRUD their own reminders
CREATE POLICY "Users can select own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON reminders FOR DELETE
  USING (auth.uid() = user_id);
