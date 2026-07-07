import { X } from 'lucide-react'
import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="space-y-1.5 text-xs font-medium text-white/80">
      <span>{label}</span>
      {children}
      {hint ? <span className="block text-[11px] font-normal text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null

  return (
    <div className="modal-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={cn(
          'modal-content max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border border-border/40 bg-card shadow-2xl sm:rounded-3xl',
          wide ? 'sm:max-w-5xl' : 'sm:max-w-2xl',
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border/30 bg-card/95 p-4 backdrop-blur sm:p-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
            {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  )
}
