import { cn } from '@/lib/utils'
import { WORKFLOW, type DonationStatus } from '@/lib/foodloop/types'
import { STATUS_LABEL } from '@/lib/foodloop/utils'

export function WorkflowProgress({ status }: { status: DonationStatus }) {
  if (status === 'rejected') return null
  const current = WORKFLOW.indexOf(status)

  return (
    <div>
      <p className="sr-only">
        {`Step ${current + 1} of ${WORKFLOW.length}: ${STATUS_LABEL[status]}`}
      </p>
      <ol className="flex gap-1" aria-hidden="true">
        {WORKFLOW.map((step, i) => (
          <li key={step} className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              className={cn(
                'h-1.5 rounded-full transition-colors',
                i < current && 'bg-primary/70',
                i === current && 'bg-primary',
                i > current && 'bg-muted',
              )}
            />
            <span
              className={cn(
                'hidden truncate text-[10px] sm:block',
                i === current ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {STATUS_LABEL[step]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
