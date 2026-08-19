/* Pure evaluator: evaluate(workflow, business) → result.
   Invariants:
   - No network, no clock, no randomness.
   - Verdict is deterministic over DECISIONING units only: any deny → Deny,
     any review → Review, otherwise Approve. Informational units are excluded
     here, in the evaluator — never in the UI.
   - Only two combinators exist (single_check, first_true); first_true is
     honored through the business record's `via` (which backing check
     answered first).
   - The AI summary elsewhere explains a verdict this function computed; it
     never produces or alters one. */
import { UNITS, CHECKS, TIER_RANK, ADVERSE_GROUPS } from './workflows.js'

const unitById = Object.fromEntries(UNITS.map(u => [u.id, u]))

function tierOk(unit, cfg, workflow) {
  const min = TIER_RANK[unit.min_data_policy] ?? 0
  const policy = TIER_RANK[cfg.tierOverride || workflow.dataPolicy] ?? 0
  return policy >= min
}

function parentSatisfied(unit, workflow, business) {
  if (!unit.parent_id) return true
  const pCfg = workflow.units[unit.parent_id]
  if (!pCfg || !pCfg.enabled) return false
  const pBiz = business.units[unit.parent_id] || {}
  const want = unit.parent_answer || ''
  if (want.startsWith('naics:')) return (pBiz.values || []).includes(want.slice(6))
  return pBiz.result === want
}

function dependencySatisfied(unit, workflow) {
  return (unit.depends_on || []).every(d => workflow.units[d] && workflow.units[d].enabled)
}

function evalPermitted(unit, cfg, biz) {
  const observed = biz.values || []
  const p = cfg.permitted || {}
  if (p.mode === 'denied') {
    const hits = observed.filter(v => (p.denied || []).includes(v))
    return hits.length ? { decision: p.outcome || 'deny', detail: 'On deny list: ' + hits.join(', ') } : { decision: 'approve', detail: 'No denied values observed' }
  }
  if (p.mode === 'lists') {
    const lists = p.lists || {}
    for (const [name, outcome] of [['knock_out', 'deny'], ['restricted', 'review'], ['target', 'approve']]) {
      const hits = observed.filter(v => (lists[name] || []).includes(v))
      if (hits.length) return { decision: outcome, detail: name.replace('_', '-') + ' list: ' + hits.join(', ') }
    }
    return { decision: 'approve', detail: 'No list membership' }
  }
  if (p.mode === 'material') {
    const material = (p.materialGroups || []).flatMap(g => ADVERSE_GROUPS[g] || [])
    const hits = observed.filter(v => material.includes(v))
    if (hits.length) return { decision: p.outcome || 'review', detail: 'Material category hit: ' + hits.join(', ') }
    return { decision: 'approve', detail: observed.length ? 'Hits in non-material categories only: ' + observed.join(', ') : 'No hits' }
  }
  // allowed (default)
  const bad = observed.filter(v => !(p.allowed || []).includes(v))
  return bad.length ? { decision: p.outcome || 'review', detail: 'Not in accepted set: ' + bad.join(', ') } : { decision: 'approve', detail: 'All observed values accepted' }
}

export function evaluate(workflow, business) {
  const rows = []
  const unanswerable = []
  for (const unit of UNITS) {
    const cfg = workflow.units[unit.id]
    if (!cfg) continue
    const biz = business.units[unit.id] || {}
    const row = { id: unit.id, unit, cfg, role: cfg.role, observations: biz.observations || [], via: biz.via || null }
    if (!cfg.enabled) { row.status = 'off'; rows.push(row); continue }
    if (!dependencySatisfied(unit, workflow)) { row.status = 'dependency_off'; rows.push(row); continue }
    if (!parentSatisfied(unit, workflow, business)) { row.status = 'not_applicable'; rows.push(row); continue }
    if (!tierOk(unit, cfg, workflow)) { row.status = 'unanswerable'; unanswerable.push(unit.id); rows.push(row); continue }
    if (unit.type !== 'field' && biz.result === undefined && !biz.values) { row.status = 'no_data'; rows.push(row); continue }
    row.status = 'evaluated'
    if (unit.type === 'graded') {
      row.result = biz.result
      const map = { ...(unit.answer_mapping || {}), ...(cfg.resultAnswer || {}) }
      row.answer = map[biz.result] !== undefined ? map[biz.result] : biz.result
      if (cfg.role === 'decisioning') row.decision = (cfg.graded || {})[row.answer] || 'review'
    } else if (unit.type === 'permitted_set') {
      row.values = biz.values || []
      const out = evalPermitted(unit, cfg, biz)
      row.detail = out.detail
      if (cfg.role === 'decisioning') row.decision = out.decision
    } else {
      // classification / field: a value, informational by nature
      row.result = biz.result
      row.value = biz.value || biz.result
    }
    rows.push(row)
  }
  const decisions = rows.filter(r => r.status === 'evaluated' && r.role === 'decisioning' && r.decision)
  const verdict = decisions.some(r => r.decision === 'deny') ? 'Deny'
    : decisions.some(r => r.decision === 'review') ? 'Review'
    : 'Approve'
  const drivers = decisions.filter(r => r.decision !== 'approve')
  return { rows, verdict, drivers, unanswerable }
}

export function checkLabel(id) { return (CHECKS[id] || {}).label || id }
export function checkTier(id) { return (CHECKS[id] || {}).tier || 'authoritative' }
export { unitById }
