'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE, isValidAdminToken } from '@/lib/admin-auth'

export type AdminState = { error: string } | null

export async function adminLogin(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const token = (formData.get('token') as string | null)?.trim()

  if (!isValidAdminToken(token)) {
    return { error: 'Chave de administração inválida.' }
  }

  cookies().set(ADMIN_COOKIE, token!, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })

  redirect('/admin')
}

export async function adminLogout() {
  cookies().delete(ADMIN_COOKIE)
  redirect('/admin')
}
