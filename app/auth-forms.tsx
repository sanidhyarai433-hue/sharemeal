'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Leaf, LoaderCircle, ShieldCheck } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup' | 'forgot' | 'reset'
type Role = 'donor' | 'ngo' | 'volunteer'
const supabase = createClient()

function Brand({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  return <div className="flex min-h-screen bg-[#faf9f5] text-[#193b30]">
    <aside className="relative hidden w-[46%] max-w-[680px] flex-col justify-between overflow-hidden bg-[#164c3b] p-12 text-white lg:flex xl:p-16">
      <Image src="/sharemeal-community-meal.png" alt="A volunteer shares a meal with a neighbor" fill priority className="object-cover opacity-35 mix-blend-luminosity" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#123e2e]/70 via-[#164c3b]/40 to-[#103728]/90" />
      <div className="relative z-10"><Link href="/" className="inline-flex items-center gap-2.5"><span className="flex size-10 items-center justify-center rounded-[14px] bg-white/15"><Leaf size={20} /></span><span className="text-xl font-semibold tracking-[-.05em]">SHAREMEAL<span className="text-[#c9dfc8]">.</span></span></Link></div>
      <div className="relative z-10 max-w-[420px] pb-5"><p className="text-[10px] font-bold tracking-[.2em] text-[#cee1c8]">GOOD FOOD. GREATER IMPACT.</p><h1 className="mt-5 text-5xl font-medium leading-[1.05] tracking-[-.065em] xl:text-6xl">A little care goes a <span className="font-serif italic font-normal text-[#c9dfc8]">long way.</span></h1><p className="mt-5 max-w-[370px] text-sm leading-7 text-white/75">Join kitchens, community organizations and volunteers turning surplus food into something everyone can share.</p><div className="mt-8 flex items-center gap-2 text-xs font-medium text-white/80"><ShieldCheck size={16} className="text-[#cee1c8]" /> A community built on trust and care</div></div>
      <p className="relative z-10 text-[10px] tracking-wide text-white/55">RESCUE FOOD <span className="mx-2">·</span> SHARE HOPE</p>
    </aside>
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center px-5 py-8 sm:px-10">
      <Link href="/" className="mb-9 flex items-center gap-2 self-start text-sm font-semibold lg:hidden"><span className="flex size-9 items-center justify-center rounded-xl bg-[#e6efe5] text-[#176b4b]"><Leaf size={18} /></span>SHAREMEAL</Link>
      <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }} className="w-full max-w-[430px]">{children}</motion.div>
      <p className="mt-10 text-center text-[10px] leading-5 text-[#8a958d]">By continuing, you agree to help make food sharing safe and respectful.<br />Your information is handled with care.</p>
    </main>
  </div>
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="grid gap-1.5 text-xs font-semibold text-[#385648]">{label}{children}{hint && <span className="text-[11px] font-normal text-[#829087]">{hint}</span>}</label>
}

const inputClass = 'h-12 w-full rounded-xl border border-[#dfe5dc] bg-white px-3.5 text-sm font-normal text-[#193b30] outline-none transition placeholder:text-[#a3ada5] focus:border-[#6d9a78] focus:ring-2 focus:ring-[#6d9a78]/15'
const selectClass = `${inputClass} appearance-auto`

export function LoginPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const { error: authError } = await supabase.auth.signInWithPassword({ email: String(form.get('email')).trim(), password: String(form.get('password')) })
    if (authError) setError(authError.message.toLowerCase().includes('email not confirmed') ? 'Please confirm your email from the link we sent before logging in.' : 'That email or password is not recognized. Check your details and try again.')
    else router.replace('/dashboard')
    setBusy(false)
  }
  return <Brand><div><p className="text-[10px] font-bold tracking-[.17em] text-[#63866d]">WELCOME BACK</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em]">Good to see you.</h2><p className="mt-2 text-sm text-[#77847c]">Log in to your SHAREMEAL account.</p><form onSubmit={submit} className="mt-8 grid gap-5"><Field label="Email address"><input required autoFocus name="email" type="email" autoComplete="email" placeholder="you@example.com" className={inputClass} /></Field><Field label="Password"><input required name="password" type="password" autoComplete="current-password" placeholder="Your password" className={inputClass} /></Field><div className="-mt-2 flex justify-end"><Link className="text-xs font-semibold text-[#176b4b] hover:underline" href="/forgot-password">Forgot password?</Link></div>{error && <p role="alert" className="rounded-xl bg-[#fbefec] px-3 py-2.5 text-xs leading-5 text-[#a7443b]">{error}</p>}<button disabled={busy} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#176b4b] text-sm font-semibold text-white transition hover:bg-[#164c3b] disabled:opacity-60">{busy ? <><LoaderCircle className="animate-spin" size={17} /> Logging in…</> : <>Log in <ArrowRight size={16} /></>}</button></form><p className="mt-7 text-center text-sm text-[#78857d]">New to SHAREMEAL? <Link className="font-semibold text-[#176b4b] hover:underline" href="/signup">Create an account</Link></p><div className="mt-5 rounded-2xl border border-[#e2e9dd] bg-[#f5f8f2] p-4"><p className="text-sm font-semibold text-[#315c43]">Need to explore as a receiver?</p><p className="mt-1 text-xs leading-5 text-[#7b897e]">Try the NGO dashboard instantly with sample food listings. No account needed.</p><Link href="/dashboard/ngo" className="mt-3 flex h-10 items-center justify-center rounded-full border border-[#b9cfb8] bg-white text-xs font-semibold text-[#286445] hover:bg-[#edf4eb]">Continue as NGO — no email needed <ArrowRight size={14} className="ml-2"/></Link></div><Link href="/" className="mt-7 inline-flex items-center gap-2 text-xs font-medium text-[#7c8981] hover:text-[#176b4b]"><ArrowLeft size={14} /> Back to SHAREMEAL</Link></div></Brand>
}

export function SignupPage({ initialRole = 'donor' }: { initialRole?: Role }) {
  const router = useRouter()
  const [role, setRole] = useState<Role>(initialRole)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const fullName = String(form.get('fullName') ?? '').trim()
    const organizationName = String(form.get('organizationName') ?? '').trim()
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const confirmPassword = String(form.get('confirmPassword') ?? '')
    if (password !== confirmPassword) { setError('Your passwords don’t match. Please try again.'); setBusy(false); return }
    const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`, data: { role, full_name: fullName, organization_name: organizationName } } })
    if (authError) {
      const message = authError.message.toLowerCase()
      setError(message.includes('already') || message.includes('registered') ? 'We couldn’t create an account with those details. Try logging in or use a different email.' : authError.message)
    } else if (data.session) router.replace('/dashboard')
    else setSuccess(true)
    setBusy(false)
  }
  if (success) return <Brand><div className="rounded-[24px] border border-[#e5e9df] bg-white p-7 text-center shadow-sm sm:p-9"><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#eaf2e8] text-[#176b4b]"><Check size={22} /></span><h2 className="mt-5 text-2xl font-semibold tracking-[-.05em]">Check your inbox.</h2><p className="mt-2 text-sm leading-6 text-[#77847c]">We sent a confirmation link to the email you provided. Confirm your email to activate your SHAREMEAL account.</p><Link href="/dashboard/ngo" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#176b4b] px-6 text-sm font-semibold text-white">Continue to NGO demo — no email needed</Link><p className="mt-3 text-xs leading-5 text-[#829087]">Want to use SHAREMEAL as a sample receiver? You can explore the demo without confirming an email or creating an account.</p><Link href="/login" className="mt-4 inline-flex text-xs font-semibold text-[#176b4b] hover:underline">Go to log in instead</Link></div></Brand>
  return <Brand><div><p className="text-[10px] font-bold tracking-[.17em] text-[#63866d]">FIND YOUR PLACE HERE</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em]">Let’s make good happen.</h2><p className="mt-2 text-sm text-[#77847c]">Create your account and join the community.</p><form onSubmit={submit} className="mt-7 grid gap-4"><Field label="I’m joining as"><select value={role} onChange={(event) => setRole(event.target.value as Role)} name="role" className={selectClass}><option value="donor">Food donor</option><option value="ngo">NGO / community partner</option><option value="volunteer">Volunteer</option></select></Field><Field label="Your full name"><input required name="fullName" autoComplete="name" placeholder="Full name" className={inputClass} /></Field>{role !== 'volunteer' && <Field label={role === 'ngo' ? 'NGO name' : 'Organization name'} hint="You can add more details to your profile later."><input name="organizationName" autoComplete="organization" placeholder={role === 'ngo' ? 'Community organization' : 'Restaurant, kitchen or business'} className={inputClass} /></Field>}<Field label="Email address"><input required name="email" type="email" autoComplete="email" placeholder="you@example.com" className={inputClass} /></Field><Field label="Password" hint="Use at least 8 characters."><input required name="password" type="password" minLength={8} autoComplete="new-password" placeholder="At least 8 characters" className={inputClass} /></Field><Field label="Confirm password"><input required name="confirmPassword" type="password" minLength={8} autoComplete="new-password" placeholder="Enter your password again" className={inputClass} /></Field>{error && <p role="alert" className="rounded-xl bg-[#fbefec] px-3 py-2.5 text-xs leading-5 text-[#a7443b]">{error}</p>}<button disabled={busy} className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-[#176b4b] text-sm font-semibold text-white transition hover:bg-[#164c3b] disabled:opacity-60">{busy ? <><LoaderCircle className="animate-spin" size={17} /> Creating account…</> : <>Create account <ArrowRight size={16} /></>}</button><p className="text-center text-[10px] leading-5 text-[#869189]">Admin accounts can only be assigned securely, never through sign-up.</p></form><p className="mt-5 text-center text-sm text-[#78857d]">Already part of the community? <Link className="font-semibold text-[#176b4b] hover:underline" href="/login">Log in</Link></p></div></Brand>
}

export function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const callbackUrl = new URL(process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`)
    callbackUrl.searchParams.set('next', '/reset-password')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl.toString() })
    if (resetError) setError('We couldn’t send the reset link right now. Please try again shortly.')
    else setSent(true)
    setBusy(false)
  }
  return <Brand><div><p className="text-[10px] font-bold tracking-[.17em] text-[#63866d]">ACCOUNT RECOVERY</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em]">Reset your password.</h2>{sent ? <div role="status" className="mt-5 rounded-2xl border border-[#dce8da] bg-[#f0f5ee] p-4 text-sm leading-6 text-[#42634d]">If an account is associated with that email, we’ve sent a password reset link. Check your inbox and follow the instructions.</div> : <><p className="mt-2 text-sm leading-6 text-[#77847c]">Enter the email address associated with your account and we’ll send a reset link.</p><form onSubmit={submit} className="mt-7 grid gap-5"><Field label="Email address"><input required type="email" name="email" autoComplete="email" placeholder="you@example.com" className={inputClass} /></Field>{error && <p role="alert" className="text-xs text-[#bd4b43]">{error}</p>}<button disabled={busy} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#176b4b] text-sm font-semibold text-white hover:bg-[#164c3b] disabled:opacity-60">{busy ? 'Sending link…' : 'Send reset link'}</button></form></>}<Link href="/login" className="mt-7 inline-flex items-center gap-2 text-xs font-medium text-[#7c8981] hover:text-[#176b4b]"><ArrowLeft size={14} /> Back to log in</Link></div></Brand>
}

export function ResetPasswordPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    if (password !== String(form.get('confirmPassword') ?? '')) { setError('Your passwords don’t match.'); setBusy(false); return }
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError('This reset link may have expired. Request a new link and try again.')
    else { setUpdated(true); window.setTimeout(() => router.replace('/dashboard'), 900) }
    setBusy(false)
  }
  return <Brand><div><p className="text-[10px] font-bold tracking-[.17em] text-[#63866d]">ACCOUNT RECOVERY</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em]">Choose a new password.</h2>{updated ? <div role="status" className="mt-5 rounded-2xl border border-[#dce8da] bg-[#f0f5ee] p-4 text-sm text-[#42634d]">Password updated. Taking you to your account…</div> : <form onSubmit={submit} className="mt-7 grid gap-5"><Field label="New password" hint="Use at least 8 characters."><input required minLength={8} type="password" name="password" autoComplete="new-password" className={inputClass} /></Field><Field label="Confirm new password"><input required minLength={8} type="password" name="confirmPassword" autoComplete="new-password" className={inputClass} /></Field>{error && <p role="alert" className="text-xs text-[#bd4b43]">{error}</p>}<button disabled={busy} className="flex h-12 items-center justify-center rounded-full bg-[#176b4b] text-sm font-semibold text-white hover:bg-[#164c3b] disabled:opacity-60">{busy ? 'Updating…' : 'Update password'}</button></form>}<p className="mt-5 text-xs text-[#859188]">The reset link is required to update your password.</p></div></Brand>
}
