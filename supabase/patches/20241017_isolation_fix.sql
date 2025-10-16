-- ------------------------------------------------------------------
-- Multitenant isolation + auto confirm helper patch for Supabase SQL
-- ------------------------------------------------------------------
-- Run this script inside the Supabase SQL editor. It is idempotent and
-- ensures that every finance table is scoped by user_id, that RLS
-- policies restrict access to the authenticated owner, and that
-- pseudo-email accounts created from phone numbers are auto confirmed.
-- ------------------------------------------------------------------

begin;

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create or replace function auth.auto_confirm_internal_user()
returns trigger
language plpgsql
security definer
set search_path = auth
as $$
begin
  if new.email like '%@smart-accountant.local' then
    if new.email_confirmed_at is null then
      new.email_confirmed_at := now();
    end if;
    if new.confirmed_at is null then
      new.confirmed_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists auto_confirm_internal_user on auth.users;
create trigger auto_confirm_internal_user
before insert on auth.users
for each row
execute function auth.auto_confirm_internal_user();

update auth.users
set email_confirmed_at = now(),
    confirmed_at = coalesce(confirmed_at, now())
where email like '%@smart-accountant.local'
  and (email_confirmed_at is null or confirmed_at is null);

-- --------------------------------------------------------------
-- Ensure primary domain tables contain user_id + indices
-- --------------------------------------------------------------
alter table if exists groups
  add column if not exists user_id uuid not null default auth.uid(),
  add column if not exists due_total numeric(12,2) not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists students
  add column if not exists user_id uuid not null default auth.uid(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists payments
  add column if not exists user_id uuid not null default auth.uid(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists method text not null default 'cash',
  add column if not exists paid_at date not null default current_date;

alter table if exists expenses
  add column if not exists user_id uuid not null default auth.uid(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists guest_codes
  add column if not exists user_id uuid not null default auth.uid(),
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists settings
  add column if not exists reminder_days integer not null default 3,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_groups_user on groups(user_id);
create index if not exists idx_students_user on students(user_id);
create index if not exists idx_payments_user on payments(user_id);
create index if not exists idx_expenses_user on expenses(user_id);
create index if not exists idx_guest_codes_user on guest_codes(user_id);

-- --------------------------------------------------------------
-- Keep paid totals view aligned with multitenancy
-- --------------------------------------------------------------
create or replace view group_paid_totals as
select
  g.user_id,
  g.id as group_id,
  coalesce(sum(p.amount), 0)::numeric(12,2) as paid_total
from groups g
left join payments p on p.group_id = g.id and p.user_id = g.user_id
group by g.user_id, g.id;

-- --------------------------------------------------------------
-- Row level security: owner only
-- --------------------------------------------------------------
alter table if exists users       enable row level security;
alter table if exists groups      enable row level security;
alter table if exists students    enable row level security;
alter table if exists payments    enable row level security;
alter table if exists expenses    enable row level security;
alter table if exists guest_codes enable row level security;
alter table if exists settings    enable row level security;

drop policy if exists users_select_self on users;
drop policy if exists users_insert_self on users;
drop policy if exists users_update_self on users;
drop policy if exists users_delete_self on users;
create policy users_select_self on users for select using (id = auth.uid());
create policy users_insert_self on users for insert with check (id = auth.uid());
create policy users_update_self on users for update using (id = auth.uid()) with check (id = auth.uid());
create policy users_delete_self on users for delete using (id = auth.uid());

drop policy if exists groups_owner_select on groups;
drop policy if exists groups_owner_insert on groups;
drop policy if exists groups_owner_update on groups;
drop policy if exists groups_owner_delete on groups;
create policy groups_owner_select on groups for select using (user_id = auth.uid());
create policy groups_owner_insert on groups for insert with check (user_id = auth.uid());
create policy groups_owner_update on groups for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy groups_owner_delete on groups for delete using (user_id = auth.uid());

drop policy if exists students_owner_select on students;
drop policy if exists students_owner_insert on students;
drop policy if exists students_owner_update on students;
drop policy if exists students_owner_delete on students;
create policy students_owner_select on students for select using (user_id = auth.uid());
create policy students_owner_insert on students for insert with check (user_id = auth.uid());
create policy students_owner_update on students for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy students_owner_delete on students for delete using (user_id = auth.uid());

drop policy if exists payments_owner_select on payments;
drop policy if exists payments_owner_insert on payments;
drop policy if exists payments_owner_update on payments;
drop policy if exists payments_owner_delete on payments;
create policy payments_owner_select on payments for select using (user_id = auth.uid());
create policy payments_owner_insert on payments for insert with check (user_id = auth.uid());
create policy payments_owner_update on payments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy payments_owner_delete on payments for delete using (user_id = auth.uid());

drop policy if exists expenses_owner_select on expenses;
drop policy if exists expenses_owner_insert on expenses;
drop policy if exists expenses_owner_update on expenses;
drop policy if exists expenses_owner_delete on expenses;
create policy expenses_owner_select on expenses for select using (user_id = auth.uid());
create policy expenses_owner_insert on expenses for insert with check (user_id = auth.uid());
create policy expenses_owner_update on expenses for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy expenses_owner_delete on expenses for delete using (user_id = auth.uid());

drop policy if exists guest_codes_owner_select on guest_codes;
drop policy if exists guest_codes_owner_mutation on guest_codes;
drop policy if exists guest_codes_verify_active on guest_codes;
create policy guest_codes_owner_select on guest_codes for select to authenticated using (user_id = auth.uid());
create policy guest_codes_owner_mutation on guest_codes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy guest_codes_verify_active on guest_codes for select to anon using (active);

drop policy if exists settings_owner_select on settings;
drop policy if exists settings_owner_upsert on settings;
create policy settings_owner_select on settings for select using (user_id = auth.uid());
create policy settings_owner_upsert on settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;
