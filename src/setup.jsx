import React from 'react'
import { Field, FieldLabel, Input, ActionButton } from './ds.js'

/* Invite acceptance — the first screen a new user lands on. A verification
   code was "sent" to the invited email (fixed, it came with the invite);
   entering any 6 digits continues into Intelligence. Prototype only:
   nothing is validated or stored. */
const INVITED_EMAIL = 'dana.melas@mercury.com'
const CODE_LEN = 5

function CodeInput({ value, onChange }) {
  const refs = React.useRef([])
  const digits = Array.from({ length: CODE_LEN }, (_, i) => value[i] || '')

  const setAt = (i, ch) => {
    const next = digits.slice()
    next[i] = ch
    onChange(next.join(''))
  }
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus()
      setAt(i - 1, '')
      e.preventDefault()
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < CODE_LEN - 1) refs.current[i + 1]?.focus()
  }
  const onInput = (i, e) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1)
    setAt(i, ch)
    if (ch && i < CODE_LEN - 1) refs.current[i + 1]?.focus()
  }
  const onPaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, CODE_LEN)
    if (!text) return
    e.preventDefault()
    onChange(text)
    refs.current[Math.min(text.length, CODE_LEN - 1)]?.focus()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${CODE_LEN}, 1fr)`, gap: 8 }} onPaste={onPaste}>
      {digits.map((d, i) => (
        <Input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          value={d}
          autoFocus={i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${CODE_LEN}`}
          onChange={(e) => onInput(i, e)}
          onKeyDown={(e) => onKey(i, e)}
          onFocus={(e) => e.target.select()}
          style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, minHeight: 48, padding: 0 }}
        />
      ))}
    </div>
  )
}

/* The invite lives at an opaque, user-specific URL. The token is
   cryptographically random and carries no PII (never the email) — in
   production it would be minted server-side, single-use, and expiring. */
function inviteToken() {
  let t = null
  try { t = localStorage.getItem('mid-invite-token') } catch (e) {}
  if (!t || /[^A-Za-z0-9]/.test(t)) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const bytes = crypto.getRandomValues(new Uint8Array(24))
    t = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
    try { localStorage.setItem('mid-invite-token', t) } catch (e) {}
  }
  return t
}

export default function PasswordSetup({ onComplete }) {
  const [code, setCode] = React.useState('')

  // Respect the theme the user last picked inside the app, and surface the
  // invite's unique URL while this screen is up.
  React.useEffect(() => {
    try {
      const ui = JSON.parse(localStorage.getItem('mid-ui') || '{}')
      if (ui.theme === 'dark') document.body.setAttribute('data-theme', 'dark')
    } catch (e) {}
    try { window.history.replaceState(null, '', '/invite?=' + inviteToken()) } catch (e) {}
  }, [])

  const ready = code.length === CODE_LEN
  const submit = (e) => {
    e.preventDefault()
    if (ready) onComplete()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: 'var(--core-color-surface-canvas)',
      color: 'var(--core-color-text-primary)',
    }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* brand lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <svg width={25} height={14} viewBox="0 0 30 16" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M14.868 15.99V15.995H17.8334V13.2048V13.2011H17.8294L4.14417 0H1.18008V2.79517L14.868 15.99ZM0 15.995H4.48643V11.7661H0V15.995ZM26.7415 15.99V15.995H29.7069V13.2048V13.2011H29.7029L22.8603 6.60055L16.0177 0H13.0536V2.79517L26.7415 15.99Z" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>Middesk</span>
        </div>

        <div style={{
          background: 'var(--core-color-surface-card)',
          border: '1px solid var(--core-color-border-default)',
          borderRadius: 12,
          padding: '28px 28px 24px',
          boxShadow: '0 1px 2px rgba(16,24,40,.04)',
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.01em' }}>Check your email</div>
            <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.45, color: 'var(--core-color-text-muted)' }}>
              You&rsquo;ve been invited to Middesk. We sent a 5-digit verification code to your email.
            </div>
          </div>

          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <Field isDisabled>
              <FieldLabel htmlFor="setup-email">Email</FieldLabel>
              <Input id="setup-email" type="email" value={INVITED_EMAIL} disabled readOnly autoComplete="username" />
            </Field>
            <Field>
              <FieldLabel>Verification code</FieldLabel>
              <CodeInput value={code} onChange={setCode} />
            </Field>
            <ActionButton type="submit" variant="primary" size="standard" disabled={!ready} style={{ marginTop: 6, width: '100%' }}>
              Continue
            </ActionButton>
            <div style={{ fontSize: 12, textAlign: 'center', color: 'var(--core-color-text-muted)' }}>
              Didn&rsquo;t get it?{' '}
              <button type="button" onClick={() => setCode('')} style={{
                background: 'none', border: 0, padding: 0, font: 'inherit', fontWeight: 500,
                color: 'var(--core-color-text-primary)', cursor: 'pointer', textDecoration: 'underline',
              }}>Resend code</button>
            </div>
          </form>
        </div>

        <div style={{ fontSize: 12, textAlign: 'center', color: 'var(--core-color-text-muted)' }}>
          Invited by your workspace admin
        </div>
      </div>
    </div>
  )
}
