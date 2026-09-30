begin;

alter table public.meetups
  drop constraint if exists meetups_status_check;

alter table public.meetups
  add constraint meetups_status_check
  check (status in ('draft', 'published', 'featured', 'archived'));

commit;
