/**
 * RBAC — Rollen-Hierarchie (Spec V2)
 * SUPER_ADMIN > ADMIN > BUSINESS_OWNER > PROVIDER > CUSTOMER
 *
 * DB-Rollen (Legacy): kunde, anbieter, provider, b2b, admin, super_admin
 * Spec-Rollen: CUSTOMER, PROVIDER, BUSINESS_OWNER, ADMIN, SUPER_ADMIN
 */

export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  PROVIDER: 'PROVIDER',
  BUSINESS_OWNER: 'BUSINESS_OWNER',
  INVESTOR: 'INVESTOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/** Legacy DB role → Spec role */
const ROLE_MAP: Record<string, Role> = {
  kunde: ROLES.CUSTOMER,
  customer: ROLES.CUSTOMER,
  anbieter: ROLES.PROVIDER,
  provider: ROLES.PROVIDER,
  b2b: ROLES.BUSINESS_OWNER,
  investor: ROLES.INVESTOR,
  admin: ROLES.ADMIN,
  super_admin: ROLES.SUPER_ADMIN,
}

const HIERARCHY: Role[] = [
  ROLES.CUSTOMER,
  ROLES.PROVIDER,
  ROLES.BUSINESS_OWNER,
  ROLES.INVESTOR,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
]

/** DB role string → normalized Spec role */
export function toSpecRole(dbRole: string | null | undefined): Role {
  if (!dbRole) return ROLES.CUSTOMER
  const r = ROLE_MAP[dbRole.toLowerCase()]
  return r ?? ROLES.CUSTOMER
}

/** Hat role1 mindestens die Rechte von role2? */
export function hasRoleOrAbove(role1: Role | string, role2: Role | string): boolean {
  const r1 = typeof role1 === 'string' ? toSpecRole(role1) : role1
  const r2 = typeof role2 === 'string' ? toSpecRole(role2) : role2
  const i1 = HIERARCHY.indexOf(r1)
  const i2 = HIERARCHY.indexOf(r2)
  return i1 >= i2
}

/** Darf CUSTOMER-Dashboard? */
export function isCustomer(role: string | null | undefined): boolean {
  return toSpecRole(role) === ROLES.CUSTOMER
}

/** Darf PROVIDER-Dashboard? (Provider oder höher) */
export function isProviderOrAbove(role: string | null | undefined): boolean {
  return hasRoleOrAbove(role ?? '', ROLES.PROVIDER)
}

/** Darf BUSINESS_OWNER (Studios)? */
export function isBusinessOwnerOrAbove(role: string | null | undefined): boolean {
  return hasRoleOrAbove(role ?? '', ROLES.BUSINESS_OWNER)
}

/** Darf ADMIN-Panel? */
export function isAdminOrAbove(role: string | null | undefined): boolean {
  return hasRoleOrAbove(role ?? '', ROLES.ADMIN)
}

/** Darf Investor-Portal? (investor, admin, super_admin) */
export function isInvestorOrAbove(role: string | null | undefined): boolean {
  return hasRoleOrAbove(role ?? '', ROLES.INVESTOR)
}

/** Darf SUPER_ADMIN? */
export function isSuperAdmin(role: string | null | undefined): boolean {
  return toSpecRole(role) === ROLES.SUPER_ADMIN
}
