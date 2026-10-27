'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PLACES } from '@/lib/foodloop/places'
import { toDonation, useFoodLoop, type ApiDonation } from '@/lib/foodloop/store'
import type { DonationDiet, FoodCategory, StorageCondition } from '@/lib/foodloop/types'
import {
  CATEGORY_LABEL,
  DONATION_DIET_LABEL,
  STORAGE_LABEL,
  toLocalInputValue,
} from '@/lib/foodloop/utils'
import { Field, NativeSelect } from '../shared'

type Errors = Partial<Record<'foodName' | 'quantity' | 'deadline', string>>

export function DonationForm({ onPosted }: { onPosted: () => void }) {
  const { state, dispatch, currentUser } = useFoodLoop()
  const [foodName, setFoodName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [category, setCategory] = useState<FoodCategory>('cooked')
  const [diet, setDiet] = useState<DonationDiet>('veg')
  const [storage, setStorage] = useState<StorageCondition>('hot')
  const [placeId, setPlaceId] = useState(currentUser?.location.id ?? PLACES[0].id)
  const [deadline, setDeadline] = useState(() => toLocalInputValue(state.now + 4 * 3_600_000))
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!currentUser) return null
  const donorId = currentUser.id

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Errors = {}
    const qty = Number(quantity)
    const deadlineMs = new Date(deadline).getTime()
    if (foodName.trim().length < 3) next.foodName = 'Enter a food name (at least 3 characters).'
    if (!Number.isInteger(qty) || qty < 1 || qty > 5000)
      next.quantity = 'Enter a whole number of servings between 1 and 5000.'
    if (Number.isNaN(deadlineMs) || deadlineMs <= Date.now())
      next.deadline = 'Pickup deadline must be in the future.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitError('')
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorId,
          foodName: foodName.trim().slice(0, 100),
          quantity: qty,
          category,
          diet,
          storage,
          placeId,
          pickupDeadline: new Date(deadlineMs).toISOString(),
          notes: notes.trim().slice(0, 300) || undefined,
        }),
      })
      if (!response.ok) {
        const result = (await response.json()) as { error?: string; errors?: string[] }
        throw new Error(result.errors?.join(', ') || result.error || `Could not save listing (${response.status})`)
      }

      const donation = (await response.json()) as ApiDonation
      dispatch({ type: 'SYNC_DONATIONS', donations: [toDonation(donation)] })
      onPosted()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save listing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-2 sm:p-6"
    >
      <div className="sm:col-span-2">
        <h2 className="font-semibold">Post surplus food</h2>
        <p className="text-sm text-muted-foreground">
          Listings are reviewed by an admin before being matched with nearby NGOs.
        </p>
      </div>
      <Field label="Food name" htmlFor="foodName" error={errors.foodName} className="sm:col-span-2">
        <Input
          id="foodName"
          value={foodName}
          onChange={(e) => setFoodName(e.target.value)}
          placeholder="e.g. Veg biryani with raita"
          maxLength={100}
          aria-invalid={!!errors.foodName}
        />
      </Field>
      <Field label="Quantity (servings)" htmlFor="quantity" error={errors.quantity}>
        <Input
          id="quantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={5000}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="50"
          aria-invalid={!!errors.quantity}
        />
      </Field>
      <Field label="Category" htmlFor="category">
        <NativeSelect id="category" value={category} onChange={(e) => setCategory(e.target.value as FoodCategory)}>
          {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Dietary type" htmlFor="diet">
        <NativeSelect id="diet" value={diet} onChange={(e) => setDiet(e.target.value as DonationDiet)}>
          {Object.entries(DONATION_DIET_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Storage condition" htmlFor="storage">
        <NativeSelect
          id="storage"
          value={storage}
          onChange={(e) => setStorage(e.target.value as StorageCondition)}
        >
          {Object.entries(STORAGE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Pickup location" htmlFor="location">
        <NativeSelect id="location" value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
          {PLACES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Pickup deadline" htmlFor="deadline" error={errors.deadline}>
        <Input
          id="deadline"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          aria-invalid={!!errors.deadline}
        />
      </Field>
      <Field label="Notes (optional)" htmlFor="notes" className="sm:col-span-2">
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Packaging, allergens, pickup instructions..."
          maxLength={300}
        />
      </Field>
      <div className="flex justify-end sm:col-span-2">
        {submitError && <p role="alert" className="mr-auto self-center text-sm text-destructive">{submitError}</p>}
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Post listing'}
        </Button>
      </div>
    </form>
  )
}
