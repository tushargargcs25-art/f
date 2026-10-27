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

const QUICK_REASONS = ['Food safety concern', 'Deadline too close', 'Incomplete details']

export function RejectDialog({ donation, onClose }: { donation: Donation | null; onClose: () => void }) {
  const { dispatch } = useFoodLoop()
  const [reason, setReason] = useState('')

  function submit() {
    if (!donation || !reason.trim()) return
    dispatch({ type: 'REJECT', donationId: donation.id, reason: reason.trim().slice(0, 200) })
    setReason('')
    onClose()
  }

  return (
    <Dialog open={donation !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject listing</DialogTitle>
          <DialogDescription>
            {donation ? `Let the donor know why "${donation.foodName}" can't be accepted.` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <Button key={r} type="button" size="xs" variant="outline" onClick={() => setReason(r)}>
                {r}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              placeholder="Explain the reason for rejection"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={!reason.trim()}>
            Reject listing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
