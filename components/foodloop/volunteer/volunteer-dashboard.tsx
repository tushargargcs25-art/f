'use client'

import { useState } from 'react'
import { ArrowDown, Bike, MapPin, Navigation, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFoodLoop } from '@/lib/foodloop/store'
import type { Donation } from '@/lib/foodloop/types'
import { URGENCY_RANK, distanceKm, getUrgency } from '@/lib/foodloop/utils'
import { CardGrid, DonationCard } from '../donation-card'
import { EmptyState, FilterBar, NativeSelect, PageHeader, StatCard, StatGrid } from '../shared'

function RouteInfo({ from, to, fromKm, routeKm }: { from: string; to: string; fromKm?: number; routeKm: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/60 p-2.5 text-xs">
      <p className="flex items-center gap-1.5">
        <MapPin className="size-3.5 text-primary" aria-hidden="true" />
        <span className="font-medium">Pickup:</span> {from}
        {fromKm !== undefined && <span className="ml-auto text-muted-foreground">{`${fromKm} km from you`}</span>}
      </p>
      <ArrowDown className="ml-0.5 size-3 text-muted-foreground" aria-hidden="true" />
      <p className="flex items-center gap-1.5">
        <Navigation className="size-3.5 text-accent-foreground" aria-hidden="true" />
        <span className="font-medium">Drop-off:</span> {to}
        <span className="ml-auto text-muted-foreground">{`${routeKm} km trip`}</span>
      </p>
    </div>
  )
}

export function VolunteerDashboard() {
  const { state, dispatch, currentUser, getUser } = useFoodLoop()
  const [sort, setSort] = useState<'distance' | 'urgency'>('urgency')
  const [maxKm, setMaxKm] = useState<number>(50)

  if (!currentUser) return null

  const dropOff = (d: Donation) => getUser(d.acceptorId)?.location ?? d.location
  const requests = state.donations
    .filter((d) => d.status === 'claimed')
    .map((d) => ({ d, km: distanceKm(currentUser.location, d.location) }))
    .filter(({ km }) => km <= maxKm)
    .sort((a, b) =>
      sort === 'distance'
        ? a.km - b.km
        : URGENCY_RANK[getUrgency(a.d.pickupDeadline, state.now)] -
          URGENCY_RANK[getUrgency(b.d.pickupDeadline, state.now)],
    )
  const myJobs = state.donations.filter(
    (d) => d.volunteerId === currentUser.id && ['assigned', 'picked_up', 'delivered'].includes(d.status),
  )
  const history = state.donations.filter((d) => d.volunteerId === currentUser.id && d.status === 'completed')
  const hasActiveJob = myJobs.some((d) => d.status !== 'delivered')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hi, ${currentUser.name.split(' ')[0]}`}
        description="Pick up nearby surplus food and deliver it to NGOs. Update progress as you go."
        action={
          <label className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-foreground/10">
            <Switch
              checked={!!currentUser.available}
              onCheckedChange={() => dispatch({ type: 'TOGGLE_AVAILABILITY', userId: currentUser.id })}
            />
            {currentUser.available ? 'Available for pickups' : 'Offline'}
          </label>
        }
      />
      <StatGrid>
        <StatCard label="Open requests" value={requests.length} icon={MapPin} tone="accent" />
        <StatCard label="My active jobs" value={myJobs.length} icon={Bike} />
        <StatCard label="Lifetime deliveries" value={currentUser.completedDeliveries ?? 0} icon={Trophy} />
        <StatCard label="Vehicle" value={currentUser.vehicle ?? '—'} hint={currentUser.location.name} icon={Navigation} />
      </StatGrid>

      <Tabs defaultValue="requests" className="gap-4">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="requests">{`Requests (${requests.length})`}</TabsTrigger>
          <TabsTrigger value="jobs">{`My deliveries (${myJobs.length})`}</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="flex flex-col gap-4">
          <FilterBar>
            <NativeSelect aria-label="Sort requests" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="urgency">Most urgent first</option>
              <option value="distance">Nearest first</option>
            </NativeSelect>
            <NativeSelect aria-label="Maximum distance" value={maxKm} onChange={(e) => setMaxKm(Number(e.target.value))}>
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={20}>Within 20 km</option>
              <option value={50}>Any distance</option>
            </NativeSelect>
            {!currentUser.available && (
              <p className="text-xs text-muted-foreground sm:ml-auto">Go online to accept requests.</p>
            )}
            {currentUser.available && hasActiveJob && (
              <p className="text-xs text-muted-foreground sm:ml-auto">Finish your current pickup before accepting another.</p>
            )}
          </FilterBar>
          {requests.length === 0 ? (
            <EmptyState title="No open requests" description="Claimed donations needing a volunteer will appear here." />
          ) : (
            <CardGrid>
              {requests.map(({ d, km }) => (
                <DonationCard
                  key={d.id}
                  donation={d}
                  now={state.now}
                  subtitle={`${getUser(d.donorId)?.org} → ${getUser(d.acceptorId)?.org}`}
                  meta={
                    <RouteInfo
                      from={d.location.name}
                      to={dropOff(d).name}
                      fromKm={km}
                      routeKm={distanceKm(d.location, dropOff(d))}
                    />
                  }
                  actions={
                    <Button
                      size="sm"
                      disabled={!currentUser.available || hasActiveJob}
                      onClick={() =>
                        dispatch({ type: 'ASSIGN_VOLUNTEER', donationId: d.id, volunteerId: currentUser.id })
                      }
                    >
                      Accept delivery
                    </Button>
                  }
                />
              ))}
            </CardGrid>
          )}
        </TabsContent>

        <TabsContent value="jobs">
          {myJobs.length === 0 ? (
            <EmptyState title="No active deliveries" description="Accept a request to get started." />
          ) : (
            <CardGrid>
              {myJobs.map((d) => (
                <DonationCard
                  key={d.id}
                  donation={d}
                  now={state.now}
                  subtitle={`${getUser(d.donorId)?.org} → ${getUser(d.acceptorId)?.org}`}
                  meta={
                    <RouteInfo
                      from={d.location.name}
                      to={dropOff(d).name}
                      routeKm={distanceKm(d.location, dropOff(d))}
                    />
                  }
                  actions={
                    d.status === 'assigned' ? (
                      <Button size="sm" onClick={() => dispatch({ type: 'ADVANCE', donationId: d.id, status: 'picked_up' })}>
                        Mark picked up
                      </Button>
                    ) : d.status === 'picked_up' ? (
                      <Button size="sm" onClick={() => dispatch({ type: 'ADVANCE', donationId: d.id, status: 'delivered' })}>
                        Mark delivered
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">Waiting for NGO to confirm & rate.</p>
                    )
                  }
                />
              ))}
            </CardGrid>
          )}
        </TabsContent>

        <TabsContent value="history">
          {history.length === 0 ? (
            <EmptyState title="No completed deliveries yet" description="Completed deliveries will be listed here." />
          ) : (
            <CardGrid>
              {history.map((d) => (
                <DonationCard
                  key={d.id}
                  donation={d}
                  now={state.now}
                  subtitle={`${getUser(d.donorId)?.org} → ${getUser(d.acceptorId)?.org}`}
                />
              ))}
            </CardGrid>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
