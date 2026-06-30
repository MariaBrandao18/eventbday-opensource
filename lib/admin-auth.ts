import { cookies } from 'next/headers'

/**
 * Trava de instância única — NÃO é um sistema de autenticação.
 *
 * Cada instância self-hosted serve um único organizador, que define
 * ADMIN_TOKEN no .env. O acesso à área administrativa é resolvido por
 * uma comparação direta de string: sem login, sem senha com hash, sem
 * sessão de múltiplos usuários, sem JWT. Quem precisa de multi-organizador
 * deve usar a camada SaaS privada.
 */

export const ADMIN_COOKIE = 'eb_admin'

export function isValidAdminToken(token: string | undefined | null): boolean {
  const expected = process.env.ADMIN_TOKEN
  if (!token || !expected) return false
  // Comparação simples — o token vive apenas no .env da instância.
  return token === expected
}

/** Lê o cookie da requisição atual e valida contra ADMIN_TOKEN. */
export function isAdmin(): boolean {
  const token = cookies().get(ADMIN_COOKIE)?.value
  return isValidAdminToken(token)
}
