'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Leaf, ListChecks, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFoodLoop } from '@/lib/foodloop/store'
import type { DonationStatus } from '@/lib/foodloop/types'
import { formatDateTime, STATUS_LABEL } from '@/lib/foodloop/utils'
import { CardGrid, DonationCard } from '../donation-card'
import { EmptyState, FilterBar, NativeSelect, PageHeader, StatCard, StatGrid } from '../shared'
import { StarDisplay } from '../star-rating'
import { DonationForm } from './donation-form'

const ACTIVE: DonationStatus[] = ['posted', 'approved', 'claimed', 'assigned', 'picked_up', 'delivered']

export function DonorDashboard() {
  const { state, dispatch, currentUser, getUser } = useFoodLoop()
  const [tab, setTab] = useState<string>('listings')
  const [statusFilter, setStatusFilter] = useState<'all' | DonationStatus>('all')
  const [query, setQuery] = useState('')

  const mine = useMemo(
    () => state.donations.filter((d) => d.donorId === currentUser?.id),
    [state.donations, currentUser?.id],
  )
  const reviews = state.reviews.filter((r) => r.donorId === currentUser?.id)
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const completed = mine.filter((d) => d.status === 'completed')

  const filtered = mine.filter(
    (d) =>
      (statusFilter === 'all' || d.status === statusFilter) &&
      d.foodName.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={currentUser?.org ?? 'Donor'}
        description="Post surplus food, track each listing through pickup and delivery, and see feedback from NGOs."
        action={<Button onClick={() => setTab('post')}>Post surplus food</Button>}
      />
      <StatGrid>
        <StatCard label="Total listings" value={mine.length} icon={ListChecks} />
        <StatCard
          label="Active"
          value={mine.filter((d) => ACTIVE.includes(d.status)).length}
          hint="In the pipeline"
          icon={Leaf}
          tone="accent"
        />
        <StatCard
          label="Meals donated"
          value={completed.reduce((s, d) => s + d.quantity, 0)}
          hint={`${completed.length} completed`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Avg. rating"
          value={reviews.length ? avgRating.toFixed(1) : '—'}
          hint={`${reviews.length} review${reviews.length === 1 ? '' : 's'}`}
          icon={Star}
          tone="accent"
        />
      </StatGrid>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="gap-4">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="listings">My listings</TabsTrigger>
          <TabsTrigger value="post">Post food</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="flex flex-col gap-4">
          <FilterBar>
            <Input
              aria-label="Search listings"
              placeholder="Search by food name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-xs"
            />
            <NativeSelect
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </FilterBar>
          {filtered.length === 0 ? (
            <EmptyState title="No listings found" description="Try a different filter, or post new surplus food." />
          ) : (
            <CardGrid>
              {filtered.map((d) => {
                const acceptor = getUser(d.acceptorId)
                const volunteer = getUser(d.volunteerId)
                return (
                  <DonationCard
                    key={d.id}
                    donation={d}
                    now={state.now}
                    subtitle={`Posted ${formatDateTime(d.createdAt)}`}
                    meta={
                      (acceptor || volunteer) && (
                        <p className="text-xs text-muted-foreground">
                          {acceptor && `Going to ${acceptor.org}`}
                          {acceptor && volunteer && ' · '}
                          {volunteer && `Volunteer: ${volunteer.name}`}
                        </p>
                      )
                    }
                    actions={
                      d.status === 'posted' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => dispatch({ type: 'DELETE_DONATION', donationId: d.id })}
                        >
                          Withdraw listing
                        </Button>
                      )
                    }
                  />
                )
              })}
            </CardGrid>
          )}
        </TabsContent>

        <TabsContent value="post">
          <DonationForm onPosted={() => setTab('listings')} />
        </TabsContent>

        <TabsContent value="reviews">
          {reviews.length === 0 ? (
            <EmptyState title="No reviews yet" description="Reviews appear here once NGOs confirm delivery." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {reviews.map((r) => {
                const donation = state.donations.find((d) => d.id === r.donationId)
                return (
                  <li key={r.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{getUser(r.acceptorId)?.org}</p>
                      <StarDisplay rating={r.rating} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {`${donation?.foodName ?? 'Donation'} · ${formatDateTime(r.createdAt)}`}
                    </p>
                    {r.comment && <p className="mt-2 text-sm text-pretty">{r.comment}</p>}
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
