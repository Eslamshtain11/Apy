-- ------------------------------------------------------------
-- Personal Accountant app schema setup for Supabase (Postgres)
-- ------------------------------------------------------------
-- This script resets the core tables, recreates constraints,
-- indexes, and sample data required for the web application.
-- Run inside the Supabase SQL editor.

-- Enable required extensions for UUID generation.
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

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

-- Users table stores account owners (tutors).
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  password text not null,
  created_at timestamptz not null default now()
);

-- Groups represent classes or cohorts.
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  due_total numeric(12,2) not null default 0 check (due_total >= 0),
  created_at timestamptz not null default now(),
  constraint groups_name_unique unique (name)
);

-- Students optionally belong to a group.
create table students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  group_id uuid references groups(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint students_full_name_phone_unique unique (full_name, phone)
);

create index students_group_id_idx on students(group_id);

-- Payments can be tied to a student, a group, or both.
create table payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete set null,
  group_id uuid references groups(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('cash', 'card', 'transfer')),
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index payments_group_id_idx on payments(group_id);
create index payments_student_id_idx on payments(student_id);
create index payments_paid_at_idx on payments(paid_at);

-- Expenses table for outgoing money.
create table expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- Guest codes give temporary read-only access.
create table guest_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- User-specific settings (e.g., reminder days).
create table settings (
  user_id uuid primary key references users(id) on delete cascade,
  reminder_days integer not null default 3 check (reminder_days >= 0),
  updated_at timestamptz not null default now()
);

-- View summarizing total paid per group.
create or replace view group_paid_totals as
select
  g.id as group_id,
  coalesce(sum(p.amount), 0)::numeric(12,2) as paid_total
from groups g
left join payments p on p.group_id = g.id
 group by g.id;

-- ------------------------------------------------------------
-- Seed data for testing and to keep the UI functional out of
-- the box. Adjust or remove in production.
-- ------------------------------------------------------------

-- Create a default tutor.
insert into users (name, phone, password)
values ('أ. محمود السيد', '01000000000', '$2a$10$samplehashforlocaldev')
on conflict (phone) do update set name = excluded.name;

-- Insert groups with target dues.
insert into groups (name, description, due_total)
values
  ('مجموعة الفيزياء - ثالثة ثانوي', 'حصص أسبوعية للفيزياء', 12000.00),
  ('مجموعة الرياضيات - ثانية ثانوي', 'مراجعات رياضيات مكثفة', 9500.00),
  ('مجموعة الكيمياء - ثالثة ثانوي', 'تحضير للثانوية العامة', 8400.00)
on conflict (name) do update set
  description = excluded.description,
  due_total = excluded.due_total;

-- Insert students linked to groups.
insert into students (full_name, phone, group_id)
select 'أحمد علي', '01012345678', id from groups where name = 'مجموعة الفيزياء - ثالثة ثانوي'
union all
select 'سارة محمد', '01098765432', id from groups where name = 'مجموعة الفيزياء - ثالثة ثانوي'
union all
select 'محمود حسن', '01112312345', id from groups where name = 'مجموعة الرياضيات - ثانية ثانوي'
union all
select 'إيمان فؤاد', '01234567890', id from groups where name = 'مجموعة الكيمياء - ثالثة ثانوي'
union all
select 'يوسف خالد', null, id from groups where name = 'مجموعة الرياضيات - ثانية ثانوي'
union all
select 'ملك عمرو', '01055577889', id from groups where name = 'مجموعة الفيزياء - ثالثة ثانوي'
union all
select 'هدى عصام', '01066554432', id from groups where name = 'مجموعة الكيمياء - ثالثة ثانوي'
on conflict (full_name, phone) do update set group_id = excluded.group_id;

-- Seed sample payments (student-level and group-level).
insert into payments (student_id, group_id, amount, method, paid_at, note)
select s.id, s.group_id, 1500.00, 'cash', current_date - 10, 'دفعة شهر مارس'
from students s where s.full_name = 'أحمد علي'
union all
select s.id, s.group_id, 1500.00, 'transfer', current_date - 5, 'دفعة شهر مارس'
from students s where s.full_name = 'سارة محمد';

insert into payments (group_id, amount, method, paid_at, note)
select g.id, 3200.00, 'card', current_date - 2, 'دفعة جماعية'
from groups g where g.name = 'مجموعة الرياضيات - ثانية ثانوي'
union all
select g.id, 2500.00, 'cash', current_date - 1, 'دفعة جزء من المستحقات'
from groups g where g.name = 'مجموعة الكيمياء - ثالثة ثانوي';

-- Seed expenses.
insert into expenses (description, amount, spent_at)
values
  ('إيجار القاعة', 4000.00, current_date - 20),
  ('أدوات تعليمية', 1200.00, current_date - 15),
  ('إعلانات ممولة', 1800.00, current_date - 3);

-- Guest code sample.
insert into guest_codes (code, active)
values ('GUEST-12345', true)
on conflict (code) do update set active = excluded.active;

-- Default settings for the user.
insert into settings (user_id, reminder_days)
select id, 5 from users where phone = '01000000000'
on conflict (user_id) do update set reminder_days = excluded.reminder_days, updated_at = now();

commit;
