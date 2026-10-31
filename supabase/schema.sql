-- Trofeo: Supabase jadvallari. Supabase -> SQL Editor -> New query -> shu matnni qo'yib RUN bosing.
create table if not exists users(
  id text primary key,
  name text not null default '',
  tg text not null default '',
  lang text not null default 'uz',
  photo text not null default '',
  follows jsonb not null default '{"l":[],"t":[]}',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  banned_until timestamptz,
  ban_reason text not null default ''
);
create table if not exists leagues(
  id text primary key,
  kind text not null default 'league',
  name text not null default '',
  owner text not null,
  data jsonb not null,
  member_ids text[] not null default '{}',
  players_n int not null default 0,
  matches_n int not null default 0,
  frozen boolean not null default false,
  freeze_reason text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leagues_members_idx on leagues using gin(member_ids);
create index if not exists leagues_owner_idx on leagues(owner);
create table if not exists payments(
  nonce text primary key,
  user_id text not null,
  kind text not null,
  stars int not null,
  status text not null default 'invoiced',
  charge_id text,
  ref_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payments_user_idx on payments(user_id);
create table if not exists meta(
  key text primary key,
  value jsonb not null default '{}'
);
create table if not exists admin_log(
  id bigserial primary key,
  ts timestamptz not null default now(),
  admin_id text not null,
  action text not null,
  target text not null default '',
  note text not null default ''
);
-- Xavfsizlik: jadvallarga to'g'ridan-to'g'ri kirishni butunlay yopamiz.
-- Faqat bizning server (service key) ishlaydi.
alter table users enable row level security;
alter table leagues enable row level security;
alter table payments enable row level security;
alter table meta enable row level security;
alter table admin_log enable row level security;
