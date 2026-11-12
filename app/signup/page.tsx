import type { Metadata } from 'next'
import { SignupPage } from '@/app/auth-forms'

export const metadata: Metadata = { title: 'Join SHAREMEAL', description: 'Create a SHAREMEAL community account.' }

export default async function Page({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams
  const initialRole = role === 'ngo' || role === 'volunteer' ? role : 'donor'
  return <SignupPage initialRole={initialRole} />
}
