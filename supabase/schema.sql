-- Stag Tracker — Supabase schema
-- Run this once in the Supabase SQL editor (or `supabase db reset` if using the CLI).

-- ---------- tickets ----------
create table if not exists public.tickets (
  ticket_number   text        primary key,           -- 3-digit, zero-padded e.g. '001'
  name            text        not null,
  phone_number    text        not null,
  paid            boolean     not null default false,
  checked_in      boolean     not null default false,
  expected        boolean     not null default true,
  paid_at         timestamptz,
  checked_in_at   timestamptz,
  created_by      text,                              -- email of staff who added the ticket
  paid_by         text,                              -- email of staff who recorded payment
  checked_in_by   text,                              -- email of staff who checked the guest in
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- For projects that ran an earlier version of this schema:
alter table public.tickets add column if not exists created_by    text;
alter table public.tickets add column if not exists paid_by       text;
alter table public.tickets add column if not exists checked_in_by text;

create index if not exists tickets_phone_number_idx on public.tickets (phone_number);
create index if not exists tickets_name_idx         on public.tickets (lower(name));
create index if not exists tickets_checked_in_idx   on public.tickets (checked_in_at desc);

-- Touch updated_at automatically.
create or replace function public.tickets_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.tickets_set_updated_at();

-- ---------- Row Level Security ----------
alter table public.tickets enable row level security;

-- Any authenticated user (admin or staff) may read & mutate tickets.
-- The single-admin distinction is enforced in the UI only.
drop policy if exists "tickets read for authenticated"   on public.tickets;
drop policy if exists "tickets insert for authenticated" on public.tickets;
drop policy if exists "tickets update for authenticated" on public.tickets;
drop policy if exists "tickets delete for authenticated" on public.tickets;

create policy "tickets read for authenticated"
  on public.tickets for select
  to authenticated
  using (true);

create policy "tickets insert for authenticated"
  on public.tickets for insert
  to authenticated
  with check (true);

create policy "tickets update for authenticated"
  on public.tickets for update
  to authenticated
  using (true) with check (true);

create policy "tickets delete for authenticated"
  on public.tickets for delete
  to authenticated
  using (true);

-- ---------- ticket_holders (admin-only) ----------
-- Tracks which staff member is physically holding which ticket numbers.
-- Only the single admin (matched by email on the JWT) may read or write.
create table if not exists public.ticket_holders (
  id              uuid        primary key default gen_random_uuid(),
  holder_email    text        not null,
  range_start     text        not null,           -- inclusive, zero-padded e.g. '001'
  range_end       text        not null,           -- inclusive
  notes           text,
  assigned_by     text,                            -- admin email that created the row
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (length(range_start) > 0 and length(range_end) > 0),
  check (range_start <= range_end)
);

create index if not exists ticket_holders_holder_idx on public.ticket_holders (lower(holder_email));
create index if not exists ticket_holders_range_idx  on public.ticket_holders (range_start, range_end);

drop trigger if exists ticket_holders_set_updated_at on public.ticket_holders;
create trigger ticket_holders_set_updated_at
  before update on public.ticket_holders
  for each row execute function public.tickets_set_updated_at();

alter table public.ticket_holders enable row level security;

-- IMPORTANT: replace the email below with your admin email if it differs.
-- It must match VITE_ADMIN_EMAIL in the client .env (case-insensitive).
drop policy if exists "ticket_holders admin select" on public.ticket_holders;
drop policy if exists "ticket_holders self select"  on public.ticket_holders;
drop policy if exists "ticket_holders admin insert" on public.ticket_holders;
drop policy if exists "ticket_holders admin update" on public.ticket_holders;
drop policy if exists "ticket_holders admin delete" on public.ticket_holders;

create policy "ticket_holders admin select"
  on public.ticket_holders for select
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'n.krilis@icloud.com');

-- Staff may read only their OWN assignments (used by the ticket-entry form
-- to validate that a staff member is only adding tickets in their range).
create policy "ticket_holders self select"
  on public.ticket_holders for select
  to authenticated
  using (lower(holder_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "ticket_holders admin insert"
  on public.ticket_holders for insert
  to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'n.krilis@icloud.com');

create policy "ticket_holders admin update"
  on public.ticket_holders for update
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'n.krilis@icloud.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'n.krilis@icloud.com');

create policy "ticket_holders admin delete"
  on public.ticket_holders for delete
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'n.krilis@icloud.com');

-- ---------- Admin helper: list app users ----------
-- The anon/authenticated client cannot read auth.users directly, so we
-- expose a SECURITY DEFINER function that returns user emails ONLY when
-- the caller is the admin. The TicketHolders admin UI calls this via
-- supabase.rpc('list_app_users') to populate a dropdown of holder emails.
create or replace function public.list_app_users()
returns table (email text)
language sql
security definer
set search_path = public, auth
as $$
  select u.email::text
  from auth.users u
  where lower(coalesce(auth.jwt() ->> 'email', '')) = 'n.krilis@icloud.com'
    and u.email is not null
  order by u.email;
$$;

revoke all on function public.list_app_users() from public;
grant execute on function public.list_app_users() to authenticated;

-- ---------- Auth notes ----------
-- 1. In Supabase Dashboard -> Authentication -> Providers, ensure "Email" is
--    enabled and "Confirm email" is set to your preference.
-- 2. In Authentication -> Sign In / Up, DISABLE public sign-ups
--    ("Allow new users to sign up" = off).
-- 3. Invite users via Authentication -> Users -> "Invite user" (or create
--    them manually with a temporary password).
