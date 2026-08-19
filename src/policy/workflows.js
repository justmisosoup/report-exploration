// Workflow configs for the policy builder. A workflow is a data-policy tier
// plus per-unit configuration; everything else renders and evaluates from
// units_seed.json. No unit behavior lives in component code.
import SEED from './units_seed.json' with { type: 'json' }
import CATALOG from './check_catalog.json' with { type: 'json' }
import TEST_UNIT from './test_unit.json' with { type: 'json' }

// Scalability check: ?testunit=1 appends a fictional unit at the data layer.
// It must render everywhere with zero component changes.
const withTestUnit = typeof window !== 'undefined' && /[?&]testunit=1/.test(window.location.search)
export const UNITS = withTestUnit ? [...SEED.units, TEST_UNIT] : SEED.units
export const CHECKS = CATALOG.checks
export const TIERS = CATALOG.tiers
export const ADVERSE_GROUPS = CATALOG.adverse_media_categories
export const TIER_RANK = { authoritative: 0, '+gov': 1, '+web': 2 }

// Default per-unit config derived purely from the seed: enabled, seed role,
// first answer option approves and every other answer reviews, permitted
// sets start permissive.
export function defaultUnitConfig(unit) {
  const cfg = { enabled: true, role: unit.role_default, tierOverride: null }
  if (unit.type === 'graded') {
    cfg.graded = {}
    if (unit.answer_mapping && unit.answer_options) {
      // Mapped units: decisions keyed by the customer's answer options.
      unit.answer_options.forEach((a, i) => { cfg.graded[a] = i === 0 ? 'approve' : 'review' })
    } else {
      // Unmapped units: the raw result is the answer; first result value is
      // the passing one per the seed's ordering convention.
      ;(unit.result_values || []).forEach((rv, i) => { cfg.graded[rv] = i === 0 ? 'approve' : 'review' })
    }
  }
  if (unit.type === 'permitted_set') {
    const lists = unit.value_space && unit.value_space.lists
    if (lists) cfg.permitted = { mode: 'lists', lists: Object.fromEntries(lists.map(l => [l.name, []])) }
    else if (unit.value_space && unit.value_space.kind === 'adverse_media_categories')
      cfg.permitted = { mode: 'material', materialGroups: [], outcome: 'review' }
    else if (unit.value_space && unit.value_space.kind === 'country_codes')
      cfg.permitted = { mode: 'denied', denied: [], outcome: 'deny' }
    else cfg.permitted = { mode: 'allowed', allowed: [...(unit.result_values || [])], outcome: 'review' }
  }
  return cfg
}

export function makeWorkflow(id, label, dataPolicy, overrides) {
  const units = {}
  for (const u of UNITS) {
    units[u.id] = defaultUnitConfig(u)
    if (overrides && overrides[u.id]) {
      const o = overrides[u.id]
      units[u.id] = { ...units[u.id], ...o,
        graded: o.graded ? { ...units[u.id].graded, ...o.graded } : units[u.id].graded,
        permitted: o.permitted ? { ...units[u.id].permitted, ...o.permitted } : units[u.id].permitted }
    }
  }
  return { id, label, dataPolicy, units }
}

const SANCTIONED = ['IR', 'KP', 'SY', 'CU']

// Shared overrides both demo workflows agree on.
const COMMON = {
  'physical_address.match': { role: 'informational' },
  'physical_address.restricted_country': { permitted: { mode: 'denied', denied: SANCTIONED, outcome: 'deny' } },
  'physical_address.permitted_types': { permitted: { mode: 'allowed', allowed: ['commercial', 'residential'], outcome: 'review' } },
  'entity.permitted_types': { permitted: { mode: 'allowed', allowed: ['llc', 'c_corp', 's_corp', 'llp', 'partnership', 'sole_prop', 'non_profit'], outcome: 'review' } },
  'operations.foreign': { permitted: { mode: 'denied', denied: SANCTIONED, outcome: 'review' } },
  'industry.lists': { permitted: { mode: 'lists', lists: { knock_out: ['713210', 'cannabis', 'firearms_retail'], restricted: ['522298', 'gambling', 'payday_lending'], target: ['444240'] } } },
  'tin.issued': { graded: { No: 'deny' } },
  'dba.registration': { graded: { 'No - required and missing': 'deny', No: 'approve' } },
  'web.presence_quality': { graded: { Great: 'approve', Mixed: 'approve', Bad: 'review' } },
}

// Workflow A — treats every adverse media category as material (what the
// product's max() collapse does today).
export const WORKFLOW_A = makeWorkflow('A', 'Workflow A', '+web', {
  ...COMMON,
  'adverse_media.categories': { permitted: { mode: 'material', materialGroups: ['crime_typologies', 'high_risk_industries'], outcome: 'review' } },
})

// Workflow B — cares about the 12 crime typologies, not the 18
// lawful-but-high-risk industry categories.
export const WORKFLOW_B = makeWorkflow('B', 'Workflow B', '+web', {
  ...COMMON,
  'adverse_media.categories': { permitted: { mode: 'material', materialGroups: ['crime_typologies'], outcome: 'review' } },
})

export function cloneWorkflow(wf, id, label) {
  return JSON.parse(JSON.stringify({ ...wf, id: id || wf.id, label: label || wf.label }))
}
