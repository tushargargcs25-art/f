import { cn } from '@/lib/utils'
import type { DonationStatus, Urgency } from '@/lib/foodloop/types'
import { STATUS_LABEL } from '@/lib/foodloop/utils'

const STATUS_STYLES: Record<DonationStatus, string> = {
  posted: 'bg-stone-100 text-stone-700 ring-stone-200',
  approved: 'bg-sky-50 text-sky-800 ring-sky-200',
  claimed: 'bg-violet-50 text-violet-800 ring-violet-200',
  assigned: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  picked_up: 'bg-amber-50 text-amber-800 ring-amber-200',
  delivered: 'bg-teal-50 text-teal-800 ring-teal-200',
  completed: 'bg-secondary text-secondary-foreground ring-primary/20',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
}

export function StatusBadge({ status, className }: { status: DonationStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

const URGENCY_STYLES: Record<Urgency, { label: string; className: string; dot: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-50 text-red-700 ring-red-200',
    dot: 'bg-red-500 animate-pulse',
  },
  high: { label: 'Urgent', className: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  normal: {
    label: 'On track',
    className: 'bg-secondary text-secondary-foreground ring-primary/15',
    dot: 'bg-primary',
  },
  expired: { label: 'Expired', className: 'bg-stone-100 text-stone-500 ring-stone-200', dot: 'bg-stone-400' },
}

export function UrgencyBadge({ urgency, label }: { urgency: Urgency; label?: string }) {
  const style = URGENCY_STYLES[urgency]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        style.className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden="true" />
      {label ?? style.label}
    </span>
  )
}

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}
