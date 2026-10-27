'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarDisplay({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      <span className="sr-only">{`${rating.toFixed(1)} out of 5 stars`}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn(
            'size-3.5',
            n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30',
          )}
        />
      ))}
    </span>
  )
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="rounded-md p-1 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            aria-hidden="true"
            className={cn(
              'size-7',
              n <= value ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/40',
            )}
          />
        </button>
      ))}
    </div>
  )
}
