import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Leaf, LogOut, ShieldCheck, Truck, Utensils } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DashboardPanel from '../dashboard-motion'
import NgoDemoClient from '@/app/ngo-demo/ngo-demo-client'

export const metadata: Metadata = { title: 'Your SHAREMEAL space' }
const roles = {
  donor: { title: 'Food donor', description: 'Share fresh surplus with the community around you.', icon: Utensils },
  ngo: { title: 'NGO / community partner', description: 'Your community organization is part of SHAREMEAL.', icon: ShieldCheck },
  volunteer: { title: 'Volunteer', description: 'Your time and care help meals find their way.', icon: Truck },
} as const

export default async function RoleDashboardPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  if (!Object.prototype.hasOwnProperty.call(roles, role)) redirect('/dashboard')
  const roleKey = role as keyof typeof roles
  // NGO demo access is intentionally public: no Supabase account or email confirmation is required.
  if (roleKey === 'ngo') return <NgoDemoClient />
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('id,full_name,role,organization_name').eq('id', user.id).maybeSingle()
  if (!profile || profile.role !== roleKey) redirect('/dashboard')
  const { title, description, icon: RoleIcon } = roles[roleKey]
  const name = profile.full_name?.trim().split(/\s+/)[0] || 'friend'
  return <main className="min-h-screen bg-[#faf9f5] px-5 py-8 text-[#193b30] sm:px-8 sm:py-12">
    <div className="mx-auto max-w-[860px]">
      <header className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-[-.05em]"><span className="flex size-9 items-center justify-center rounded-xl bg-[#e6efe5] text-[#176b4b]"><Leaf size={18} /></span>SHAREMEAL</Link><form action="/auth/signout" method="post"><button className="inline-flex items-center gap-2 rounded-full border border-[#dfe5dc] bg-white px-4 py-2 text-xs font-semibold text-[#53665d] hover:border-[#176b4b]"><LogOut size={14} /> Log out</button></form></header>
      <DashboardPanel>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#edf3ea] text-[#43805a]"><RoleIcon size={22} /></div>
        <p className="mt-7 text-[10px] font-bold tracking-[.17em] text-[#63866d]">YOUR SHAREMEAL SPACE · {title.toUpperCase()}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.055em] sm:text-4xl">Welcome, {name}.</h1>
        <p className="mt-3 max-w-[550px] text-sm leading-6 text-[#77847c]">{description} {profile.organization_name ? `You’re representing ${profile.organization_name}.` : ''}</p>
        <div className="mt-8 flex flex-wrap gap-3">{roleKey === 'donor' ? <Link href="/#community" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#176b4b] px-5 text-sm font-semibold text-white hover:bg-[#164c3b]">Share a food donation</Link> : <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#176b4b] px-5 text-sm font-semibold text-white hover:bg-[#164c3b]">Explore SHAREMEAL</Link>}<Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full border border-[#dfe5dc] px-5 text-sm font-semibold text-[#52685c] hover:border-[#a9c1aa]"><ArrowLeft size={15} /> Back to home</Link></div>
      </DashboardPanel>
      <p className="mt-5 text-center text-[11px] text-[#859188]">Role access is checked from your verified account on the server.</p>
    </div>
  </main>
}
