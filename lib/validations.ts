import { z } from 'zod'

export const slugSchema = z
  .string()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens')

function isDateTodayOrFuture(v: string) {
  const d = new Date(v)
  if (isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d >= today
}

export const createEventSchema = z.object({
  title: z.string().min(3).max(100),
  slug: slugSchema,
  date: z.string().refine(isDateTodayOrFuture, 'A data não pode ser anterior a hoje'),
  location: z.string().min(3).max(200).optional().default('Local a definir'),
  description: z.string().max(1000).optional(),
  emoji: z.string().max(4).optional().default('🎉'),
})

export const updateEventSchema = z.object({
  title: z.string().min(3).max(100),
  date: z.string().refine(isDateTodayOrFuture, 'A data não pode ser anterior a hoje'),
  location: z.string().min(3).max(200).optional().default('Local a definir'),
  description: z.string().max(1000).optional(),
  emoji: z.string().max(4).optional().default('🎉'),
})

// RSVP público: o convidado se identifica no próprio formulário, já que
// não há contas de usuário. E-mail é opcional (apenas referência).
export const rsvpSchema = z.object({
  name: z.string().min(2, 'Informe seu nome').max(100),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  companions: z.number().int().min(0).max(10).default(0),
  companion_names: z.array(z.string().min(1).max(100)).max(10).default([]),
  dietary_notes: z.string().max(300).optional(),
  is_public: z.boolean().default(true),
})

export const reserveGiftSchema = z.object({
  gift_id: z.string().uuid(),
  token: z.string().min(1),
})

// Convidado adiciona, na área dele, o presente que vai levar (texto livre).
export const addGuestGiftSchema = z.object({
  description: z.string().min(2, 'Descreva o presente').max(200),
  token: z.string().min(1),
})

export const voteSchema = z.object({
  poll_id: z.string().uuid(),
  option_id: z.string().uuid(),
  token: z.string().min(1),
})

export const createPollSchema = z.object({
  event_id: z.string().uuid(),
  question: z.string().min(5).max(300),
  options: z
    .array(z.string().min(1).max(100).transform(s => s.trim()))
    .min(2)
    .max(8)
    .refine(opts => new Set(opts).size === opts.length, 'As opções devem ser únicas'),
  deadline: z
    .string()
    .datetime()
    .optional()
    .refine(v => !v || new Date(v) > new Date(), 'O prazo deve ser uma data futura'),
  result_visibility: z
    .enum(['REALTIME', 'AFTER_DEADLINE', 'ORGANIZER_ONLY'])
    .default('REALTIME'),
})
