-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 用户资料表
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

-- 2. 项目表
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  project_name text not null default 'GPX 轨迹',
  data text not null,
  thumbnail text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. RLS 策略
alter table profiles enable row level security;
alter table projects enable row level security;

-- profiles: 用户可以读自己的，插入自己的
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- projects: 用户可以 CRUD 自己的项目
create policy "Users can read own projects" on projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on projects for delete using (auth.uid() = user_id);

-- admin: 管理员可以读所有项目（通过 profiles.role = 'admin'）
create policy "Admins can read all projects" on projects for select using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);
create policy "Admins can read all profiles" on profiles for select using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);
