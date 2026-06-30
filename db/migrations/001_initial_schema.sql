-- ============================================================
-- EventBday (Open-Source) — Schema inicial
-- PostgreSQL puro. Sem auth.users, sem RLS de provedor gerenciado,
-- sem profiles, sem email_logs. Acesso resolvido por token (convidado)
-- e por ADMIN_TOKEN da instância (organizador), na camada da aplicação.
-- ============================================================

create extension if not exists "pgcrypto";

-- ─── Eventos ────────────────────────────────────────────────
-- Sem organizer_id: a instância pertence a um único organizador,
-- autenticado por ADMIN_TOKEN no .env.
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  date        timestamptz not null,
  location    text not null default 'Local a definir',
  description text,
  emoji       text not null default '🎉',
  status      text not null default 'DRAFT'
                check (status in ('DRAFT','ACTIVE','CLOSED','ARCHIVED')),
  show_guests   boolean not null default true,
  show_gifts    boolean not null default true,
  show_polls    boolean not null default true,
  show_supplies boolean not null default true,
  allow_supply_suggestions boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── Convidados ─────────────────────────────────────────────
-- token: chave de acesso única exibida na tela após o RSVP.
-- Não há user_id nem expiração: o acesso é por posse do link.
create table if not exists guests (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  name            text not null,
  email           text,                       -- opcional, apenas referência
  token           text unique not null,
  status          text not null default 'CONFIRMED'
                    check (status in ('PENDING','CONFIRMED','DECLINED')),
  is_public       boolean not null default true,
  companions      int not null default 0,
  companion_names text[] not null default '{}',
  dietary_notes   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── Presentes ──────────────────────────────────────────────
-- guest_id é interno: NUNCA é exposto em query pública (anonimato).
create table if not exists gifts (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  description text not null,
  status      text not null default 'AVAILABLE'
                check (status in ('AVAILABLE','RESERVED')),
  guest_id    uuid references guests(id) on delete set null,
  created_at  timestamptz default now()
);

-- ─── Enquetes ───────────────────────────────────────────────
create table if not exists polls (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references events(id) on delete cascade,
  question          text not null,
  deadline          timestamptz,
  result_visibility text not null default 'REALTIME'
                      check (result_visibility in ('REALTIME','AFTER_DEADLINE','ORGANIZER_ONLY')),
  is_active         boolean not null default true,
  created_at        timestamptz default now()
);

create table if not exists poll_options (
  id      uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  text    text not null
);

-- guest_id interno; resultado é sempre exposto de forma agregada.
create table if not exists poll_votes (
  id        uuid primary key default gen_random_uuid(),
  poll_id   uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  guest_id  uuid not null references guests(id) on delete cascade,
  voted_at  timestamptz default now(),
  unique(poll_id, guest_id)
);

-- ─── Insumos ────────────────────────────────────────────────
create table if not exists supplies (
  id       uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name     text not null,
  quantity int not null default 1,
  mode     text not null default 'ANONYMOUS'
             check (mode in ('ANONYMOUS','NOMINAL')),
  guest_id uuid references guests(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists supply_signups (
  id         uuid primary key default gen_random_uuid(),
  supply_id  uuid not null references supplies(id) on delete cascade,
  guest_id   uuid not null references guests(id) on delete cascade,
  created_at timestamptz default now(),
  unique(supply_id, guest_id)
);

-- ─── Índices ────────────────────────────────────────────────
create index if not exists idx_events_slug          on events(slug);
create index if not exists idx_guests_event          on guests(event_id);
create index if not exists idx_guests_token          on guests(token);
create index if not exists idx_gifts_event           on gifts(event_id);
create index if not exists idx_polls_event           on polls(event_id);
create index if not exists idx_poll_options_poll     on poll_options(poll_id);
create index if not exists idx_poll_votes_poll       on poll_votes(poll_id);
create index if not exists idx_supplies_event        on supplies(event_id);
create index if not exists idx_supply_signups_supply on supply_signups(supply_id);
create index if not exists idx_supply_signups_guest  on supply_signups(guest_id);

-- ─── Trigger: updated_at automático ─────────────────────────
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_events on events;
create trigger set_updated_at_events
  before update on events for each row execute function handle_updated_at();

drop trigger if exists set_updated_at_guests on guests;
create trigger set_updated_at_guests
  before update on guests for each row execute function handle_updated_at();
