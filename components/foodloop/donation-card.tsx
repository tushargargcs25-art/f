import { Clock, MapPin, Package, Thermometer } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import type { Donation } from '@/lib/foodloop/types'
import {
  CATEGORY_LABEL,
  DONATION_DIET_LABEL,
  STORAGE_LABEL,
  formatDateTime,
  formatTimeLeft,
  getUrgency,
} from '@/lib/foodloop/utils'
import { Chip, StatusBadge, UrgencyBadge } from './badges'
import { WorkflowProgress } from './workflow-progress'

const ACTIVE_FOR_URGENCY = new Set(['posted', 'approved', 'claimed', 'assigned'])

export function DonationCard({
  donation,
  now,
  subtitle,
  meta,
  actions,
}: {
  donation: Donation
  now: number
  subtitle?: string
  meta?: React.ReactNode
  actions?: React.ReactNode
}) {
  const showUrgency = ACTIVE_FOR_URGENCY.has(donation.status)
  const urgency = getUrgency(donation.pickupDeadline, now)

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{donation.foodName}</h3>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={donation.status} />
          {showUrgency && (
            <UrgencyBadge urgency={urgency} label={formatTimeLeft(donation.pickupDeadline, now)} />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div className="flex items-center gap-1.5">
            <Package className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">Quantity</dt>
            <dd className="tabular-nums">{`${donation.quantity} servings`}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Thermometer className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">Storage</dt>
            <dd>{STORAGE_LABEL[donation.storage]}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">Location</dt>
            <dd className="truncate">{donation.location.name}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">Pickup deadline</dt>
            <dd className="truncate">{formatDateTime(donation.pickupDeadline)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{CATEGORY_LABEL[donation.category]}</Chip>
          <Chip>{DONATION_DIET_LABEL[donation.diet]}</Chip>
        </div>
        {donation.notes && (
          <p className="text-xs text-muted-foreground text-pretty">{donation.notes}</p>
        )}
        {donation.status === 'rejected' && donation.rejectionReason && (
          <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
            {`Rejected: ${donation.rejectionReason}`}
          </p>
        )}
        {meta}
        <WorkflowProgress status={donation.status} />
      </CardContent>
      {actions && <CardFooter className="flex flex-wrap gap-2">{actions}</CardFooter>}
    </Card>
  )
}

export function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
}
