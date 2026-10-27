'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useFoodLoop } from '@/lib/foodloop/store'
import type { Donation } from '@/lib/foodloop/types'
import { StarInput } from '../star-rating'

export function FeedbackDialog({
  donation,
  open,
  onOpenChange,
}: {
  donation: Donation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { dispatch, getUser } = useFoodLoop()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  function submit() {
    if (!donation) return
    dispatch({ type: 'COMPLETE', donationId: donation.id, rating, comment })
    setRating(5)
    setComment('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm delivery & rate</DialogTitle>
          <DialogDescription>
            {donation
              ? `How was "${donation.foodName}" from ${getUser(donation.donorId)?.org}? Your feedback helps donors improve.`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Food quality</span>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="feedback">Comments</Label>
            <Textarea
              id="feedback"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Freshness, packaging, quantity accuracy..."
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Mark completed</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
