-- ------------------------------------------------------------
-- Personal Accountant multi-tenant schema for Supabase
-- ------------------------------------------------------------
-- Run this script inside the Supabase SQL editor to rebuild the
-- schema with Row Level Security and user-specific isolation.
-- ------------------------------------------------------------

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

drop function if exists auth.auto_confirm_internal_user();
create or replace function public.auto_confirm_internal_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

begin;

-- Drop dependent views first.
drop view if exists group_paid_totals;

-- Drop tables in reverse dependency order.
drop table if exists payments cascade;
drop table if exists expenses cascade;
drop table if exists guest_codes cascade;
drop table if exists settings cascade;
drop table if exists students cascade;
drop table if exists groups cascade;
drop table if exists users cascade;

-- Ensure pseudo-email accounts are auto confirmed
drop trigger if exists auto_confirm_internal_user on auth.users;
create trigger auto_confirm_internal_user
before insert on auth.users
for each row
execute function public.auto_confirm_internal_user();

update auth.users
set email_confirmed_at = now(),
    confirmed_at = coalesce(confirmed_at, now())
where email like '%@smart-accountant.local'
  and (email_confirmed_at is null or confirmed_at is null);

-- -----------------------------------------------------------------
-- Users profile table (mirrors auth.users with additional metadata)
-- -----------------------------------------------------------------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated
before update on users
for each row
execute function set_updated_at();

-- -----------------------------------------------------------------
-- Groups represent classes or cohorts (scoped per user)
-- -----------------------------------------------------------------
create table groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  description text,
  due_total numeric(12,2) not null default 0 check (due_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger groups_set_updated
before update on groups
for each row
execute function set_updated_at();

create unique index if not exists idx_groups_user_name on groups(user_id, name);
create index if not exists idx_groups_user on groups(user_id);

-- -----------------------------------------------------------------
-- Students optionally belong to a group (scoped per user)
-- -----------------------------------------------------------------
create table students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  full_name text not null,
  phone text,
  group_id uuid references groups(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_unique_per_user unique (user_id, full_name, coalesce(phone, ''))
);

create trigger students_set_updated
before update on students
for each row
execute function set_updated_at();

create index if not exists idx_students_user on students(user_id);
create index if not exists idx_students_group on students(group_id);

-- -----------------------------------------------------------------
-- Payments can be tied to a student, a group، أو الاثنين معًا
-- -----------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  student_id uuid references students(id) on delete set null,
  group_id uuid references groups(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('cash', 'card', 'transfer')),
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger payments_set_updated
before update on payments
for each row
execute function set_updated_at();

create index if not exists idx_payments_user on payments(user_id);
create index if not exists idx_payments_student on payments(student_id);
create index if not exists idx_payments_group on payments(group_id);
create index if not exists idx_payments_paid_at on payments(paid_at);

-- -----------------------------------------------------------------
-- Expenses table for outgoing money (scoped per user)
-- -----------------------------------------------------------------
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  spent_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger expenses_set_updated
before update on expenses
for each row
execute function set_updated_at();

create index if not exists idx_expenses_user on expenses(user_id);
create index if not exists idx_expenses_spent_at on expenses(spent_at);

-- -----------------------------------------------------------------
-- Guest codes (each tutor can issue their own)
-- -----------------------------------------------------------------
create table guest_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  code text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint guest_codes_unique_per_user unique (user_id, code)
);

create trigger guest_codes_set_updated
before update on guest_codes
for each row
execute function set_updated_at();

create index if not exists idx_guest_codes_user on guest_codes(user_id);
create index if not exists idx_guest_codes_active on guest_codes(active);

-- -----------------------------------------------------------------
-- User-specific settings
-- -----------------------------------------------------------------
create table settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reminder_days integer not null default 3 check (reminder_days >= 0),
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated
before update on settings
for each row
execute function set_updated_at();

-- -----------------------------------------------------------------
-- Aggregated view for paid totals per group (scoped per user)
-- -----------------------------------------------------------------
create or replace view group_paid_totals as
select
  g.user_id,
  g.id as group_id,
  coalesce(sum(p.amount), 0)::numeric(12,2) as paid_total
from groups g
left join payments p on p.group_id = g.id and p.user_id = g.user_id
group by g.user_id, g.id;

-- -----------------------------------------------------------------
-- Row Level Security policies (owner-only)
-- -----------------------------------------------------------------
alter table users enable row level security;
alter table groups enable row level security;
alter table students enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table guest_codes enable row level security;
alter table settings enable row level security;

-- Users table: owners only
create policy users_select_self on users for select using (id = auth.uid());
create policy users_insert_self on users for insert with check (id = auth.uid());
create policy users_update_self on users for update using (id = auth.uid()) with check (id = auth.uid());
create policy users_delete_self on users for delete using (id = auth.uid());

-- Groups
create policy groups_owner_select on groups for select using (user_id = auth.uid());
create policy groups_owner_insert on groups for insert with check (user_id = auth.uid());
create policy groups_owner_update on groups for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy groups_owner_delete on groups for delete using (user_id = auth.uid());

-- Students
create policy students_owner_select on students for select using (user_id = auth.uid());
create policy students_owner_insert on students for insert with check (user_id = auth.uid());
create policy students_owner_update on students for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy students_owner_delete on students for delete using (user_id = auth.uid());

-- Payments
create policy payments_owner_select on payments for select using (user_id = auth.uid());
create policy payments_owner_insert on payments for insert with check (user_id = auth.uid());
create policy payments_owner_update on payments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy payments_owner_delete on payments for delete using (user_id = auth.uid());

-- Expenses
create policy expenses_owner_select on expenses for select using (user_id = auth.uid());
create policy expenses_owner_insert on expenses for insert with check (user_id = auth.uid());
create policy expenses_owner_update on expenses for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy expenses_owner_delete on expenses for delete using (user_id = auth.uid());

-- Guest codes (owner policies + read-only verification for anonymous guests)
create policy guest_codes_owner_select on guest_codes for select to authenticated using (user_id = auth.uid());
create policy guest_codes_owner_mutation on guest_codes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy guest_codes_verify_active on guest_codes for select to anon using (active);

-- Settings
create policy settings_owner_select on settings for select using (user_id = auth.uid());
create policy settings_owner_upsert on settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;
