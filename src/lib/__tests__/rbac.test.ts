/**
 * Rollen-Hierarchie.
 *
 * Diese Datei entscheidet, wer in `/provider`, `/owner`, `/investor` und
 * `/admin` kommt — sowohl in der Middleware als auch in den API-Routen. Sie
 * war bis 27.08.2026 ungetestet, obwohl genau hier schon einmal ein Fehler
 * sass: fehlende Spec-Namen in ROLE_MAP liessen `toSpecRole()` auf CUSTOMER
 * zurueckfallen, womit `isBusinessOwnerOrAbove()` fuer jede Rolle wahr war.
 */
import { describe, it, expect } from 'vitest'
import {
  ROLES,
  toSpecRole,
  hasRoleOrAbove,
  isCustomer,
  isProviderOrAbove,
  isBusinessOwnerOrAbove,
  isAdminOrAbove,
  isInvestorOrAbove,
  isSuperAdmin,
} from '../rbac'

describe('toSpecRole', () => {
  it.each([
    ['kunde', ROLES.CUSTOMER],
    ['anbieter', ROLES.PROVIDER],
    ['provider', ROLES.PROVIDER],
    ['b2b', ROLES.BUSINESS_OWNER],
    ['business_owner', ROLES.BUSINESS_OWNER],
    ['investor', ROLES.INVESTOR],
    ['admin', ROLES.ADMIN],
    ['super_admin', ROLES.SUPER_ADMIN],
  ])('bildet die DB-Rolle "%s" ab', (dbRole, expected) => {
    expect(toSpecRole(dbRole)).toBe(expected)
  })

  it('ist gegen Gross-/Kleinschreibung unempfindlich', () => {
    expect(toSpecRole('SUPER_ADMIN')).toBe(ROLES.SUPER_ADMIN)
  })

  it('faellt bei unbekannt, null und leer auf die kleinste Rolle zurueck', () => {
    expect(toSpecRole('root')).toBe(ROLES.CUSTOMER)
    expect(toSpecRole(null)).toBe(ROLES.CUSTOMER)
    expect(toSpecRole(undefined)).toBe(ROLES.CUSTOMER)
    expect(toSpecRole('')).toBe(ROLES.CUSTOMER)
  })

  it('kennt auch die Spec-Namen selbst — sonst vergleicht sich alles gegen CUSTOMER', () => {
    // Regression: fehlte `business_owner` im Map, war jede Rolle
    // `isBusinessOwnerOrAbove()`.
    expect(hasRoleOrAbove('kunde', 'business_owner')).toBe(false)
    expect(hasRoleOrAbove('b2b', 'business_owner')).toBe(true)
  })
})

describe('hasRoleOrAbove', () => {
  it('ordnet die Leiter aufsteigend', () => {
    expect(hasRoleOrAbove('super_admin', 'admin')).toBe(true)
    expect(hasRoleOrAbove('admin', 'b2b')).toBe(true)
    expect(hasRoleOrAbove('b2b', 'anbieter')).toBe(true)
    expect(hasRoleOrAbove('anbieter', 'kunde')).toBe(true)
  })

  it('laesst niemanden nach oben durch', () => {
    expect(hasRoleOrAbove('kunde', 'anbieter')).toBe(false)
    expect(hasRoleOrAbove('anbieter', 'b2b')).toBe(false)
    expect(hasRoleOrAbove('b2b', 'admin')).toBe(false)
    expect(hasRoleOrAbove('admin', 'super_admin')).toBe(false)
  })

  it('vergleicht eine Rolle mit sich selbst als "mindestens"', () => {
    expect(hasRoleOrAbove('admin', 'admin')).toBe(true)
  })

  it('vergleicht INVESTOR mit niemandem — die Rolle liegt neben der Leiter', () => {
    expect(hasRoleOrAbove('investor', 'kunde')).toBe(false)
    expect(hasRoleOrAbove('super_admin', 'investor')).toBe(false)
  })
})

describe('Zugriffsfragen der Middleware', () => {
  it('CUSTOMER kommt nur ins Kundenkonto', () => {
    expect(isCustomer('kunde')).toBe(true)
    expect(isProviderOrAbove('kunde')).toBe(false)
    expect(isBusinessOwnerOrAbove('kunde')).toBe(false)
    expect(isInvestorOrAbove('kunde')).toBe(false)
    expect(isAdminOrAbove('kunde')).toBe(false)
  })

  it('PROVIDER kommt in /provider, aber nicht in /owner, /investor oder /admin', () => {
    expect(isProviderOrAbove('anbieter')).toBe(true)
    expect(isBusinessOwnerOrAbove('anbieter')).toBe(false)
    expect(isInvestorOrAbove('anbieter')).toBe(false)
    expect(isAdminOrAbove('anbieter')).toBe(false)
  })

  it('INVESTOR kommt ins Investoren-Portal — und in nichts anderes', () => {
    // Regression: als Leitersprosse zwischen BUSINESS_OWNER und ADMIN war
    // jedes Investor-Konto automatisch Anbieter und Studio-Inhaber.
    expect(isInvestorOrAbove('investor')).toBe(true)
    expect(isProviderOrAbove('investor')).toBe(false)
    expect(isBusinessOwnerOrAbove('investor')).toBe(false)
    expect(isAdminOrAbove('investor')).toBe(false)
    expect(isCustomer('investor')).toBe(false)
  })

  it('ADMIN kommt ueberall hin, auch ins Investoren-Portal', () => {
    expect(isProviderOrAbove('admin')).toBe(true)
    expect(isBusinessOwnerOrAbove('admin')).toBe(true)
    expect(isInvestorOrAbove('admin')).toBe(true)
    expect(isAdminOrAbove('admin')).toBe(true)
    expect(isSuperAdmin('admin')).toBe(false)
  })

  it('SUPER_ADMIN ist die einzige Rolle mit isSuperAdmin', () => {
    expect(isSuperAdmin('super_admin')).toBe(true)
    expect(isInvestorOrAbove('super_admin')).toBe(true)
    expect(isAdminOrAbove('super_admin')).toBe(true)
  })

  it('behandelt eine unbekannte oder fehlende Rolle wie eine Kundin', () => {
    for (const role of [null, undefined, '', 'root', 'Administrator']) {
      expect(isAdminOrAbove(role)).toBe(false)
      expect(isProviderOrAbove(role)).toBe(false)
      expect(isInvestorOrAbove(role)).toBe(false)
    }
  })
})
