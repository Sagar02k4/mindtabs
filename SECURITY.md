# Security and privacy

MindTabs handles browsing metadata, including page URLs, titles, tags, archive state, and reminder times.

## Data handling

- Tracking is opt-in during onboarding.
- Users can pause tracking and block domains from the dashboard.
- Incognito tabs and browser-internal pages are excluded.
- Only `http` and `https` URLs are accepted.
- Local records are stored in Chrome extension storage.
- Signed-in users may sync records to their configured Supabase project.
- RLS policies restrict cloud records to the authenticated owner.

## Backups

Plain JSON and CSV exports contain browsing history and should be treated as sensitive files. Use encrypted backup export when sharing or storing a backup outside the device. Encrypted backups use PBKDF2-SHA256 key derivation and AES-GCM authenticated encryption. Passwords are never stored by MindTabs.

## Incident recovery

If cloud sync fails, local data remains available and the dashboard displays the failure. Sync retries temporary failures and uses deletion tombstones to prevent a later device from resurrecting or silently deleting records. If data appears incorrect, stop syncing, export an encrypted backup, and inspect the Supabase Auth and database logs before retrying.

## Reporting

Do not include URLs, access tokens, refresh tokens, service-role keys, or backup files in bug reports. Report security issues privately to the repository maintainers rather than opening a public issue.
