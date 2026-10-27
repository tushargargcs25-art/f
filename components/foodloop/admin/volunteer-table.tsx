'use client'

import { useFoodLoop } from '@/lib/foodloop/store'
import { cn } from '@/lib/utils'
import { StarDisplay } from '../star-rating'

export function VolunteerTable() {
  const { state } = useFoodLoop()
  const volunteers = state.users.filter((u) => u.role === 'volunteer')

  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">Volunteers</caption>
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Volunteer</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Vehicle</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Active job</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Deliveries</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Rating</th>
          </tr>
        </thead>
        <tbody>
          {volunteers.map((v) => {
            const active = state.donations.find(
              (d) => d.volunteerId === v.id && ['assigned', 'picked_up'].includes(d.status),
            )
            return (
              <tr key={v.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{v.location.name}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span
                      aria-hidden="true"
                      className={cn('size-2 rounded-full', v.available ? 'bg-primary' : 'bg-stone-300')}
                    />
                    {v.available ? 'Available' : 'Offline'}
                  </span>
                </td>
                <td className="px-4 py-3">{v.vehicle}</td>
                <td className="px-4 py-3 text-muted-foreground">{active ? active.foodName : '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{v.completedDeliveries}</td>
                <td className="px-4 py-3">
                  <StarDisplay rating={v.rating ?? 0} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
