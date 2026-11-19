begin;

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (
    char_length(slug) <= 96 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  industry text not null check (btrim(industry) <> ''),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.articles enable row level security;
revoke all on table public.articles from public, anon, authenticated;
grant select, insert on table public.articles to service_role;

commit;
