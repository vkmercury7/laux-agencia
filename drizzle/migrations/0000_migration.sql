create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  company text not null,
  segment text not null,
  has_site text not null,
  uses_instagram text not null,
  advertises text not null,
  goals text[] not null default '{}',
  phone text not null,
  location text not null,
  budget text not null,
  consent boolean not null default false
);
create index leads_phone_created_idx on public.leads (phone, created_at desc);
grant select on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;
create policy "Admins read leads" on public.leads for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.assign_admin_role()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if lower(new.email) = 'vladmirbtc@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users for each row execute function public.assign_admin_role();
insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where lower(email) = 'vladmirbtc@gmail.com' on conflict do nothing;