import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { shouldCloseOnBackdropClick } from './puzzleInput'
import './Dialog.css'

interface Props {
  /** 見出し。開くとここへフォーカスが移り、aria-labelledby で名前になる */
  title: ReactNode
  onClose: () => void
  /** 見出しの下に置く補足（成績の表示など）。スクロールしない */
  meta?: ReactNode
  /** 本文。長いときはここだけがスクロールする */
  children: ReactNode
  /** 画面の下部に固定する領域（回答欄・閉じるボタンなど）。省略できる */
  footer?: ReactNode
  /** 外側のパネルへ足すクラス名（画面ごとの見た目の調整用） */
  className?: string
}

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

// 重なって開いたときも、最後の 1 つが閉じるまで背景のスクロールを止めておく
let scrollLocks = 0
let savedOverflow = ''

function lockScroll() {
  if (scrollLocks === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLocks += 1
}

function unlockScroll() {
  scrollLocks -= 1
  if (scrollLocks === 0) document.body.style.overflow = savedOverflow
}

/**
 * 画面に重ねて出すダイアログの共通部品。
 * - role="dialog"・aria-modal・aria-labelledby を持つ
 * - 開くと見出しへフォーカスを移し、Tab はダイアログの中だけを巡る
 * - Esc で閉じる。閉じると、開く前にフォーカスのあった要素へ戻す
 * - 開いている間は背景をスクロールさせない
 * - 本文だけがスクロールし、footer は下部に残る
 */
export function Dialog({ title, onClose, meta, children, footer, className }: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  // 押し始めた位置。パネル内で押して背景で離したときに閉じないよう、クリックと合わせて判定する
  const pressTargetRef = useRef<EventTarget | null>(null)
  // 親が毎回新しい関数を渡しても、フォーカスの処理を再実行しないように参照で持つ
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const opener = document.activeElement
    lockScroll()
    titleRef.current?.focus({ preventScroll: true })

    const panel = panelRef.current
    const focusables = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : []

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.isComposing) {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        titleRef.current?.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!panel.contains(active) || active === titleRef.current) {
        // 見出し（または外）から Tab で入るときは先頭、Shift+Tab のときは末尾へ
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    // 画面の読み上げなどでフォーカスが外へ出たら、ダイアログの中へ引き戻す
    const onFocusIn = (e: FocusEvent) => {
      if (panel && e.target instanceof Node && !panel.contains(e.target)) {
        titleRef.current?.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      unlockScroll()
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true })
      }
    }
  }, [])

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => {
        pressTargetRef.current = e.target
      }}
      onClick={(e) => {
        const press = pressTargetRef.current
        pressTargetRef.current = null
        if (shouldCloseOnBackdropClick(press, e.target, e.currentTarget)) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={`dialog ${className ?? ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="dialog-header">
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="dialog-title">
            {title}
          </h2>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
          {meta}
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </div>
    </div>
  )
}
