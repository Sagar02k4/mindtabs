# MindTabs operations runbook

## Release checks

Run from the repository root:

```bash
npm ci
npm run check
npm --prefix WebAuthPortal ci
npm --prefix WebAuthPortal run lint
npm --prefix WebAuthPortal run build
npm audit --omit=dev --audit-level=high
npm audit --audit-level=high || true # report development-only advisories without blocking the release gate
```

## Supabase changes

Apply `supabase_schema.sql` in a controlled environment. The policy statements are rerunnable, but production changes should still be reviewed and backed up first. Verify RLS is enabled on both `tabs` and `reminders`.

After applying the schema, verify the database protections before enabling cloud sync:

```sql
select relname, relrowsecurity
from pg_class
where relname in ('tabs', 'reminders');

select tgname
from pg_trigger
where tgname = 'reminders_tab_owner_trigger';
```

The migration adds same-user reminder ownership enforcement, rejects non-web tab URLs, restricts recurrence values to `daily`/`weekly`, and requires positive reminder timestamps. If an existing database contains rows that violate these constraints, clean them through a reviewed migration before retrying; do not disable the constraints to force deployment.

## Sync incident

1. Confirm the local dashboard still shows the user's records.
2. Export an encrypted backup.
3. Check the displayed sync error and Supabase logs.
4. Confirm the authenticated user's ID and RLS policies.
5. Retry sync only after the service is healthy.

## Reminder incident

Check Chrome extension service-worker errors, stored pending reminders, and `chrome://extensions` reload state. Restarting the extension invokes alarm restoration for every future pending reminder.
