// Report C chat rail: a report-scoped assistant docked on the right edge of
// the Report C screen, with a drag-adjustable divider against the report
// panel. Prototype behavior: fresh conversation per visit (the screen
// remounts on view change), canned answers about the loaded business.
import React from 'react'

import { ChatComposer, ChatLog, ChatMessage, ChatSuggestions } from '../ds.js'

// Canned assistant answers, first match wins against the lowercased
// question. Figures come from the record where trivial so the copy stays
// honest if the fixture changes.
const answerFor = (text, business) => {
  const q = text.toLowerCase()
  const visits = business.traffic.monthlyVisits.toLocaleString()
  const topCountry = business.traffic.topCountries[0]
  const rules = [
    [
      /traffic|vietnam|visit|similarweb|keyword/,
      `The traffic profile does not match a New York physical therapy clinic. Of roughly ${visits} monthly visits, ` +
        `${Math.round(topCountry.share * 100)}% originate from ${topCountry.name}, and the top search keywords point at a generic ` +
        'fitness tool page rather than local patients. Treat the site as weak evidence of real operations.',
    ],
    [
      /name|mismatch|physical therapy|legal/,
      `The submitted name ${business.name} does not match the Secretary of State registration, which is filed as ` +
        `${business.names.find((n) => n.type === 'registration')?.name} (NY file ${business.registrations[0].fileNumber}, ` +
        'active). This is likely a shortened trade name, but it is currently unverified. A DBA filing or an updated ' +
        'state record would resolve it.',
    ],
    [
      /connect|related|shared address|801/,
      `${business.connections.length} entities are connected through shared addresses: ` +
        business.connections
          .map((c) => `${c.name} (${Math.round(c.confidence * 100)}% confidence)`)
          .join(' and ') +
        '. Shared commercial suites are common in Manhattan, so review the office-address entity first.',
    ],
    [
      /people|officer|joshua|gee|person/,
      `One individual is on record: ${business.people[0]?.name ?? 'none listed'}, with no listed title. The only other ` +
        'party is the registered entity itself, listed for service of process.',
    ],
    [
      /tin|ein|tax/,
      'No TIN was submitted, so the IRS match could not run. That leaves tax identity unverified; request the EIN before approval.',
    ],
    [
      /approve|decision|recommend|risk|review|score/,
      `Risk sits at ${business.risk.score}, ${business.risk.level}. Strong signals: the state filing is active and domestic, ` +
        'the office address is verified, deliverable, and commercial, and watchlists are clear. Open items: the business ' +
        'name and people checks are unverified, the TIN is missing, and web traffic looks synthetic. I would hold ' +
        'approval until the name mismatch and TIN are resolved.',
    ],
    [
      /website|domain|online|squarespace|whois/,
      `${business.website.url.replace(/^https?:\/\//, '')} is online, built on ${business.website.platform}. The domain was ` +
        `created in ${business.website.domainCreated.slice(0, 4)}, before the entity formed, which is plausible for a ` +
        'practice that renamed. Content matches a concierge physical therapy business.',
    ],
  ]
  const hit = rules.find(([re]) => re.test(q))
  return hit
    ? hit[1]
    : 'I can answer questions about this report. Try the business name mismatch, the web traffic pattern, the address connections, or whether this file is ready to approve.'
}

const SUGGESTIONS = [
  { id: 'traffic', label: 'Why is the web traffic suspicious?' },
  { id: 'name', label: 'Explain the business name mismatch' },
  { id: 'connections', label: 'What is connected to this business?' },
]

const WELCOME =
  'I have the full report for this business loaded. Ask me about anything in it: verification results, web traffic, connections, or what to do next.'

// Renders as two flex siblings: the resize handle (a hoverable hairline) and
// the chat rail itself. The rail is chromeless so the app canvas shows
// through, seamless against the report panel beside it.
// Proportional split bounds: the chat can take between 18% and 55% of the
// row, so it stays fluid at every window size instead of a fixed width.
const MIN_PCT = 0.18
const MAX_PCT = 0.55
const DEFAULT_PCT = 0.28

export default function ReportChatPanel({ business }) {
  // The divider sets a share of the split rather than a pixel width, so
  // resizing the window keeps the proportion.
  const [pct, setPct] = React.useState(DEFAULT_PCT)
  const [isResizing, setResizing] = React.useState(false)
  const clampPct = (p) => Math.min(MAX_PCT, Math.max(MIN_PCT, p))
  const pctFromPointer = (e) => {
    const row = e.currentTarget.parentElement.getBoundingClientRect()
    return clampPct((row.right - e.clientX) / row.width)
  }
  const handleProps = {
    role: 'separator',
    tabIndex: 0,
    'aria-orientation': 'vertical',
    'aria-valuemin': Math.round(MIN_PCT * 100),
    'aria-valuemax': Math.round(MAX_PCT * 100),
    'aria-valuenow': Math.round(pct * 100),
    onPointerDown: (e) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      setResizing(true)
    },
    onPointerMove: (e) => {
      if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) return
      setPct(pctFromPointer(e))
    },
    onPointerUp: () => setResizing(false),
    onPointerCancel: () => setResizing(false),
    onKeyDown: (e) => {
      const step = e.shiftKey ? 0.08 : 0.02
      let next = null
      if (e.key === 'ArrowLeft') next = pct + step
      else if (e.key === 'ArrowRight') next = pct - step
      else if (e.key === 'Home') next = MIN_PCT
      else if (e.key === 'End') next = MAX_PCT
      if (next === null) return
      e.preventDefault()
      setPct(clampPct(next))
    },
    onDoubleClick: () => setPct(DEFAULT_PCT),
  }
  const [hover, setHover] = React.useState(false)

  const [messages, setMessages] = React.useState([{ id: 0, role: 'assistant', text: WELCOME }])
  const [input, setInput] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const timerRef = React.useRef(null)
  React.useEffect(() => () => clearTimeout(timerRef.current), [])

  const send = (raw) => {
    const text = (raw ?? input).trim()
    if (!text || busy) return
    setInput('')
    setBusy(true)
    setMessages((m) => [...m, { id: m.length, role: 'user', text }])
    timerRef.current = setTimeout(() => {
      setMessages((m) => [...m, { id: m.length, role: 'assistant', text: answerFor(text, business) }])
      setBusy(false)
    }, 700)
  }

  const active = hover || isResizing
  return (
    <>
      <div
        {...handleProps}
        aria-label='Resize chat panel'
        style={{
          width: 10,
          flexShrink: 0,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          touchAction: 'none',
          outline: 'none',
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* No standing stroke: the card edge is the drag bar. A grab
            highlight appears only on hover/drag. */}
        <div
          style={{
            width: active ? 3 : 1,
            borderRadius: 2,
            background: active ? 'var(--core-color-interactive-default)' : 'transparent',
          }}
        />
      </div>
      <aside
        style={{ width: `${(pct * 100).toFixed(2)}%`, flexShrink: 0, minWidth: 280, display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '18px 18px 6px' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '.05em',
              textTransform: 'uppercase',
              color: 'var(--core-color-text-muted)',
            }}
          >
            Report assistant
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--core-color-text-secondary)', marginTop: 2 }}>
            {business.name}
          </div>
        </div>
        <ChatLog label='Report assistant conversation'>
          {messages.map((m) => (
            <ChatMessage key={m.id} role={m.role}>
              {m.text}
            </ChatMessage>
          ))}
          {messages.length === 1 ? (
            <ChatSuggestions suggestions={SUGGESTIONS} onSelect={(s) => send(s.label)} disabled={busy} />
          ) : null}
          {busy ? <ChatMessage role='assistant' pending /> : null}
        </ChatLog>
        <div style={{ padding: '0 14px 8px' }}>
          <ChatComposer
            value={input}
            onChange={setInput}
            onSubmit={send}
            isStreaming={busy}
            placeholder='Ask about this business'
            label='Report chat'
          />
          <div
            style={{
              fontSize: 11,
              color: 'var(--core-color-text-muted)',
              textAlign: 'center',
              padding: '8px 4px 6px',
            }}
          >
            AI-generated. Verify important details in the report.
          </div>
        </div>
      </aside>
    </>
  )
}
