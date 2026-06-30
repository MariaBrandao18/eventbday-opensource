import { isAdmin } from '@/lib/admin-auth'
import Navbar from '@/components/Navbar'
import AdminLogin from '@/components/AdminLogin'

export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Trava de instância única: sem cookie de admin válido, mostra o gate de login.
  if (!isAdmin()) return <AdminLogin />

  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
