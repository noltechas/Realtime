-- One-time N-Word Pass gifts.
--
-- `karaoke_guests.white_person_check` remains the compatibility source for a
-- permanent pass: FALSE means the host has granted the guest a permanent pass.
-- This ledger stores only temporary gifts so granting or consuming one never
-- mutates the host-controlled entitlement.

create table public.karaoke_nword_pass_gifts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.karaoke_sessions(id) on delete cascade,
  -- Intentionally not an FK: removing the giver from the lobby must not erase
  -- or invalidate a pass already received. The INSERT trigger validates the
  -- guest and the immutable snapshot preserves provenance afterward.
  giver_guest_id uuid not null,
  recipient_guest_id uuid not null references public.karaoke_guests(id) on delete cascade,
  giver_name_snapshot text not null default '',
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  seen_at timestamptz,
  used_at timestamptz,
  used_turn_id text,
  used_track_id text,
  used_track_name text,
  revoked_at timestamptz,
  revoked_reason text,
  constraint karaoke_nword_pass_gifts_not_self
    check (giver_guest_id <> recipient_guest_id),
  constraint karaoke_nword_pass_gifts_terminal_state
    check (not (used_at is not null and revoked_at is not null)),
  constraint karaoke_nword_pass_gifts_usage_metadata
    check (
      (used_at is null and used_turn_id is null and used_track_id is null and used_track_name is null)
      or
      (used_at is not null and used_turn_id is not null and used_track_id is not null)
    )
);

comment on table public.karaoke_nword_pass_gifts is
  'Auditable one-time N-Word Pass gifts. Pending gifts have neither used_at nor revoked_at.';

create unique index karaoke_nword_pass_gifts_one_pending_per_recipient
  on public.karaoke_nword_pass_gifts (session_id, recipient_guest_id)
  where used_at is null and revoked_at is null;

create index karaoke_nword_pass_gifts_recipient_created
  on public.karaoke_nword_pass_gifts (recipient_guest_id, created_at desc);

create index karaoke_nword_pass_gifts_session_created
  on public.karaoke_nword_pass_gifts (session_id, created_at desc);

-- Snapshot the host-approved giver name and reject forged/invalid pairings at
-- the database boundary. The app has session-scoped guest identities rather
-- than Supabase Auth accounts, so the session code remains the access boundary
-- just as it is for the existing queue and guest tables.
create function public.prepare_nword_pass_gift()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  giver public.karaoke_guests%rowtype;
  recipient public.karaoke_guests%rowtype;
begin
  select * into giver
  from public.karaoke_guests
  where id = new.giver_guest_id;

  select * into recipient
  from public.karaoke_guests
  where id = new.recipient_guest_id;

  if giver.id is null or recipient.id is null then
    raise exception 'Both guests must still be in the lobby';
  end if;
  if giver.session_id <> new.session_id or recipient.session_id <> new.session_id then
    raise exception 'Both guests must belong to the selected session';
  end if;
  if giver.id = recipient.id then
    raise exception 'A guest cannot gift a pass to themselves';
  end if;
  if giver.white_person_check is not false then
    raise exception 'Only a guest with a permanent N-Word Pass can share one';
  end if;
  if recipient.white_person_check is false then
    raise exception 'The recipient already has a permanent N-Word Pass';
  end if;

  new.giver_name_snapshot := giver.name;
  return new;
end;
$$;

create trigger prepare_nword_pass_gift_before_insert
before insert on public.karaoke_nword_pass_gifts
for each row execute function public.prepare_nword_pass_gift();

-- Identity fields and terminal states are append-only. Clients may acknowledge
-- a gift, the notification function may stamp it, the desktop may consume it,
-- and the host may revoke it, but nobody can rewrite its provenance or reuse it.
create function public.protect_nword_pass_gift_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.session_id <> old.session_id
    or new.giver_guest_id is distinct from old.giver_guest_id
    or new.recipient_guest_id <> old.recipient_guest_id
    or new.giver_name_snapshot <> old.giver_name_snapshot
    or new.created_at <> old.created_at
  then
    raise exception 'N-Word Pass gift identity is immutable';
  end if;

  if old.seen_at is not null and new.seen_at is distinct from old.seen_at then
    raise exception 'A seen gift cannot be marked unseen';
  end if;
  if old.notified_at is not null and new.notified_at is distinct from old.notified_at then
    raise exception 'A notified gift cannot be marked unnotified';
  end if;
  if new.notified_at is distinct from old.notified_at and current_user <> 'service_role' then
    raise exception 'Only the notification service can stamp delivery';
  end if;
  if old.used_at is not null and (
    new.used_at is distinct from old.used_at
    or new.used_turn_id is distinct from old.used_turn_id
    or new.used_track_id is distinct from old.used_track_id
    or new.used_track_name is distinct from old.used_track_name
  ) then
    raise exception 'A consumed gift cannot be reused';
  end if;
  if old.revoked_at is not null and (
    new.revoked_at is distinct from old.revoked_at
    or new.revoked_reason is distinct from old.revoked_reason
  ) then
    raise exception 'A revoked gift cannot be restored';
  end if;

  return new;
end;
$$;

create trigger protect_nword_pass_gift_before_update
before update on public.karaoke_nword_pass_gifts
for each row execute function public.protect_nword_pass_gift_update();

alter table public.karaoke_nword_pass_gifts enable row level security;

create policy "session clients can read nword pass gifts"
on public.karaoke_nword_pass_gifts
for select
to anon, authenticated
using (true);

create policy "permanent pass holders can create nword pass gifts"
on public.karaoke_nword_pass_gifts
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.karaoke_guests giver
    where giver.id = karaoke_nword_pass_gifts.giver_guest_id
      and giver.session_id = karaoke_nword_pass_gifts.session_id
      and giver.white_person_check is false
  )
  and exists (
    select 1
    from public.karaoke_guests recipient
    where recipient.id = karaoke_nword_pass_gifts.recipient_guest_id
      and recipient.session_id = karaoke_nword_pass_gifts.session_id
      and recipient.white_person_check is not false
  )
);

create policy "session clients can acknowledge or consume nword pass gifts"
on public.karaoke_nword_pass_gifts
for update
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on public.karaoke_nword_pass_gifts to anon, authenticated, service_role;

-- Trigger functions are not public RPC endpoints.
revoke execute on function public.prepare_nword_pass_gift() from public, anon, authenticated;
revoke execute on function public.protect_nword_pass_gift_update() from public, anon, authenticated;

alter publication supabase_realtime add table public.karaoke_nword_pass_gifts;
