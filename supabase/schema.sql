-- schema.sql – Tabellen für Supabase.
-- Ausführen im Supabase-Dashboard: SQL Editor → New query → einfügen → Run.
-- Darf mehrmals ausgeführt werden (legt nur an, was noch fehlt).
--
-- Die Räume selbst brauchen keine Tabellen (nur Realtime Broadcast/Presence).

-- ---------------------------------------------------------------------------
-- Themenjoker (Phase 5): Zähler für die Gemini-Aufrufe
-- ---------------------------------------------------------------------------
-- Jede Anfrage an die Edge Function "themenjoker" wird hier mit Raumcode und
-- Uhrzeit eingetragen. So kann die Function Aufrufe pro Raum und pro Tag begrenzen.
-- Es stehen KEINE persönlichen Daten und KEINE Themen-Texte darin.
create table if not exists public.themenjoker_aufrufe (
  id bigint generated always as identity primary key,
  raumcode text not null check (raumcode ~ '^[A-Z2-9]{4}$'),
  erstellt timestamptz not null default now()
);

create index if not exists themenjoker_aufrufe_erstellt
  on public.themenjoker_aufrufe (erstellt);

-- Row Level Security: eingeschaltet und bewusst OHNE Regeln (Policies).
-- Damit dürfen Besucher der Website (anon key) hier gar nichts lesen oder schreiben.
-- Nur die Edge Function (mit dem service_role key, der nur auf dem Server liegt)
-- kommt an die Tabelle heran.
alter table public.themenjoker_aufrufe enable row level security;
revoke all on public.themenjoker_aufrufe from anon, authenticated;
