import { type ReactNode, useId, useRef } from 'react'
import { useModal } from './modal.ts'

export const SECONDARY_BUTTON = 'rounded-[5px] border border-line-strong bg-paper px-3 py-2 text-[11px] text-ink'
export const PRIMARY_BUTTON = 'rounded-[5px] border border-ink bg-ink px-3 py-2 text-[11px] font-semibold text-sheet'

/**
 * A small modal that asks before something can't be undone. Render it to
 * open it; Escape or a click on the backdrop calls `onClose`. The action
 * marked `data-autofocus` takes focus first, so make that the safe one.
 */
export function ConfirmDialog({ title, children, actions, onClose }: { title: string; children: ReactNode; actions: ReactNode; onClose(): void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const trapFocus = useModal(ref)

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={trapFocus}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto w-[calc(100%-32px)] max-w-[420px] rounded-[10px] border border-line-strong bg-sheet p-0 text-ink shadow-[0_20px_70px_#14321e40] backdrop:bg-[#0d291a70] backdrop:backdrop-blur-[2px]"
    >
      <div className="px-6 pt-6 pb-5">
        <h2 id={titleId} className="font-display text-[22px] leading-[1.2] font-normal tracking-[-.02em]">
          {title}
        </h2>
        <div className="mt-3 text-[12px] leading-[1.65] text-ink-soft">{children}</div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{actions}</div>
    </dialog>
  )
}
