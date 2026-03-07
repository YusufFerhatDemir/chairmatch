import { auth } from './auth.config'
import { redirect } from 'next/navigation'

export async function getServerSession() {
  return auth()
}

export async function requireAuth() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth')
  }
  return session
}

export async function requireRole(roles: string[]) {
  const session = await requireAuth()
  const role = (session.user as { role?: string }).role
  if (!role || !roles.includes(role)) {
    redirect('/')
  }
  return session
}
