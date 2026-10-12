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
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  last_visited BIGINT
  ,updated_at BIGINT
  ,tag_updated_at BIGINT
  ,archive_updated_at BIGINT
  ,deleted_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_tabs_user_id ON tabs(user_id);
CREATE INDEX IF NOT EXISTS idx_tabs_user_last_visited ON tabs(user_id, last_visited DESC);
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS tag_updated_at BIGINT;
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS archive_updated_at BIGINT;
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS deleted_at BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tabs_url_http_check') THEN
    ALTER TABLE tabs ADD CONSTRAINT tabs_url_http_check
      CHECK (url IS NULL OR url ~* '^https?://');
  END IF;
END $$;

-- ─── Reminders Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_id TEXT REFERENCES tabs(id) ON DELETE CASCADE,
  remind_at BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL
  ,updated_at BIGINT
  ,repeat TEXT
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_tab_id ON reminders(tab_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_status ON reminders(user_id, status);
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS repeat TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_repeat_check') THEN
    ALTER TABLE reminders ADD CONSTRAINT reminders_repeat_check
      CHECK (repeat IS NULL OR repeat IN ('daily', 'weekly'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_remind_at_positive_check') THEN
    ALTER TABLE reminders ADD CONSTRAINT reminders_remind_at_positive_check
      CHECK (remind_at > 0);
  END IF;
END $$;

-- Prevent a user from attaching a reminder to another user's tab. RLS on the
-- reminder row alone is insufficient because tab_id is an independent value.
CREATE OR REPLACE FUNCTION public.ensure_reminder_tab_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tab_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tabs
    WHERE tabs.id = NEW.tab_id AND tabs.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Reminder tab does not belong to the authenticated user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reminders_tab_owner_trigger ON reminders;
CREATE TRIGGER reminders_tab_owner_trigger
  BEFORE INSERT OR UPDATE OF tab_id, user_id ON reminders
  FOR EACH ROW EXECUTE FUNCTION public.ensure_reminder_tab_owner();

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

-- Users can only CRUD their own tabs. Policies are recreated safely on reruns.
DROP POLICY IF EXISTS "Users can select own tabs" ON tabs;
CREATE POLICY "Users can select own tabs" ON tabs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own tabs" ON tabs;
CREATE POLICY "Users can insert own tabs" ON tabs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own tabs" ON tabs;
CREATE POLICY "Users can update own tabs" ON tabs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own tabs" ON tabs;
CREATE POLICY "Users can delete own tabs" ON tabs FOR DELETE USING (auth.uid() = user_id);

-- Users can only CRUD their own reminders
DROP POLICY IF EXISTS "Users can select own reminders" ON reminders;
CREATE POLICY "Users can select own reminders" ON reminders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own reminders" ON reminders;
CREATE POLICY "Users can insert own reminders" ON reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own reminders" ON reminders;
CREATE POLICY "Users can update own reminders" ON reminders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own reminders" ON reminders;
CREATE POLICY "Users can delete own reminders" ON reminders FOR DELETE USING (auth.uid() = user_id);
