export type EventStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
export type GuestStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED'
export type GiftStatus = 'AVAILABLE' | 'RESERVED'
export type ResultVisibility = 'REALTIME' | 'AFTER_DEADLINE' | 'ORGANIZER_ONLY'
export type SupplyMode = 'ANONYMOUS' | 'NOMINAL'

export interface Event {
  id: string
  slug: string
  title: string
  date: string
  location: string
  description: string | null
  emoji: string
  status: EventStatus
  show_guests: boolean
  show_gifts: boolean
  show_polls: boolean
  show_supplies: boolean
  allow_supply_suggestions: boolean
  created_at: string
  updated_at: string
}

export interface Guest {
  id: string
  event_id: string
  name: string
  email: string | null
  token: string
  status: GuestStatus
  is_public: boolean
  companions: number
  companion_names: string[]
  dietary_notes: string | null
  created_at: string
  updated_at: string
}

export interface GiftPublic {
  id: string
  event_id: string
  description: string
  status: GiftStatus
  reservedByMe?: boolean
}

export interface Poll {
  id: string
  event_id: string
  question: string
  deadline: string | null
  result_visibility: ResultVisibility
  is_active: boolean
  created_at: string
}

export interface PollOption {
  id: string
  poll_id: string
  text: string
}

export interface PollWithOptions extends Poll {
  poll_options: PollOption[]
  userVoteOptionId?: string | null
}

export interface Supply {
  id: string
  event_id: string
  name: string
  quantity: number
  mode: SupplyMode
  guest_id: string | null
}

export interface EventWithGuestCount extends Event {
  confirmedCount: number
  totalCount: number
}
