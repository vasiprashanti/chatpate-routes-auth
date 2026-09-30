begin;

create table if not exists public.itinerary_submission_settings (
  id smallint primary key default 1 check (id = 1),
  submission_fee numeric(10, 2) check (submission_fee is null or submission_fee > 0),
  updated_at timestamptz not null default now()
);

insert into public.itinerary_submission_settings (id, submission_fee)
values (1, null)
on conflict (id) do nothing;

create table if not exists public.itinerary_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_method text not null check (submission_method in ('manual', 'pdf')),
  title text not null,
  destination text not null,
  starting_location text,
  travel_months text[] not null default '{}',
  duration text not null,
  estimated_budget numeric(12, 2),
  itinerary_details text,
  additional_notes text,
  pdf_path text,
  cohost_interest text not null check (cohost_interest in ('yes', 'no', 'maybe')),
  submitter_name text not null,
  email text not null,
  phone text not null,
  consent boolean not null check (consent = true),
  review_status text not null default 'pending_review'
    check (review_status in ('pending_review', 'under_review', 'approved', 'rejected')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_reference text,
  payment_id text,
  fee_amount numeric(10, 2) not null check (fee_amount > 0),
  creator_tag text not null default 'explorer'
    check (creator_tag in ('explorer', 'trip_creator', 'co_host')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (submission_method = 'manual'
      and starting_location is not null and length(trim(starting_location)) > 0
      and estimated_budget is not null and estimated_budget > 0
      and itinerary_details is not null and length(trim(itinerary_details)) > 0)
    or (submission_method = 'pdf' and pdf_path is not null)
  )
);

create index if not exists itinerary_submissions_user_created_idx
  on public.itinerary_submissions (user_id, created_at desc);
create index if not exists itinerary_submissions_review_created_idx
  on public.itinerary_submissions (review_status, created_at desc);

create or replace function public.set_itinerary_submission_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists itinerary_submissions_updated_at on public.itinerary_submissions;
create trigger itinerary_submissions_updated_at
before update on public.itinerary_submissions
for each row execute function public.set_itinerary_submission_updated_at();

alter table public.itinerary_submission_settings enable row level security;
alter table public.itinerary_submissions enable row level security;

drop policy if exists "Public can read itinerary submission fee" on public.itinerary_submission_settings;
create policy "Public can read itinerary submission fee"
  on public.itinerary_submission_settings for select
  to anon, authenticated using (true);

drop policy if exists "Admins can manage itinerary submission fee" on public.itinerary_submission_settings;
create policy "Admins can manage itinerary submission fee"
  on public.itinerary_submission_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users can read their own itinerary submissions" on public.itinerary_submissions;
create policy "Users can read their own itinerary submissions"
  on public.itinerary_submissions for select
  to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can submit their own itineraries" on public.itinerary_submissions;
create policy "Users can submit their own itineraries"
  on public.itinerary_submissions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and consent
    and payment_status = 'pending'
    and review_status = 'pending_review'
    and creator_tag = 'explorer'
    and fee_amount = (
      select submission_fee
      from public.itinerary_submission_settings
      where id = 1
    )
  );

drop policy if exists "Admins can update itinerary submissions" on public.itinerary_submissions;
create policy "Admins can update itinerary submissions"
  on public.itinerary_submissions for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete itinerary submissions" on public.itinerary_submissions;
create policy "Admins can delete itinerary submissions"
  on public.itinerary_submissions for delete
  to authenticated using (public.is_admin());

grant select on public.itinerary_submission_settings to anon, authenticated;
grant insert, update, delete on public.itinerary_submission_settings to authenticated;
grant select, insert, update, delete on public.itinerary_submissions to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('itinerary-submissions', 'itinerary-submissions', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

drop policy if exists "Users can upload their own itinerary PDFs" on storage.objects;
create policy "Users can upload their own itinerary PDFs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'itinerary-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users and admins can read itinerary PDFs" on storage.objects;
create policy "Users and admins can read itinerary PDFs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'itinerary-submissions'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "Users and admins can delete itinerary PDFs" on storage.objects;
drop policy if exists "Admins can delete itinerary PDFs" on storage.objects;
create policy "Admins can delete itinerary PDFs"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'itinerary-submissions' and public.is_admin());

commit;
