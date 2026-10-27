'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useFoodLoop } from '@/lib/foodloop/store'
import type { FoodCategory, RequirementDiet } from '@/lib/foodloop/types'
import { CATEGORY_LABEL, REQUIREMENT_DIET_LABEL, toLocalInputValue } from '@/lib/foodloop/utils'
import { Field, NativeSelect } from '../shared'

type Errors = Partial<Record<'title' | 'meals' | 'neededBy', string>>

export function RequirementForm({ onPosted }: { onPosted: () => void }) {
  const { state, dispatch, currentUser } = useFoodLoop()
  const [title, setTitle] = useState('')
  const [meals, setMeals] = useState('')
  const [diet, setDiet] = useState<RequirementDiet>('any')
  const [categories, setCategories] = useState<FoodCategory[]>([])
  const [transport, setTransport] = useState(false)
  const [neededBy, setNeededBy] = useState(() => toLocalInputValue(state.now + 6 * 3_600_000))
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  if (!currentUser) return null

  function toggleCategory(c: FoodCategory) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Errors = {}
    const count = Number(meals)
    const neededMs = new Date(neededBy).getTime()
    if (title.trim().length < 3) next.title = 'Describe the requirement (at least 3 characters).'
    if (!Number.isInteger(count) || count < 1 || count > 5000)
      next.meals = 'Enter a whole number of meals between 1 and 5000.'
    if (Number.isNaN(neededMs) || neededMs <= Date.now()) next.neededBy = 'Choose a future time.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    dispatch({
      type: 'ADD_REQUIREMENT',
      requirement: {
        acceptorId: currentUser!.id,
        title: title.trim().slice(0, 100),
        meals: count,
        diet,
        categories,
        transportAvailable: transport,
        neededBy: new Date(neededMs).toISOString(),
        location: currentUser!.location,
        notes: notes.trim().slice(0, 300) || undefined,
      },
    })
    onPosted()
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-2 sm:p-6"
    >
      <div className="sm:col-span-2">
        <h2 className="font-semibold">Post a food requirement</h2>
        <p className="text-sm text-muted-foreground">
          {`We'll automatically match approved donations near ${currentUser.location.name}.`}
        </p>
      </div>
      <Field label="Requirement" htmlFor="title" error={errors.title} className="sm:col-span-2">
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Dinner for 50 shelter residents"
          maxLength={100}
          aria-invalid={!!errors.title}
        />
      </Field>
      <Field label="Number of meals" htmlFor="meals" error={errors.meals}>
        <Input
          id="meals"
          type="number"
          inputMode="numeric"
          min={1}
          value={meals}
          onChange={(e) => setMeals(e.target.value)}
          placeholder="50"
          aria-invalid={!!errors.meals}
        />
      </Field>
      <Field label="Dietary preference" htmlFor="diet">
        <NativeSelect id="diet" value={diet} onChange={(e) => setDiet(e.target.value as RequirementDiet)}>
          {Object.entries(REQUIREMENT_DIET_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Needed by" htmlFor="neededBy" error={errors.neededBy}>
        <Input
          id="neededBy"
          type="datetime-local"
          value={neededBy}
          onChange={(e) => setNeededBy(e.target.value)}
          aria-invalid={!!errors.neededBy}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Transport</span>
        <label className="flex h-8 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={transport}
            onChange={(e) => setTransport(e.target.checked)}
            className="size-4 accent-primary"
          />
          We have our own vehicle (wider match radius)
        </label>
      </div>
      <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
        <legend className="mb-1.5 text-sm font-medium">Food categories (leave empty for any)</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABEL) as FoodCategory[]).map((c) => {
            const active = categories.includes(c)
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => toggleCategory(c)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-primary text-primary-foreground ring-primary'
                    : 'bg-background text-foreground ring-border hover:bg-muted',
                )}
              >
                {CATEGORY_LABEL[c]}
              </button>
            )
          })}
        </div>
      </fieldset>
      <Field label="Notes (optional)" htmlFor="reqNotes" className="sm:col-span-2">
        <Textarea
          id="reqNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Allergies, delivery instructions, contact person..."
          maxLength={300}
        />
      </Field>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" size="lg">
          Post requirement
        </Button>
      </div>
    </form>
  )
}
