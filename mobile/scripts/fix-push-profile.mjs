// Enable Push Notifications capability on the App ID and regenerate the
// App Store provisioning profile via the App Store Connect API.
// Fully autonomous — no Apple Developer portal clicks needed.
import { readFileSync, writeFileSync } from 'node:fs'
import { createSign } from 'node:crypto'

const KEY_ID = '8H62PAAUWR'
const ISSUER_ID = 'ced8225d-ab68-4072-8897-4a60e825d16e'
const KEY_PATH = '/Users/work/Downloads/AuthKey_8H62PAAUWR.p8'
const BUNDLE_ID = 'de.chairmatch.app'
const PROFILE_NAME = 'ChairMatch App Store'
const CERT_SERIAL = '51C2DD3CF6F933633D3D2AFC1F278C4D'
const OUT_PROFILE = new URL('../profile.mobileprovision', import.meta.url)

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function makeJwt() {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' }
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 1140, aud: 'appstoreconnect-v1' }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const signer = createSign('SHA256')
  signer.update(signingInput)
  const sig = signer.sign({ key: readFileSync(KEY_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' })
  return `${signingInput}.${b64url(sig)}`
}

const TOKEN = makeJwt()
const BASE = 'https://api.appstoreconnect.apple.com'

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  return { status: res.status, json }
}

// 1. Resolve bundle id resource
const bundle = await api('GET', `/v1/bundleIds?filter[identifier]=${BUNDLE_ID}&limit=1`)
const bundleResourceId = bundle.json?.data?.[0]?.id
if (!bundleResourceId) {
  console.error('BundleId not found:', JSON.stringify(bundle.json))
  process.exit(1)
}
console.log('BundleId resource:', bundleResourceId)

// 2. Enable Push Notifications capability (idempotent)
const cap = await api('POST', '/v1/bundleIdCapabilities', {
  data: {
    type: 'bundleIdCapabilities',
    attributes: { capabilityType: 'PUSH_NOTIFICATIONS' },
    relationships: { bundleId: { data: { type: 'bundleIds', id: bundleResourceId } } },
  },
})
if (cap.status === 201) console.log('Push capability enabled.')
else if (cap.status === 409 || JSON.stringify(cap.json).includes('ENTITLEMENT_ALREADY')) console.log('Push capability already enabled.')
else console.log('Capability response', cap.status, JSON.stringify(cap.json).slice(0, 300))

// 3. Find the distribution certificate matching our local p12 serial
const certs = await api('GET', '/v1/certificates?filter[certificateType]=DISTRIBUTION&limit=200')
let cert = certs.json?.data?.find((c) => (c.attributes?.serialNumber || '').toUpperCase() === CERT_SERIAL)
if (!cert) {
  // fallback: any valid Apple Distribution cert
  cert = certs.json?.data?.find((c) => c.attributes?.certificateType === 'DISTRIBUTION')
}
if (!cert) {
  console.error('No distribution certificate found:', JSON.stringify(certs.json).slice(0, 400))
  process.exit(1)
}
console.log('Certificate:', cert.id, cert.attributes?.name, cert.attributes?.serialNumber)

// 4. Delete existing profile with the same name (must recreate to pick up new capability)
const existing = await api('GET', `/v1/profiles?filter[name]=${encodeURIComponent(PROFILE_NAME)}&limit=10`)
for (const p of existing.json?.data || []) {
  const del = await api('DELETE', `/v1/profiles/${p.id}`)
  console.log('Deleted old profile', p.id, del.status)
}

// 5. Create fresh App Store profile (now includes aps-environment)
const created = await api('POST', '/v1/profiles', {
  data: {
    type: 'profiles',
    attributes: { name: PROFILE_NAME, profileType: 'IOS_APP_STORE' },
    relationships: {
      bundleId: { data: { type: 'bundleIds', id: bundleResourceId } },
      certificates: { data: [{ type: 'certificates', id: cert.id }] },
    },
  },
})
if (created.status !== 201) {
  console.error('Profile creation failed:', created.status, JSON.stringify(created.json).slice(0, 500))
  process.exit(1)
}
const content = created.json?.data?.attributes?.profileContent
if (!content) {
  console.error('No profileContent in response')
  process.exit(1)
}
writeFileSync(OUT_PROFILE, Buffer.from(content, 'base64'))
console.log('New profile written:', created.json.data.id, created.json.data.attributes?.name)
