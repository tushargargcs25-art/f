'use client'

import { useState } from 'react'
import { AlertTriangle, Bike, Inbox, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFoodLoop } from '@/lib/foodloop/store'
import type { Donation, FoodCategory, Urgency } from '@/lib/foodloop/types'
import {
  CATEGORY_LABEL,
  URGENCY_RANK,
  distanceKm,
  findBestMatch,
  getUrgency,
} from '@/lib/foodloop/utils'
import { CardGrid, DonationCard } from '../donation-card'
import { EmptyState, FilterBar, NativeSelect, PageHeader, StatCard, StatGrid } from '../shared'
import { RejectDialog } from './reject-dialog'
import { VolunteerTable } from './volunteer-table'

const DELIVERY_STATUSES = new Set(['claimed', 'assigned', 'picked_up', 'delivered'])

export function AdminDashboard() {
  const { state, dispatch, getUser } = useFoodLoop()
  const [rejecting, setRejecting] = useState<Donation | null>(null)
  const [category, setCategory] = useState<'all' | FoodCategory>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | Urgency>('all')
  const [query, setQuery] = useState('')

  const byUrgency = (a: Donation, b: Donation) =>
    URGENCY_RANK[getUrgency(a.pickupDeadline, state.now)] -
    URGENCY_RANK[getUrgency(b.pickupDeadline, state.now)]

  const applyFilters = (d: Donation) =>
    (category === 'all' || d.category === category) &&
    (urgencyFilter === 'all' || getUrgency(d.pickupDeadline, state.now) === urgencyFilter) &&
    (d.foodName.toLowerCase().includes(query.toLowerCase()) ||
      (getUser(d.donorId)?.org ?? '').toLowerCase().includes(query.toLowerCase()))

  const pending = state.donations.filter((d) => d.status === 'posted').filter(applyFilters).sort(byUrgency)
  const approved = state.donations.filter((d) => d.status === 'approved').filter(applyFilters).sort(byUrgency)
  const deliveries = state.donations.filter((d) => DELIVERY_STATUSES.has(d.status)).filter(applyFilters)
  const unmatched = state.donations.filter((d) => d.status === 'approved' && !d.matchedRequirementId)
  const matchable = unmatched.filter((d) => findBestMatch(d, state.requirements, state.now)).length
  const critical = state.donations.filter(
    (d) =>
      ['posted', 'approved', 'claimed'].includes(d.status) &&
      getUrgency(d.pickupDeadline, state.now) === 'critical',
  ).length
  const volunteers = state.users.filter((u) => u.role === 'volunteer')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Operations"
        description="Review new listings, run automatic matching, and oversee volunteers and live deliveries."
        action={
          <Button onClick={() => dispatch({ type: 'AUTO_MATCH' })} disabled={matchable === 0}>
            <Shuffle data-icon="inline-start" aria-hidden="true" />
            {matchable > 0 ? `Auto-match ${matchable}` : 'All matched'}
          </Button>
        }
      />
      <StatGrid>
        <StatCard label="Pending approval" value={state.donations.filter((d) => d.status === 'posted').length} icon={Inbox} tone="accent" />
        <StatCard label="Unmatched approved" value={unmatched.length} hint={`${matchable} can be matched`} icon={Shuffle} />
        <StatCard
          label="Active deliveries"
          value={state.donations.filter((d) => DELIVERY_STATUSES.has(d.status)).length}
          hint={`${volunteers.filter((v) => v.available).length} volunteers online`}
          icon={Bike}
        />
        <StatCard label="Critical (<2h)" value={critical} icon={AlertTriangle} tone={critical ? 'warning' : 'default'} />
      </StatGrid>

      <FilterBar>
        <Input
          aria-label="Search donations"
          placeholder="Search food or donor"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <NativeSelect aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filter by urgency"
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value as typeof urgencyFilter)}
        >
          <option value="all">All urgency</option>
          <option value="critical">Critical (under 2h)</option>
          <option value="high">Urgent (under 6h)</option>
          <option value="normal">On track</option>
          <option value="expired">Expired</option>
        </NativeSelect>
      </FilterBar>

      <Tabs defaultValue="approvals" className="gap-4">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="approvals">{`Approvals (${pending.length})`}</TabsTrigger>
          <TabsTrigger value="matching">Matching</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          {pending.length === 0 ? (
            <EmptyState title="Inbox zero" description="No listings are waiting for review." />
          ) : (
            <CardGrid>
              {pending.map((d) => (
                <DonationCard
                  key={d.id}
                  donation={d}
                  now={state.now}
                  subtitle={getUser(d.donorId)?.org}
                  actions={
                    <>
                      <Button size="sm" onClick={() => dispatch({ type: 'APPROVE', donationId: d.id })}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejecting(d)}>
                        Reject
                      </Button>
                    </>
                  }
                />
              ))}
            </CardGrid>
          )}
        </TabsContent>

        <TabsContent value="matching">
          {approved.length === 0 ? (
            <EmptyState title="Nothing to match" description="Approved donations waiting for an NGO claim appear here." />
          ) : (
            <CardGrid>
              {approved.map((d) => {
                const req = state.requirements.find((r) => r.id === d.matchedRequirementId)
                const suggestion = req ? undefined : findBestMatch(d, state.requirements, state.now)
                return (
                  <DonationCard
                    key={d.id}
                    donation={d}
                    now={state.now}
                    subtitle={getUser(d.donorId)?.org}
                    meta={
                      <p
                        className={
                          req
                            ? 'rounded-md bg-secondary px-2.5 py-1.5 text-xs text-secondary-foreground'
                            : 'rounded-md bg-accent px-2.5 py-1.5 text-xs text-accent-foreground'
                        }
                      >
                        {req
                          ? `Matched → ${getUser(req.acceptorId)?.org} (${req.meals} meals, ${distanceKm(d.location, req.location)} km). Awaiting claim.`
                          : suggestion
                            ? `Best fit: ${getUser(suggestion.acceptorId)?.org}. Run auto-match to assign.`
                            : 'No compatible open requirement yet.'}
                      </p>
                    }
                  />
                )
              })}
            </CardGrid>
          )}
        </TabsContent>

        <TabsContent value="deliveries">
          {deliveries.length === 0 ? (
            <EmptyState title="No active deliveries" description="Claimed donations move here until completion." />
          ) : (
            <CardGrid>
              {deliveries.map((d) => {
                const acceptor = getUser(d.acceptorId)
                const volunteer = getUser(d.volunteerId)
                const freeVolunteers = volunteers.filter((v) => v.available)
                return (
                  <DonationCard
                    key={d.id}
                    donation={d}
                    now={state.now}
                    subtitle={`${getUser(d.donorId)?.org} → ${acceptor?.org}`}
                    meta={
                      volunteer ? (
                        <p className="text-xs text-muted-foreground">{`Volunteer: ${volunteer.name} · ${volunteer.vehicle}`}</p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`assign-${d.id}`} className="text-xs font-medium">
                            Assign a volunteer
                          </label>
                          <NativeSelect
                            id={`assign-${d.id}`}
                            defaultValue=""
                            onChange={(e) =>
                              e.target.value &&
                              dispatch({ type: 'ASSIGN_VOLUNTEER', donationId: d.id, volunteerId: e.target.value })
                            }
                          >
                            <option value="" disabled>
                              {freeVolunteers.length ? 'Choose volunteer' : 'No volunteers available'}
                            </option>
                            {freeVolunteers.map((v) => (
                              <option key={v.id} value={v.id}>
                                {`${v.name} · ${distanceKm(v.location, d.location)} km away`}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                      )
                    }
                  />
                )
              })}
            </CardGrid>
          )}
        </TabsContent>

        <TabsContent value="volunteers">
          <VolunteerTable />
        </TabsContent>
      </Tabs>

      <RejectDialog donation={rejecting} onClose={() => setRejecting(null)} />
    </div>
  )
}
