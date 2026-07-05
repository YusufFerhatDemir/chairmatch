# ChairMatch + Alltagsengel — Pre-Seed Pitch Deck

**Founder:** Yusuf Cilcioglu, Frankfurt am Main
**Round:** Pre-Seed, €500k target (range €250k–€1M depending on lead)
**Use case:** International cold-outreach deck, English, 12–15 slides, PDF + .pptx
**Master narrative:** *Two-platform bet on regulated service marketplaces — built on one tech stack, by one operator, in the wealthiest underserved corner of Europe.*

---

## Slide 1 — Cover & Hook

- **Title:** "Two marketplaces. One stack. One operator. €38B of unrebuilt service economy in Germany."
- **Subtitle:** ChairMatch + Alltagsengel — Pre-Seed 2026
- Founder name, Frankfurt am Main, contact email, deck date
- Discreet logo lockup of both brands
- One-line hook at bottom: *"Germany still books care-helpers by fax and salon-chair rentals on WhatsApp. We are the first stack rebuilding both."*
- **Visual:** dark monochrome cover, both wordmarks side-by-side, no stock photography. Investor decks are won in the first 10 seconds — this slide does the work.

## Slide 2 — The Problem (two, parallel)

- **Beauty / B2B side:** ~80k salons in Germany; ~40% of stylists already work as solo / "Stuhlmieter," but the booking process is offline — handshake, WhatsApp, paper contracts. No discovery, no payment rails, no insurance, no reviews. Salons leave 1–3 chairs empty 60% of the week.
- **Care / B2C side:** 5.2M Germans have a Pflegegrad. Each is statutorily entitled to **€131/month** under §45b SGB XI — earmarked for "Entlastungsleistungen" (everyday help, companionship, transport). Most of it is never claimed because the *supply* doesn't exist in a bookable way. Families do it themselves, burn out, and the state pays nothing.
- **Why now:** post-COVID gig liberalisation in beauty + 2025 Pflegestärkungs-update both opened the regulatory door.
- **Visual:** split-screen photo (left: empty stylist chair; right: senior at home alone). Numbers overlaid in brand color.

## Slide 3 — The Insight

- One sentence, big type: **"Both markets fail at the same step — matching specialist supply with verified demand in low-trust, regulated environments. Solve that step once, win twice."**
- Three sub-bullets:
  - Same trust primitives (KYC, insurance, verified reviews, escrow/payout)
  - Same supply-side acquisition motion (1:1 onboarding via WhatsApp + AI)
  - Same regulatory tailwind (gig formalisation + state-funded reimbursement)
- **Visual:** Venn diagram — Beauty / Care / Shared Infrastructure. Center = "ChairMatch + Alltagsengel platform layer."

## Slide 4 — The Two Wedges

- **Left half — ChairMatch (B2B):** chair & studio rental marketplace. Salons list spare capacity → independent stylists book → platform handles payment, contract, insurance proof. Take rate 12–15%.
- **Right half — Alltagsengel (B2C + reimbursement):** household help, companionship, patient transport. End-users book → Engel (helpers) deliver → invoice routed directly to Pflegekasse under §45b. Take rate 18–22%. **Native app built with Expo (React Native) — iOS production build done, TestFlight rollout starting; Android next from the same codebase.**
- One shared bottom rail: "Same Supabase backend. Same Next.js frontend. Same operator." → key cost advantage.
- **Visual:** two columns above a single horizontal "platform" bar. Iconography only, no screenshots yet.

## Slide 5 — Market Size (DACH-anchored)

- **ChairMatch TAM:** German salon revenue ≈ €7.4B/year. Chair-rental subset ≈ €1.1B addressable, growing 9% CAGR as stylists go solo. Austria + CH adds ~€350M.
- **Alltagsengel TAM:** 5.2M Pflegegrad recipients × €131/month × 12 = **€8.2B in unspent statutory entitlement per year**. Total private senior-care services €15B+. Adjacent: 3.4M Pflegegrad 1 (formerly excluded) since 2024 reform.
- Cumulative DACH SAM: ~**€3.8B GMV opportunity at maturity**, with two completely independent growth curves.
- **Visual:** two clean stacked bars (TAM / SAM / SOM) side by side. Cite sources in footer (Destatis, BMG, Statista, BIV).

## Slide 6 — Product Demo I (ChairMatch web)

- Three real screens, no lorem ipsum:
  1. Salon dashboard — "List your chair, set availability"
  2. Stylist booking flow — search → time slot → instant booking
  3. Payout & contract automation
- Three callouts: real-time availability, SCHUFA-light identity check via Stripe Identity, automated rental contract PDF.
- **Visual:** device-frame mockups on dark background. Add a tiny "Live since [month] 2025" badge.

## Slide 7 — Product Demo II (Alltagsengel native app)

- Three real screens from the Expo (React Native) app:
  1. "Find an Engel near you" map view
  2. Booking confirmation + §45b invoice routing toggle
  3. Engel earnings dashboard
- Three callouts: native iOS + Android from one React Native codebase (iOS built, Android to follow), direct Pflegekasse invoice rail, KYC + criminal-record check baked into Engel onboarding.
- **Visual:** app screenshots in real iPhone frames. Small honest status badge: "iOS in TestFlight — App Store launch next." No store badges until the app is actually live.

## Slide 8 — Traction (honest)

- Headline: **"Pre-revenue, post-product — proving the loop manually before we scale it."**
- Five honest bullets:
  - 1 paying customer Alltagsengel — first €45b invoice cycle ran clean
  - 2 active Engels in Frankfurt onboarded, KYC'd, working real shifts
  - Native app (Expo / React Native): first iOS production build shipped, TestFlight rollout starting — not in the App Store yet, and we say so
  - GA4 + product analytics deployed across both platforms (Wave 1, last sprint)
  - Foundation work done: auth-recovery hardened, SEO/GEO base laid, test-data isolated from production
- One-liner at the bottom: *"What we don't have yet: a sales team, paid acquisition, GMV — and that's the point. You're funding the next 100 bookings, not the first one."*
- **Visual:** a sparse timeline from "Day 0" → today, three dots. No fake hockey stick.

## Slide 9 — Tech Edge

- **One stack, two products** — Next.js + Supabase + Tailwind on the web (Vercel, deployed automatically per push) + Expo (React Native) for the native app (EAS cloud builds).
- Operational consequence: ~70% code reuse between platforms (auth, payments, KYC, messaging, notifications, admin).
- **AI-augmented operations:** Claude-driven ops cockpit handles support triage, content moderation, Engel-vetting interviews, fraud signals — replacing what would normally be 3–4 ops hires at this stage.
- Three operator metrics: time-to-deploy < 2 minutes; engineering cost / new feature ~70% lower than dual-stack peers; solo founder shipping at 4-person team velocity.
- **Visual:** simple stack diagram — both apps on top, shared services in the middle, infra at the bottom. No buzzword soup.

## Slide 10 — Business Model & Unit Economics

- **ChairMatch:** 12–15% take rate on chair-day rental. ARPU per active chair ~€480/month → ~€60–€72 platform revenue/chair/month. Salon CAC dominated by direct ops outreach (~€80) → 14-month payback on a single chair, 4-month payback once second chair lists.
- **Alltagsengel:** 18–22% take rate. Avg booking value €38; Engel earns 78% net of platform + payment; platform nets ~€7. Pflegekasse invoicing flips CAC math — recipient pays €0 out-of-pocket → conversion ~6× a standard B2C marketplace.
- **Combined LTV insight:** shared trust + KYC infrastructure pulls CAC down across both products as scale grows.
- **Visual:** two-column unit-econ table side by side, with shared infra cost row at the bottom in brand accent.

## Slide 11 — Go-to-Market

- **Phase 1 (now → +6 mo):** Frankfurt + Rhein-Main bridgehead. ~1,200 salons + ~280k Pflegegrad recipients in 30km radius — large enough to prove density on both products.
- **Phase 2 (+6 → +18 mo):** DACH metro rollout — Hamburg, Berlin, Munich, Köln, Wien. Localized supply playbook per metro.
- **Phase 3 (+18 mo):** EU/regulated-care expansion (Austria first via parallel pflegekasse reform; CH next via Spitex partnership channel).
- **Sales motion:** ChairMatch — outbound salon BD by founder + 1 ops hire. Alltagsengel — content + community (caregiver Facebook groups, Pflegestützpunkt partnerships) + Google search intent ("§45b ausschöpfen").
- **Visual:** simple DACH map, three concentric expansion rings starting in Frankfurt.

## Slide 12 — Team

- **Solo founder narrative — direct, not apologetic.**
  - Yusuf Cilcioglu — Frankfurt am Main. Operator background. Ships product end-to-end: code, design, regulatory research, ops, customer support.
  - Why solo, why now: "I'm betting that AI-augmented solo execution beats a 5-person team at pre-seed speed. The numbers say I'm right — both products shipped (web live, iOS build in TestFlight rollout), ~70% code reuse, deployed every push."
  - First three planned hires post-round: (1) DACH Senior BD, (2) Care-ops lead with Pflegekasse experience, (3) Full-stack engineer.
- One short quote / personal line — what motivates the founder. Keep it human, two sentences max.
- **Visual:** single founder portrait + 3 silhouette boxes for planned hires. Honest, not over-styled.

## Slide 13 — The Ask

- **€500,000 pre-seed** — accepting €250k from lead angel down to €1M from a Micro-VC lead.
- SAFE / convertible preferred; valuation cap target €4M post-money (range €3M–€5M).
- **Use of funds (18-month runway):**
  - 45% — first 3 hires (BD, care-ops, eng)
  - 25% — paid acquisition + content engine across both products
  - 15% — regulatory build-out (insurance partnerships, Pflegekasse direct-billing automation)
  - 10% — infra + tooling
  - 5% — legal + corporate setup (incl. forming a Delaware C-corp or Estonian OÜ parent if required by lead)
- **Milestones the round buys:**
  - 250+ paying ChairMatch chairs across 4 DACH cities
  - 1,500+ completed Alltagsengel bookings; €1M+ Pflegekasse-billed GMV annualised
  - €30k+ MRR combined
  - Clean Series A story by month 18
- **Visual:** pie chart for use of funds + milestone tile row at the bottom.

## Slide 14 — Vision

- Big-type one-liner: **"The default booking layer for every regulated service economy in Europe — starting with the two no one else wants to touch."**
- Three short paragraphs:
  - Why we will win: speed + stack reuse + the only operator in DACH compounding learnings across two regulated marketplaces simultaneously.
  - What "won" looks like: 100k+ supply-side professionals on the platform, €500M+ GMV by year 5, the standard backend for Pflegekasse-billed services.
  - Why it matters: Germany alone leaves €5B+ in statutory care reimbursement unclaimed every year. Solving the booking layer doesn't just build a company — it unlocks a public benefit nobody else has been able to.
- **Visual:** single full-bleed brand image, no clutter. Let the words breathe.

## Slide 15 — Contact & Next Steps

- **Yusuf Cilcioglu** — Founder
- y.cilcioglu@googlemail.com (or founder@chairmatch.de once set up)
- Frankfurt am Main, Germany
- LinkedIn handle / Twitter handle (placeholders for Yusuf to fill)
- ChairMatch URL — Alltagsengel URL — both with QR codes
- "Open to first-call within 7 days. Data room available on request."
- **Visual:** clean, minimal. Two QR codes side by side. Nothing else.

---

## Appendix slides (optional, for follow-up calls)

- A1 — Detailed cohort & engagement metrics from first paying users
- A2 — Regulatory deep-dive: §45b SGB XI mechanics, anerkannte Angebote, Pflegekassen billing flow
- A3 — Competitive matrix: Care.com Germany / Pflegix / Helpling vs. Alltagsengel; SalonHero / Treatwell vs. ChairMatch
- A4 — Risk register & mitigation (regulatory, supply-side, founder-key-person, payment fraud)
- A5 — 24-month financial projection sensitivity (3 scenarios)
- A6 — Founder bio long-form + reference list

---

## Style / production notes (for Yusuf when converting to .pptx)

- **Stick to ≤ 6 lines of body copy per slide.** Pre-seed deck readers spend 3–4 minutes total. Words must work.
- **Honesty wins:** the traction slide is the most important slide in the whole deck. Angels can smell padding from one slide away. Yusuf's "1 booking + 2 Engels live + iOS app built and heading into TestFlight + clean tech foundation" is a strong, defensible position. Don't dress it up.
- **No "AI-powered" / "synergy" / "disrupt" as standalone words.** If you use them, attach a concrete mechanism in the same sentence.
- **Numbers must trace.** Every TAM/SAM number → cite in footer. Every unit econ → source the assumption. Investors who fund will spreadsheet this.
- **Colors:** keep brand palettes distinct on slides 4/6/7 (one ChairMatch screen, one Alltagsengel screen — visually different), unify on every other slide so the reader feels "one company, two arms."
- **Export:** PDF for cold outreach (smaller, opens everywhere), .pptx kept for live calls (animations on slide 4 are worth it).
