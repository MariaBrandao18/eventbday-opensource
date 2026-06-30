import postgres from 'postgres'

/**
 * Cliente PostgreSQL puro — sem ORM, sem provedor gerenciado.
 * Aponte DATABASE_URL para qualquer instância Postgres (local, Supabase,
 * Railway, Neon, etc.). As queries usam SQL direto via tagged templates,
 * que já fazem o escape dos valores interpolados (proteção contra injection).
 */

declare global {
  // eslint-disable-next-line no-var
  var __eventbday_sql: ReturnType<typeof postgres> | undefined
}

function createClient() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('[EventBday] DATABASE_URL não está definido no .env.local')
  }
  return postgres(url, {
    // ssl 'prefer' funciona tanto em Postgres local (sem SSL) quanto em
    // provedores gerenciados que exigem TLS.
    ssl: 'prefer',
    // Pool enxuto — suficiente para uma instância self-host de um organizador.
    max: 10,
  })
}

// Reaproveita a conexão entre hot-reloads no desenvolvimento.
export const sql = global.__eventbday_sql ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  global.__eventbday_sql = sql
}
