// Aplica os arquivos SQL de db/migrations/ em ordem alfabética.
// Uso: DATABASE_URL=... node scripts/migrate.mjs
// (ou `npm run db:migrate` com DATABASE_URL no .env.local)

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '..', 'db', 'migrations')

// Carrega DATABASE_URL de .env.local se ainda não estiver no ambiente.
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
    for (const line of env.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/)
      if (m) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, '')
    }
  } catch {
    // sem .env.local — segue com o ambiente atual
  }
}

if (!process.env.DATABASE_URL) {
  console.error('✖ DATABASE_URL não definido. Configure no .env.local ou no ambiente.')
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, { ssl: 'prefer', max: 1 })

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

try {
  for (const file of files) {
    const content = readFileSync(join(migrationsDir, file), 'utf8')
    process.stdout.write(`→ aplicando ${file} ... `)
    await sql.unsafe(content)
    console.log('ok')
  }
  console.log('✔ Migrations aplicadas com sucesso.')
} catch (err) {
  console.error('\n✖ Erro ao aplicar migration:', err.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
