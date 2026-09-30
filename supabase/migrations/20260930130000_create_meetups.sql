begin;

create table if not exists public.meetups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  destination text not null,
  event_date date,
  event_time text,
  description text not null,
  image_url text,
  image_path text,
  joining_details text,
  join_url text,
  status text not null default 'draft'
    check (status in ('draft', 'featured', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meetups_status_created_at_idx
  on public.meetups (status, created_at desc);

create unique index if not exists meetups_one_featured_idx
  on public.meetups (status)
  where status = 'featured';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$function$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_featured_meetup(target_meetup_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  update public.meetups
  set status = 'draft', updated_at = now()
  where status = 'featured' and id <> target_meetup_id;

  update public.meetups
  set status = 'featured', updated_at = now()
  where id = target_meetup_id;

  if not found then
    raise exception 'Meetup not found.' using errcode = 'P0002';
  end if;
end;
$function$;

revoke all on function public.set_featured_meetup(uuid) from public;
grant execute on function public.set_featured_meetup(uuid) to authenticated;

create or replace function public.set_meetup_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists meetups_updated_at on public.meetups;
create trigger meetups_updated_at
before update on public.meetups
for each row execute function public.set_meetup_updated_at();

alter table public.meetups enable row level security;

drop policy if exists "Public can read featured meetups" on public.meetups;
create policy "Public can read featured meetups"
  on public.meetups for select
  to anon, authenticated
  using (status = 'featured' or public.is_admin());

drop policy if exists "Admins can create meetups" on public.meetups;
create policy "Admins can create meetups"
  on public.meetups for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update meetups" on public.meetups;
create policy "Admins can update meetups"
  on public.meetups for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete meetups" on public.meetups;
create policy "Admins can delete meetups"
  on public.meetups for delete
  to authenticated
  using (public.is_admin());

grant select on public.meetups to anon, authenticated;
grant insert, update, delete on public.meetups to authenticated;

-- Preserve the meetup already shown on the homepage until an admin replaces it.
insert into public.meetups (
  title,
  destination,
  event_date,
  event_time,
  description,
  image_url,
  joining_details,
  status
)
select
  'Chai, Charcha & What''s Next?',
  'Delhi',
  null,
  '6:30 PM',
  'A casual evening to meet fellow Chatpate people, swap travel stories, discover new places, and maybe end up planning the next trip together.',
  '/assets/meetup-BEeVzjDX.png',
  'Hey! I’m in for the next meetup',
  'featured'
where not exists (
  select 1 from public.meetups where status = 'featured'
);

commit;
