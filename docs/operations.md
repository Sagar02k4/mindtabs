# MindTabs operations runbook

## Release checks

Run from the repository root:

```bash
npm ci
npm run check
npm --prefix WebAuthPortal ci
npm --prefix WebAuthPortal run lint
npm --prefix WebAuthPortal run build
npm audit --audit-level=high
```

## Supabase changes

Apply `supabase_schema.sql` in a controlled environment. The policy statements are rerunnable, but production changes should still be reviewed and backed up first. Verify RLS is enabled on both `tabs` and `reminders`.

## Sync incident

1. Confirm the local dashboard still shows the user's records.
2. Export an encrypted backup.
3. Check the displayed sync error and Supabase logs.
4. Confirm the authenticated user's ID and RLS policies.
5. Retry sync only after the service is healthy.

## Reminder incident

Check Chrome extension service-worker errors, stored pending reminders, and `chrome://extensions` reload state. Restarting the extension invokes alarm restoration for every future pending reminder.
