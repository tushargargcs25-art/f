'use client'

import { useMemo, useState } from 'react'
import { ClipboardList, HandHeart, Sparkles, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFoodLoop } from '@/lib/foodloop/store'
import type { Donation, DonationStatus } from '@/lib/foodloop/types'
import {
  CATEGORY_LABEL,
  REQUIREMENT_DIET_LABEL,
  STATUS_LABEL,
  distanceKm,
  formatDateTime,
} from '@/lib/foodloop/utils'
import { Chip } from '../badges'
import { CardGrid, DonationCard } from '../donation-card'
import { EmptyState, FilterBar, NativeSelect, PageHeader, StatCard, StatGrid } from '../shared'
import { FeedbackDialog } from './feedback-dialog'
import { RequirementForm } from './requirement-form'

const ORDER_STATUSES: DonationStatus[] = ['claimed', 'assigned', 'picked_up', 'delivered', 'completed']

export function AcceptorDashboard() {
  const { state, dispatch, currentUser, getUser } = useFoodLoop()
  const [tab, setTab] = useState<string>('matches')
  const [orderFilter, setOrderFilter] = useState<'all' | DonationStatus>('all')
  const [feedbackFor, setFeedbackFor] = useState<Donation | null>(null)

  const myRequirements = useMemo(
    () => state.requirements.filter((r) => r.acceptorId === currentUser?.id),
    [state.requirements, currentUser?.id],
  )
  const myReqIds = new Set(myRequirements.map((r) => r.id))
  const matches = state.donations.filter(
    (d) => d.status === 'approved' && d.matchedRequirementId && myReqIds.has(d.matchedRequirementId),
  )
  const orders = state.donations.filter(
    (d) => d.acceptorId === currentUser?.id && ORDER_STATUSES.includes(d.status),
  )
  const filteredOrders = orders.filter((d) => orderFilter === 'all' || d.status === orderFilter)
  const awaitingFeedback = orders.filter((d) => d.status === 'delivered').length

  if (!currentUser) return null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={currentUser.org}
        description="Post meal requirements, claim matched donations, track deliveries and leave feedback."
        action={<Button onClick={() => setTab('post')}>Post requirement</Button>}
      />
      <StatGrid>
        <StatCard label="New matches" value={matches.length} hint="Ready to claim" icon={Sparkles} tone="accent" />
        <StatCard
          label="In transit"
          value={orders.filter((d) => ['claimed', 'assigned', 'picked_up'].includes(d.status)).length}
          icon={Truck}
        />
        <StatCard
          label="Awaiting feedback"
          value={awaitingFeedback}
          icon={HandHeart}
          tone={awaitingFeedback ? 'warning' : 'default'}
        />
        <StatCard
          label="Meals received"
          value={orders.filter((d) => d.status === 'completed').reduce((s, d) => s + d.quantity, 0)}
          icon={ClipboardList}
        />
      </StatGrid>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="gap-4">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="matches">{`Matches (${matches.length})`}</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="post">Post</TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          {matches.length === 0 ? (
            <EmptyState
              title="No matches right now"
              description="When an admin approves a donation that fits one of your open requirements, it will appear here."
            />
          ) : (
            <CardGrid>
              {matches.map((d) => {
                const req = state.requirements.find((r) => r.id === d.matchedRequirementId)
                return (
                  <DonationCard
                    key={d.id}
                    donation={d}
                    now={state.now}
                    subtitle={getUser(d.donorId)?.org}
                    meta={
                      req && (
                        <p className="rounded-md bg-secondary px-2.5 py-1.5 text-xs text-secondary-foreground">
                          {`Matched to "${req.title}" · ${distanceKm(d.location, req.location)} km away`}
                        </p>
                      )
                    }
                    actions={
                      <>
                        <Button size="sm" onClick={() => dispatch({ type: 'CLAIM', donationId: d.id })}>
                          Claim donation
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dispatch({ type: 'DECLINE_MATCH', donationId: d.id })}
                        >
                          Decline
                        </Button>
                      </>
                    }
                  />
                )
              })}
            </CardGrid>
          )}
        </TabsContent>

        <TabsContent value="orders" className="flex flex-col gap-4">
          <FilterBar>
            <NativeSelect
              aria-label="Filter orders by status"
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value as typeof orderFilter)}
            >
              <option value="all">All orders</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          </FilterBar>
          {filteredOrders.length === 0 ? (
            <EmptyState title="No orders" description="Claimed donations and their delivery progress show up here." />
          ) : (
            <CardGrid>
              {filteredOrders.map((d) => {
                const volunteer = getUser(d.volunteerId)
                const review = state.reviews.find((r) => r.donationId === d.id)
                return (
                  <DonationCard
                    key={d.id}
                    donation={d}
                    now={state.now}
                    subtitle={getUser(d.donorId)?.org}
                    meta={
                      <p className="text-xs text-muted-foreground">
                        {volunteer
                          ? `Volunteer: ${volunteer.name} (${volunteer.vehicle})`
                          : 'Waiting for a volunteer to accept'}
                        {review && ` · You rated ${review.rating}/5`}
                      </p>
                    }
                    actions={
                      d.status === 'delivered' && (
                        <Button size="sm" onClick={() => setFeedbackFor(d)}>
                          Confirm & rate
                        </Button>
                      )
                    }
                  />
                )
              })}
            </CardGrid>
          )}
        </TabsContent>

        <TabsContent value="requirements">
          {myRequirements.length === 0 ? (
            <EmptyState title="No requirements yet" description="Post a requirement to start receiving matches." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {myRequirements.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{r.title}</p>
                    <span
                      className={
                        r.status === 'open'
                          ? 'rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground'
                          : r.status === 'matched'
                            ? 'rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800'
                            : 'rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground'
                      }
                    >
                      {r.status === 'open' ? 'Open' : r.status === 'matched' ? 'Matched' : 'Fulfilled'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {`${r.meals} meals · needed by ${formatDateTime(r.neededBy)}`}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip>{REQUIREMENT_DIET_LABEL[r.diet]}</Chip>
                    <Chip>{r.transportAvailable ? 'Own transport' : 'Needs volunteer'}</Chip>
                    {r.categories.length === 0 ? (
                      <Chip>Any category</Chip>
                    ) : (
                      r.categories.map((c) => <Chip key={c}>{CATEGORY_LABEL[c]}</Chip>)
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="post">
          <RequirementForm onPosted={() => setTab('requirements')} />
        </TabsContent>
      </Tabs>

      <FeedbackDialog
        donation={feedbackFor}
        open={feedbackFor !== null}
        onOpenChange={(open) => !open && setFeedbackFor(null)}
      />
    </div>
  )
}
