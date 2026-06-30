import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/actions/events'
import EditEventForm from './EditEventForm'
import Link from 'next/link'

interface Props { params: { slug: string } }

export const dynamic = 'force-dynamic'

export default async function EditEventPage({ params }: Props) {
  const event = await getEventBySlug(params.slug)
  if (!event) notFound()

  return (
    <main>
      <Link href={`/admin/events/${event.slug}`} className="back-link">← Voltar ao evento</Link>

      <div style={{ margin: '6px 0 28px' }}>
        <span className="eyebrow">Editar evento</span>
        <h1 className="section-title" style={{ fontSize: 32 }}>{event.title}</h1>
      </div>

      <div className="card" style={{ maxWidth: 560, padding: '28px 28px 24px' }}>
        <EditEventForm
          eventId={event.id}
          slug={event.slug}
          initial={{
            title: event.title,
            description: event.description ?? '',
            location: event.location,
            emoji: event.emoji,
            date: event.date,
          }}
        />
      </div>
    </main>
  )
}
