-- Free-tier user cap: signups beyond the active-user cap wait in line.
-- Kept in its own migration: a new enum value cannot be used in the transaction that adds it.
alter type public.account_status add value if not exists 'WAITLISTED';
