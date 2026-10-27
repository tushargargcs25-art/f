'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Building2, HandHeart, ShieldCheck, Bike } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useFoodLoop } from '@/lib/foodloop/store'
import type { Role } from '@/lib/foodloop/types'
import { Field } from './shared'
import { Logo } from './logo'

const ROLES: { role: Role; label: string; description: string; icon: typeof Building2 }[] = [
  { role: 'donor', label: 'Donor', description: 'Restaurants & hotels', icon: Building2 },
  { role: 'acceptor', label: 'NGO', description: 'NGOs & orphanages', icon: HandHeart },
  { role: 'volunteer', label: 'Volunteer', description: 'Pickup & delivery', icon: Bike },
  { role: 'admin', label: 'Admin', description: 'Operations team', icon: ShieldCheck },
]

export function LoginScreen() {
  const { state, dispatch } = useFoodLoop()
  const [role, setRole] = useState<Role>('donor')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const demoAccounts = state.users.filter((u) => u.role === role)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const user = state.users.find(
      (u) => u.role === role && u.email.toLowerCase() === email.trim().toLowerCase(),
    )
    if (!user || user.password !== password) {
      setError('Incorrect email or password for this role.')
      return
    }
    setError('')
    dispatch({ type: 'LOGIN', userId: user.id })
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden lg:block">
        <Image
          src="/images/foodloop-hero.png"
          alt="Volunteers handing boxed meals from a restaurant to a community kitchen"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-primary-foreground">
          <p className="max-w-md text-3xl font-semibold leading-tight text-balance">
            Surplus food, delivered to people who need it — before it goes to waste.
          </p>
          <ol className="mt-6 flex flex-wrap gap-2 text-xs">
            {['Posted', 'Approved', 'Claimed', 'Assigned', 'Picked Up', 'Delivered', 'Completed'].map((s, i) => (
              <li key={s} className="rounded-full bg-background/15 px-2.5 py-1 backdrop-blur">
                {`${i + 1}. ${s}`}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <Logo />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to your dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose your role, then sign in with your account.</p>
          </div>

          <fieldset>
            <legend className="sr-only">Role</legend>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(({ role: r, label, description, icon: Icon }) => (
                <label
                  key={r}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring',
                    role === r ? 'bg-secondary ring-primary' : 'bg-card ring-border hover:bg-muted',
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => {
                      setRole(r)
                      setError('')
                    }}
                    className="sr-only"
                  />
                  <Icon className={cn('size-5 shrink-0', role === r ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password" htmlFor="password" error={error}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-invalid={!!error}
              />
            </Field>
            <Button type="submit" size="lg">
              Sign in
            </Button>
          </form>

          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-xs font-medium">Demo accounts — click to fill</p>
            <ul className="mt-2 flex flex-col gap-1">
              {demoAccounts.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(u.email)
                      setPassword(u.password)
                      setError('')
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="truncate font-medium">{u.org}</span>
                    <span className="truncate font-mono text-muted-foreground">{`${u.email} / ${u.password}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
