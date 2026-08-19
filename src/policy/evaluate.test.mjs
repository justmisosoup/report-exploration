// Plain-assert tests for the pure evaluator. Run: node src/policy/evaluate.test.mjs
import assert from 'node:assert'
import { evaluate } from './evaluate.js'
import { WORKFLOW_A, WORKFLOW_B, cloneWorkflow } from './workflows.js'
import BUSINESS from './business.json' with { type: 'json' }

// 1. Workflow A → Review, driven by adverse media.
const a = evaluate(WORKFLOW_A, BUSINESS)
assert.equal(a.verdict, 'Review', 'A should Review, got ' + a.verdict)
assert.ok(a.drivers.some(d => d.id === 'adverse_media.categories'), 'A review should be driven by adverse media')
assert.equal(a.drivers.length, 1, 'A should have exactly one driver: ' + a.drivers.map(d => d.id))

// 2. Workflow B → Approve on identical data.
const b = evaluate(WORKFLOW_B, BUSINESS)
assert.equal(b.verdict, 'Approve', 'B should Approve, got ' + b.verdict + ' via ' + b.drivers.map(d => d.id))

// 3. physical_address.match is informational in both (no decision).
for (const r of [a, b]) {
  const row = r.rows.find(x => x.id === 'physical_address.match')
  assert.equal(row.role, 'informational')
  assert.equal(row.decision, undefined)
}

// 4. Flip physical_address.match to decisioning with major variance → deny ⇒ Deny.
const strict = cloneWorkflow(WORKFLOW_A, 'A2')
strict.units['physical_address.match'].role = 'decisioning'
strict.units['physical_address.match'].graded['No - major variance'] = 'deny'
assert.equal(evaluate(strict, BUSINESS).verdict, 'Deny')

// 5. Authoritative-only: web group + adverse media + industry classification go dark.
const authOnly = cloneWorkflow(WORKFLOW_A, 'A3')
authOnly.dataPolicy = 'authoritative'
const dark = evaluate(authOnly, BUSINESS).unanswerable
for (const id of ['adverse_media.categories', 'industry.classification', 'web.site_exists', 'web.presence_quality', 'physical_address.entity_linkage'])
  assert.ok(dark.includes(id), id + ' should be unanswerable at authoritative-only')

// 6. Parent gating: SSN unit not applicable when TIN is an EIN; PTIN gated off NAICS 541211.
const notApplicable = a.rows.filter(r => r.status === 'not_applicable').map(r => r.id)
assert.ok(notApplicable.includes('tin.ssn_person_match'))
assert.ok(notApplicable.includes('industry.ptin_registered'))

// 7. Dependency: disabling industry.classification disables industry.lists.
const depWf = cloneWorkflow(WORKFLOW_A, 'A4')
depWf.units['industry.classification'].enabled = false
const depRow = evaluate(depWf, BUSINESS).rows.find(r => r.id === 'industry.lists')
assert.equal(depRow.status, 'dependency_off')

// 8. Determinism.
assert.deepEqual(evaluate(WORKFLOW_A, BUSINESS).verdict, evaluate(WORKFLOW_A, BUSINESS).verdict)

console.log('evaluate.test: all assertions passed')
