import { auth } from './auth.config'

export async function getServerSession() {
  return auth()
}

export async function requireAuth() {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireRole(roles: string[]) {
  const session = await requireAuth()
  const role = (session.user as { role?: string }).role
  if (!role || !roles.includes(role)) {
    throw new Error('Forbidden')
  }
  return session
}
