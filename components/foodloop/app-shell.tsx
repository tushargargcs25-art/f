'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FoodLoopProvider, useFoodLoop } from '@/lib/foodloop/store'
import type { Role } from '@/lib/foodloop/types'
import { AcceptorDashboard } from './acceptor/acceptor-dashboard'
import { AdminDashboard } from './admin/admin-dashboard'
import { DonorDashboard } from './donor/donor-dashboard'
import { LoginScreen } from './login-screen'
import { Logo } from './logo'
import { VolunteerDashboard } from './volunteer/volunteer-dashboard'

const ROLE_LABEL: Record<Role, string> = {
  donor: 'Donor',
  acceptor: 'NGO / Acceptor',
  admin: 'Admin',
  volunteer: 'Volunteer',
}

function Dashboard() {
  const { currentUser, dispatch } = useFoodLoop()
  if (!currentUser) return <LoginScreen />

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABEL[currentUser.role]}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'LOGOUT' })}>
              <LogOut data-icon="inline-start" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {currentUser.role === 'donor' && <DonorDashboard />}
        {currentUser.role === 'acceptor' && <AcceptorDashboard />}
        {currentUser.role === 'admin' && <AdminDashboard />}
        {currentUser.role === 'volunteer' && <VolunteerDashboard />}
      </main>
    </div>
  )
}

export function AppShell() {
  return (
    <FoodLoopProvider>
      <Dashboard />
    </FoodLoopProvider>
  )
}
