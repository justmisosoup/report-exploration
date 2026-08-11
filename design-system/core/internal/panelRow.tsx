/**
 * THE PANEL LIST-ROW ANATOMY — glyph · title · gist · trailing meta.
 *
 * One grammar, two semantics. A row in a panel BODY is a `<button>`
 * (`FloatingPanelRow`); the same row inside a picker's popover is a
 * `role='option'` (`ListPicker`). They must look identical and they must not
 * be drawn twice, so the visual content lives here and each surface supplies
 * its own interactive shell.
 *
 * `FloatingPanelRowsSkeleton` mirrors these exact boxes — it is the loading
 * state for this row, and the two are only honest together.
 *
 * Internal: product code composes `FloatingPanelRow` or `ListPicker`, never
 * this.
 */
import type React from 'react'

import { cn } from '@/utils/twUtils'

export type PanelRowContentProps = {
  /** Leading glyph — an icon, a status dot, an avatar. Decorative: it sits in
   *  an `aria-hidden` box, so it must never carry the row's only meaning. */
  icon?: React.ReactNode
  /** First line. Truncates. */
  title: React.ReactNode
  /** Second line. Truncates. Its absence switches the row to single-line
   *  alignment rather than leaving a hanging gap. */
  gist?: React.ReactNode
  /** Trailing metadata — a relative time, a count, a check. Never truncates;
   *  the text column shrinks around it. */
  meta?: React.ReactNode
}

/** The fixed leading column. Every row reserves it whether or not it has a
 *  glyph, so titles down the list share one left edge. */
const ICON_BOX = 'flex h-5 w-5 shrink-0 items-center justify-center'

export const PanelRowContent = ({
  gist,
  icon,
  meta,
  title
}: PanelRowContentProps) => (
  <>
    {icon != null && (
      <span aria-hidden='true' className={ICON_BOX}>
        {icon}
      </span>
    )}
    <span className='flex min-w-0 flex-1 flex-col'>
      <span className='min-w-0 truncate text-sm font-medium leading-tight'>
        {title}
      </span>
      {gist != null && (
        <span className='mt-0.5 min-w-0 truncate text-caption leading-tight text-[var(--core-color-text-secondary)]'>
          {gist}
        </span>
      )}
    </span>
    {meta != null && (
      <span
        className={cn(
          // tabular figures so a column of relative times never jitters as
          // it re-renders ("2m" → "11m" must not shift the row)
          'shrink-0 text-caption tabular-nums',
          // `text-secondary`, not `text-muted`. Muted on a popover surface
          // measures 4.49:1 in dark — under AA for text this size (it passes
          // at 5.63:1 in light, so it only fails on one side). The meta is
          // information, not decoration: a thread's age is why you pick it.
          // Hierarchy still reads, carried by the title's weight and this
          // column's position rather than by a third grey.
          'text-[var(--core-color-text-secondary)]',
          gist != null && 'self-start pt-px'
        )}
      >
        {meta}
      </span>
    )}
  </>
)

/** Layout for the row's own shell — shared so the button and the option can
 *  never drift apart. A two-line row aligns to the top; a one-line row
 *  centres. */
export const panelRowShell = (hasGist: boolean) =>
  cn(
    'flex w-full gap-2.5 rounded-control px-2.5 py-2 text-left',
    hasGist ? 'items-start' : 'items-center'
  )
