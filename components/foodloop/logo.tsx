import { RefreshCcw } from 'lucide-react'

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <RefreshCcw className="size-4" aria-hidden="true" />
      </span>
      FoodLoop
    </span>
  )
}
