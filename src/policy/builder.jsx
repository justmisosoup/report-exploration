/* Policy workflow builder — Screens 1 (overview), 2 (unit detail), 3 (result).
   Invariants:
   - No unit id, check id, group name, result value, or answer option appears
     as a literal here. Everything renders from units_seed / check_catalog /
     business / workflow configs. Adding a unit is a data change.
   - Controls are generated from unit type and value_space.
   - Informational units never affect the verdict (enforced in evaluate.js).
   - The AI summary explains a verdict already computed; it never produces one.
   - Claims match evidence: copy states what a check supports, nothing more. */
import React from 'react'
import { UNITS, TIERS, TIER_RANK, ADVERSE_GROUPS, cloneWorkflow } from './workflows.js'
import { evaluate, checkLabel, checkTier } from './evaluate.js'
import BUSINESS from './business.json' with { type: 'json' }

const h = React.createElement
const C = {
  text: 'var(--core-color-text-primary)', sub: 'var(--core-color-text-secondary)', mut: 'var(--core-color-text-muted)',
  bd: 'var(--core-color-border-default)', dv: 'var(--core-color-border-divider)',
  card: 'var(--core-color-surface-card)', inset: 'var(--core-color-surface-inset)', selbg: 'var(--core-color-state-selected-bg)',
}
const DEC_TONE = { approve: 'var(--risk-clear)', review: 'var(--risk-watch)', deny: 'var(--risk-high)' }
const DEC_LABEL = { approve: 'Approve', review: 'Review', deny: 'Deny' }
// Flat per-unit vocabulary shown everywhere: what happens when the check
// fails — deny, review, approve (finding only) — or removed from the workflow.
// It reads and writes the underlying config; no separate state.
const outcomeOf = (cfg) => {
  if (!cfg || !cfg.enabled) return 'removed'
  if (cfg.role !== 'decisioning') return 'approve'
  if (cfg.permitted && cfg.permitted.mode === 'lists') return ((cfg.permitted.lists || {}).knock_out || []).length ? 'deny' : 'review'
  const decs = cfg.graded ? Object.values(cfg.graded) : [(cfg.permitted && cfg.permitted.outcome) || 'review']
  return decs.includes('deny') ? 'deny' : 'review'
}
const applyOutcome = (cfg, v) => {
  const next = { ...cfg, enabled: true }
  if (v === 'approve') return { ...next, role: 'informational' }
  next.role = 'decisioning'
  if (next.graded) { const g = { ...next.graded }; for (const k of Object.keys(g)) if (g[k] !== 'approve') g[k] = v; next.graded = g }
  if (next.permitted && next.permitted.mode !== 'lists') next.permitted = { ...next.permitted, outcome: v }
  return next
}
const OUTCOME_TONE = { deny: 'var(--risk-high)', review: 'var(--risk-watch)', approve: 'var(--risk-clear)', removed: C.mut }
const OUTCOME_LABEL = { deny: 'Deny', review: 'Review', approve: 'Approve', removed: 'Removed' }
const VERDICT_TONE = { Approve: 'var(--risk-clear)', Review: 'var(--risk-watch)', Deny: 'var(--risk-high)' }

const panel = (style, ...kids) => h('div', { style: { background: C.card, border: '1px solid ' + C.bd, borderRadius: 'var(--core-radius-card)', overflow: 'hidden', ...(style || {}) } }, ...kids)
const head = (title, right) => h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 20px', borderBottom: '1px solid ' + C.dv } },
  h('span', { style: { fontSize: 14, fontWeight: 600, color: C.text } }, title), right || null)
const mono = (t, extra) => h('span', { style: { fontFamily: 'var(--app-font)', fontSize: 10, fontWeight: 600, letterSpacing: '.03em', textTransform: 'uppercase', color: C.mut, ...(extra || {}) } }, t)
const pill = (t, tone) => h('span', { style: { display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 'var(--core-radius-pill)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: tone, background: 'color-mix(in srgb, ' + tone + ' 11%, ' + C.card + ')', border: '1px solid color-mix(in srgb, ' + tone + ' 30%, ' + C.bd + ')' } }, t)
const seg = (opts, cur, onPick, dataq) => h('div', { style: { display: 'inline-flex', border: '1px solid ' + C.bd, borderRadius: 'var(--core-radius-pill)', overflow: 'hidden', flexShrink: 0 } },
  ...opts.map(([label, val, tone], i) => h('button', { key: val, 'data-q': dataq, onClick: () => onPick(val), style: { padding: '5px 11px', minHeight: 26, border: 0, borderLeft: i > 0 ? '1px solid ' + C.bd : 'none', cursor: 'pointer', font: (cur === val ? '600' : '400') + ' 11.5px/1 var(--app-font)', background: cur === val ? (tone ? 'color-mix(in srgb, ' + tone + ' 12%, ' + C.card + ')' : C.selbg) : C.card, color: cur === val ? C.text : C.mut } }, label)))
const checkbox = (on, onClick, label, key, dataq) => h('button', { key, 'data-q': dataq, onClick, style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', minHeight: 26, borderRadius: 8, cursor: 'pointer', font: '500 11.5px/1.3 var(--app-font)', border: '1px solid ' + (on ? 'var(--core-color-border-strong, ' + C.bd + ')' : C.bd), background: on ? C.selbg : C.card, color: on ? C.text : C.sub, textAlign: 'left' } },
  h('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: on ? C.text : C.mut, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0, opacity: on ? 1 : 0.5 } },
    h('rect', { x: 2, y: 2, width: 12, height: 12, rx: 3 }), on ? h('path', { d: 'M5 8.2l2 2L11.2 6' }) : null),
  label)
const selectEl = (value, opts, onChange, dataq) => h('select', { 'data-q': dataq, value: value || '', onChange: (e) => onChange(e.target.value), style: { padding: '4px 8px', minHeight: 26, borderRadius: 7, border: '1px solid ' + C.bd, background: C.card, font: '500 11.5px var(--app-font)', color: C.text, outline: 'none' } },
  ...opts.map(o => Array.isArray(o) ? h('option', { key: o[1], value: o[1] }, o[0]) : h('option', { key: o, value: o }, o)))

const tierLabel = (id) => (TIERS.find(t => t.id === id) || {}).label || id
const groupsOf = (units) => { const g = []; const seen = {}; for (const u of units) { if (!seen[u.group]) { seen[u.group] = true; g.push(u.group) } } return g }
// Children render nested under their parent.
const orderedUnits = (units) => {
  const roots = units.filter(u => !u.parent_id)
  const out = []
  for (const r of roots) { out.push(r); units.filter(u => u.parent_id === r.id).forEach(c => out.push(c)) }
  for (const u of units) if (!out.includes(u)) out.push(u)
  return out
}

/* Deterministic explainer text assembled from the computed result — it
   explains, it never decides. */
function summaryText(result, business, wf) {
  const parts = ['Under ' + wf.label + ', ' + business.name + ' evaluates to ' + result.verdict + '.']
  if (result.drivers.length) {
    parts.push('Driven by: ' + result.drivers.map(d => '"' + d.unit.text + '" → ' + DEC_LABEL[d.decision] + (d.detail ? ' (' + d.detail + ')' : d.answer ? ' (answered "' + d.answer + '")' : '')).join('; ') + '.')
  } else {
    parts.push('Every check that can decide came back clean; nothing routed to review or decline.')
  }
  if (result.unanswerable.length) parts.push(result.unanswerable.length + ' enabled unit(s) cannot be answered at the current data-policy tier and were excluded.')
  return parts.join(' ')
}

/* ---------- Screen 2: unit detail (generated controls) ---------- */
function UnitDetail({ unit, cfg, setCfg, wf }) {
  const consequence = []
  const rows = []
  // Common controls: enabled, role, tier override
  rows.push(h('div', { key: 'common', style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
    seg([['Deny', 'deny', OUTCOME_TONE.deny], ['Review', 'review', OUTCOME_TONE.review], ['Approve', 'approve', OUTCOME_TONE.approve]], outcomeOf(cfg), v => setCfg(applyOutcome(cfg, v)), unit.id + ':oc'),
    h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
      mono('data tier', { fontSize: 9 }),
      selectEl(cfg.tierOverride || '', [['Workflow default', ''], ...TIERS.map(t => [t.label, t.id])], v => setCfg({ tierOverride: v || null }), unit.id + ':tier')),
    h('button', { 'data-q': unit.id + ':remove', onClick: () => setCfg({ enabled: false }), style: { marginLeft: 'auto', padding: '5px 11px', minHeight: 26, borderRadius: 'var(--core-radius-pill)', border: '1px solid ' + C.bd, background: C.card, cursor: 'pointer', font: '500 11.5px/1 var(--app-font)', color: C.mut } }, 'Remove from workflow')))
  if (cfg.role !== 'decisioning') consequence.push('Approve: the finding displays with data and provenance but never touches the verdict.')

  if (unit.type === 'graded') {
    const mapped = !!unit.answer_mapping
    if (mapped) {
      const map = { ...unit.answer_mapping, ...(cfg.resultAnswer || {}) }
      rows.push(h('div', { key: 't1' }, mono('Check result → your answer'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 } },
          ...(unit.result_values || []).map(rv => h('div', { key: rv, style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('span', { style: { minWidth: 150, fontFamily: 'monospace', fontSize: 11, color: C.sub } }, rv),
            h('span', { style: { color: C.mut, fontSize: 11 } }, '→'),
            selectEl(map[rv], unit.answer_options, v => setCfg({ resultAnswer: { ...(cfg.resultAnswer || {}), [rv]: v } }), unit.id + ':ra:' + rv))))))
      rows.push(h('div', { key: 't2' }, mono('Your answer → decision'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 } },
          ...(unit.answer_options || []).map(a => h('div', { key: a, style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('span', { style: { minWidth: 150, fontSize: 12, color: C.sub } }, a),
            h('span', { style: { color: C.mut, fontSize: 11 } }, '→'),
            seg(Object.entries(DEC_LABEL).map(([v, l]) => [l, v, DEC_TONE[v]]), (cfg.graded || {})[a], v => setCfg({ graded: { ...(cfg.graded || {}), [a]: v } }), unit.id + ':dec:' + a))))))
      consequence.push('The middle column is your policy wording; the check result never reaches the report unmapped.')
    } else {
      rows.push(h('div', { key: 't1u' }, mono('Check result → decision'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 } },
          ...(unit.result_values || []).map(rv => h('div', { key: rv, style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('span', { style: { minWidth: 150, fontFamily: 'monospace', fontSize: 11, color: C.sub } }, rv),
            h('span', { style: { color: C.mut, fontSize: 11 } }, '→'),
            seg(Object.entries(DEC_LABEL).map(([v, l]) => [l, v, DEC_TONE[v]]), (cfg.graded || {})[rv], v => setCfg({ graded: { ...(cfg.graded || {}), [rv]: v } }), unit.id + ':dec:' + rv))))))
      consequence.push('This check has no customer answer vocabulary yet; decisions key directly off result values.')
    }
  }

  if (unit.type === 'permitted_set') {
    const p = cfg.permitted || {}
    const vs = unit.value_space || {}
    if (p.mode === 'lists') {
      rows.push(h('div', { key: 'lists' }, mono('Named lists'),
        ...Object.entries(p.lists || {}).map(([name, vals]) => {
          const outcome = ((vs.lists || []).find(l => l.name === name) || {}).outcome
          return h('div', { key: name, style: { marginTop: 8 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { fontSize: 12, fontWeight: 600, color: C.text } }, name.replace(/_/g, ' ')),
              outcome ? pill(DEC_LABEL[outcome] || outcome, DEC_TONE[outcome] || C.mut) : null),
            h('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 } },
              ...vals.map(v => h('span', { key: v, style: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, border: '1px solid ' + C.bd, background: C.inset, fontFamily: 'monospace', fontSize: 11, color: C.sub } }, v,
                h('button', { onClick: () => setCfg({ permitted: { ...p, lists: { ...p.lists, [name]: vals.filter(x => x !== v) } } }), style: { border: 0, background: 'none', cursor: 'pointer', color: C.mut, padding: 0, fontSize: 11 } }, '×'))),
              h('input', { 'data-q': unit.id + ':list:' + name, placeholder: 'Add code or category', onKeyDown: (e) => { if (e.key === 'Enter' && e.target.value.trim()) { setCfg({ permitted: { ...p, lists: { ...p.lists, [name]: [...vals, e.target.value.trim()] } } }); e.target.value = '' } }, style: { minWidth: 150, padding: '4px 8px', borderRadius: 6, border: '1px solid ' + C.bd, background: C.card, font: '400 11.5px var(--app-font)', color: C.text, outline: 'none' } })))
        })))
      consequence.push('Membership in a list decides directly: knock-out denies, restricted reviews, target approves.')
    } else if (p.mode === 'material') {
      rows.push(h('div', { key: 'mat' }, mono('Material category groups'),
        ...(vs.groups || []).map(g => {
          const on = (p.materialGroups || []).includes(g.name)
          const cats = ADVERSE_GROUPS[g.name] || []
          return h('div', { key: g.name, style: { marginTop: 8 } },
            checkbox(on, () => setCfg({ permitted: { ...p, materialGroups: on ? p.materialGroups.filter(x => x !== g.name) : [...(p.materialGroups || []), g.name] } }), g.name.replace(/_/g, ' ') + ' · ' + g.count + ' categories', g.name, unit.id + ':grp:' + g.name),
            h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5, opacity: on ? 1 : 0.45 } },
              ...cats.map(c => h('span', { key: c, style: { padding: '2px 7px', borderRadius: 6, border: '1px solid ' + C.bd, background: C.inset, fontFamily: 'monospace', fontSize: 10, color: C.sub } }, c))))
        }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 } },
          mono('on a material hit', { fontSize: 9 }),
          seg([['Review', 'review', DEC_TONE.review], ['Deny', 'deny', DEC_TONE.deny]], p.outcome, v => setCfg({ permitted: { ...p, outcome: v } }), unit.id + ':outcome'))))
      consequence.push('Only categories you mark material can trigger; hits elsewhere stay visible as findings and decide nothing.')
      // Surface the taxonomy gap the seed calls out rather than hiding it.
      const gapAnswer = (unit.answer_mapping || {})['__no_backing__']
      if (gapAnswer) rows.push(h('div', { key: 'gap', style: { padding: '8px 10px', borderRadius: 8, border: '1px dashed color-mix(in srgb, var(--risk-elev) 45%, ' + C.bd + ')', background: 'color-mix(in srgb, var(--risk-elev) 6%, ' + C.card + ')', fontSize: 11.5, color: C.sub } },
        'Your policy asks about "' + gapAnswer + '" — no matching category exists in this taxonomy. The gap is shown, not hidden.'))
    } else if (p.mode === 'denied') {
      rows.push(h('div', { key: 'denied' }, mono('Deny list (' + (vs.kind || '').replace(/_/g, ' ') + ')'),
        h('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 } },
          ...(p.denied || []).map(v => h('span', { key: v, style: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, border: '1px solid ' + C.bd, background: C.inset, fontFamily: 'monospace', fontSize: 11, color: C.sub } }, v,
            h('button', { onClick: () => setCfg({ permitted: { ...p, denied: p.denied.filter(x => x !== v) } }), style: { border: 0, background: 'none', cursor: 'pointer', color: C.mut, padding: 0, fontSize: 11 } }, '×'))),
          h('input', { 'data-q': unit.id + ':denied', placeholder: 'Add code (e.g. IR)', onKeyDown: (e) => { if (e.key === 'Enter' && e.target.value.trim()) { setCfg({ permitted: { ...p, denied: [...(p.denied || []), e.target.value.trim().toUpperCase()] } }); e.target.value = '' } }, style: { minWidth: 130, padding: '4px 8px', borderRadius: 6, border: '1px solid ' + C.bd, background: C.card, font: '400 11.5px var(--app-font)', color: C.text, outline: 'none' } })),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 } },
          mono('on a hit', { fontSize: 9 }),
          seg([['Review', 'review', DEC_TONE.review], ['Deny', 'deny', DEC_TONE.deny]], p.outcome, v => setCfg({ permitted: { ...p, outcome: v } }), unit.id + ':outcome'))))
      consequence.push('Observed values on this list trigger the outcome; everything else passes.')
    } else {
      rows.push(h('div', { key: 'allowed' }, mono('Accepted values'),
        h('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 } },
          ...(unit.result_values || []).map(v => checkbox((p.allowed || []).includes(v), () => {
            const on = (p.allowed || []).includes(v)
            setCfg({ permitted: { ...p, allowed: on ? p.allowed.filter(x => x !== v) : [...(p.allowed || []), v] } })
          }, v.replace(/_/g, ' '), v, unit.id + ':allow:' + v))),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 } },
          mono('when not accepted', { fontSize: 9 }),
          seg([['Review', 'review', DEC_TONE.review], ['Deny', 'deny', DEC_TONE.deny]], p.outcome, v => setCfg({ permitted: { ...p, outcome: v } }), unit.id + ':outcome'))))
      consequence.push('An observed value outside the accepted set triggers the outcome; accepted values pass.')
    }
  }

  if (unit.type === 'classification' || unit.type === 'field') {
    rows.push(h('div', { key: 'info', style: { fontSize: 12, color: C.mut } }, 'Produces a value for other units and the report. Nothing to configure beyond scope.'))
  }

  return h('div', { style: { padding: '14px 20px 16px', background: C.inset, borderBottom: '1px solid ' + C.bd, display: 'flex', flexDirection: 'column', gap: 14 } },
    ...rows,
    h('div', { style: { fontSize: 11.5, color: C.mut, lineHeight: 1.5 } }, consequence.join(' ')),
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' } },
      mono('backed by', { fontSize: 9 }),
      ...(unit.backing || []).map(b => h('span', { key: b, style: { fontFamily: 'monospace', fontSize: 10.5, color: C.sub } }, checkLabel(b) + ' (' + tierLabel(checkTier(b)) + ')')),
      mono(unit.combinator === 'first_true' ? 'first true wins' : 'single check', { fontSize: 9, color: C.mut })),
    unit.note ? h('div', { style: { fontSize: 11, color: C.mut, lineHeight: 1.5 } }, unit.note) : null)
}

/* ---------- Screen 1: workflow overview ---------- */
function Overview({ wf, setWf, result, openUnit, setOpenUnit }) {
  const setUnitCfg = (id, patch) => {
    setWf({ ...wf, units: { ...wf.units, [id]: { ...wf.units[id], ...patch } } })
    if (patch.enabled === false) setOpenUnit(null)
  }
  const counts = { deny: 0, review: 0, approve: 0, removed: 0 }
  for (const u of UNITS) counts[outcomeOf(wf.units[u.id])] += 1
  const rowsById = Object.fromEntries(result.rows.map(r => [r.id, r]))
  return h(React.Fragment, null,
    panel({},
      head('Workflow overview', h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
        mono(counts.deny + ' deny · ' + counts.review + ' review · ' + counts.approve + ' approve' + (counts.removed ? ' · ' + counts.removed + ' removed' : '')),
        result.unanswerable.length ? pill(result.unanswerable.length + ' unanswerable at tier', 'var(--risk-elev)') : null)),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', borderBottom: '1px solid ' + C.dv, flexWrap: 'wrap' } },
        mono('data policy', { fontSize: 9 }),
        seg(TIERS.map(t => [t.label, t.id]), wf.dataPolicy, v => setWf({ ...wf, dataPolicy: v }), 'wf:tier'),
        h('span', { style: { fontSize: 11, color: C.mut } }, (TIERS.find(t => t.id === wf.dataPolicy) || {}).detail || '')),
      ...groupsOf(UNITS).flatMap(group => {
        const units = orderedUnits(UNITS.filter(u => u.group === group)).filter(u => (wf.units[u.id] || {}).enabled)
        if (!units.length) return []
        return [
          h('div', { key: 'g' + group, style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '8px 20px', background: C.inset, borderBottom: '1px solid ' + C.bd } },
            mono(group), group === 'Formation Documents' ? h('span', { style: { fontSize: 10.5, color: C.mut } }, 'Retrieval is in scope; document verification is not.') : null),
          ...units.flatMap(u => {
            const cfg = wf.units[u.id]; const row = rowsById[u.id] || {}
            const dim = row.status === 'dependency_off' || row.status === 'unanswerable'
            const open = openUnit === u.id
            const oc = outcomeOf(cfg)
            const els = [h('button', { key: u.id, 'data-q': 'row:' + u.id, onClick: () => setOpenUnit(open ? null : u.id), style: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 20px', paddingLeft: u.parent_id ? 40 : 20, border: 0, borderBottom: '1px solid ' + C.dv, background: open ? C.selbg : 'transparent', cursor: 'pointer', textAlign: 'left', opacity: dim ? 0.5 : 1 } },
              h('span', { style: { flex: 1, minWidth: 0, fontSize: 12.5, color: C.text } }, u.text,
                u.needs_review ? h('span', { style: { marginLeft: 8 } }, mono('needs review', { fontSize: 8, color: 'var(--risk-elev)' })) : null,
                u.parent_id ? h('span', { style: { marginLeft: 8 } }, mono('only if ' + u.parent_answer, { fontSize: 8, textTransform: 'none' })) : null),
              row.status === 'unanswerable' ? mono('dark at tier', { fontSize: 8, color: 'var(--risk-elev)' }) : null,
              row.status === 'dependency_off' ? mono('dependency off', { fontSize: 8 }) : null,
              mono(tierLabel(cfg.tierOverride || u.min_data_policy), { fontSize: 8, textTransform: 'none' }),
              pill(OUTCOME_LABEL[oc], OUTCOME_TONE[oc]))]
            if (open) els.push(h(UnitDetail, { key: u.id + ':detail', unit: u, cfg, setCfg: (patch) => setUnitCfg(u.id, patch), wf }))
            return els
          })]
      })),
    (function () {
      const removed = orderedUnits(UNITS).filter(u => !(wf.units[u.id] || {}).enabled)
      if (!removed.length) return null
      return panel({ marginTop: 14 },
        head('Removed workflow items', mono(removed.length + ' removed')),
        ...removed.map(u => h('div', { key: u.id, 'data-q': 'row:' + u.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', borderBottom: '1px solid ' + C.dv } },
          h('span', { style: { flex: 1, minWidth: 0, fontSize: 12.5, color: C.mut } }, u.text),
          mono(u.group, { fontSize: 8, textTransform: 'none' }),
          h('button', { 'data-q': 'restore:' + u.id, onClick: () => setUnitCfg(u.id, { enabled: true }), style: { padding: '5px 11px', minHeight: 26, borderRadius: 'var(--core-radius-pill)', border: '1px solid ' + C.bd, background: C.card, cursor: 'pointer', font: '500 11.5px/1 var(--app-font)', color: C.sub } }, 'Restore'))))
    })())
}

/* ---------- Screen 3: result ---------- */
function Result({ wf, counterpart, business }) {
  const [active, setActive] = React.useState('this')
  const activeWf = active === 'this' ? wf : counterpart
  const result = evaluate(activeWf, business)
  const decRows = result.rows.filter(r => r.status === 'evaluated' && r.role === 'decisioning' && r.decision)
  const infoRows = result.rows.filter(r => (r.status === 'evaluated' && r.role !== 'decisioning') || ['unanswerable', 'not_applicable'].includes(r.status))
  const policyRank = TIER_RANK[activeWf.dataPolicy] ?? 0
  return h(React.Fragment, null,
    panel({},
      head(business.name, h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
        seg([[wf.label, 'this'], [counterpart.label, 'other']], active, setActive, 'ab'),
        pill('Verdict: ' + result.verdict, VERDICT_TONE[result.verdict]))),
      h('div', { style: { padding: '12px 20px', borderBottom: '1px solid ' + C.dv, fontSize: 12.5, lineHeight: 1.55, color: C.sub } },
        h('span', { style: { display: 'block', marginBottom: 4 } }, mono('AI summary · explains the verdict, never produces it', { fontSize: 8 })),
        summaryText(result, business, activeWf)),
      head('Decisions', mono(decRows.length + ' evaluated')),
      ...decRows.map((r, i) => h('div', { key: r.id, style: { padding: '9px 20px', borderBottom: '1px solid ' + C.dv } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } },
          h('span', { style: { fontSize: 12.5, color: C.text, minWidth: 0 } }, r.unit.text),
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 } },
            h('span', { style: { fontSize: 11.5, color: C.mut } }, r.answer !== undefined ? String(r.answer) : (r.detail || '')),
            pill(DEC_LABEL[r.decision], DEC_TONE[r.decision]))),
        r.detail && r.answer !== undefined ? h('div', { style: { fontSize: 11, color: C.mut, marginTop: 3 } }, r.detail) : null,
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 } },
          ...(r.observations || []).map((o, oi) => {
            const outOfTier = (TIER_RANK[checkTier(o.check)] ?? 0) > policyRank
            return h('span', { key: oi, style: { display: 'inline-flex', alignItems: 'baseline', gap: 6, padding: '3px 8px', borderRadius: 6, border: '1px solid ' + C.bd, background: C.inset, opacity: outOfTier ? 0.6 : 1 } },
              mono(checkLabel(o.check), { fontSize: 8, textTransform: 'none', letterSpacing: 0 }),
              h('span', { style: { fontSize: 11, color: C.sub } }, o.detail),
              outOfTier ? mono('outside tier · shown, not counted', { fontSize: 8, color: 'var(--risk-elev)' }) : null)
          })))),
      head('Findings', mono('shown with data and provenance · outside the decision')),
      ...infoRows.map(r => h('div', { key: r.id, style: { padding: '8px 20px', borderBottom: '1px solid ' + C.dv } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } },
          h('span', { style: { fontSize: 12, color: C.sub, minWidth: 0 } }, r.unit.text),
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 } },
            r.status === 'unanswerable' ? mono('unanswerable at tier', { fontSize: 8, color: 'var(--risk-elev)' })
              : r.status === 'not_applicable' ? mono('not applicable', { fontSize: 8 })
              : h('span', { style: { fontSize: 11.5, color: C.mut } }, r.value !== undefined ? String(r.value) : r.answer !== undefined ? String(r.answer) : (r.detail || String(r.result || ''))))),
        r.status !== 'not_applicable' && (r.observations || []).length ? h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 } },
          ...(r.observations || []).map((o, oi) => {
            const outOfTier = (TIER_RANK[checkTier(o.check)] ?? 0) > policyRank
            return h('span', { key: oi, style: { display: 'inline-flex', alignItems: 'baseline', gap: 6, padding: '3px 8px', borderRadius: 6, border: '1px solid ' + C.bd, background: C.inset, opacity: outOfTier ? 0.6 : 1 } },
              mono(checkLabel(o.check), { fontSize: 8, textTransform: 'none', letterSpacing: 0 }),
              h('span', { style: { fontSize: 11, color: C.sub } }, o.detail),
              outOfTier ? mono('outside tier · shown, not counted', { fontSize: 8, color: 'var(--risk-elev)' }) : null)
          })) : null))))
}

/* ---------- Wrapper: tabs + per-policy in-memory workflow ---------- */
export default function PolicyBuilder({ policyKey, baseWorkflow, counterpart }) {
  const [tab, setTab] = React.useState('overview')
  const [openUnit, setOpenUnit] = React.useState(null)
  const [wfs, setWfs] = React.useState({})
  // Switching policies resets the view state; per-policy edits survive in wfs.
  const [lastKey, setLastKey] = React.useState(policyKey)
  if (lastKey !== policyKey) { setLastKey(policyKey); setTab('overview'); setOpenUnit(null) }
  const wf = wfs[policyKey] || baseWorkflow
  const setWf = (next) => setWfs({ ...wfs, [policyKey]: next })
  const result = evaluate(wf, BUSINESS)
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      seg([['Overview', 'overview'], ['Result', 'result']], tab, setTab, 'tab'),
      mono('edits are local to this prototype', { fontSize: 9 })),
    tab === 'overview'
      ? h(Overview, { wf, setWf, result, openUnit, setOpenUnit })
      : h(Result, { key: policyKey, wf, counterpart, business: BUSINESS }))
}
