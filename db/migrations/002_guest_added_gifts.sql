-- ============================================================
-- EventBday (Open-Source) — Presentes adicionados pelo convidado
-- Permite que o convidado registre, na área dele, o presente que
-- vai levar (texto livre), além de reservar os da lista do admin.
--
-- created_by_guest_id marca quem CRIOU o presente (interno, nunca
-- exposto — mesma regra de anonimato de guest_id). Serve para que,
-- ao cancelar, um presente criado pelo convidado seja removido em
-- vez de virar item órfão "AVAILABLE" na lista do organizador.
-- ============================================================

alter table gifts
  add column if not exists created_by_guest_id uuid
    references guests(id) on delete cascade;
