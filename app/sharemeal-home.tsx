'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { ArrowDown, ArrowRight, ArrowUpRight, CircleCheck, HandHeart, HeartHandshake, Leaf, LogOut, Menu, Package, Plus, ShieldCheck, Sprout, Truck, Utensils, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PublicScrollEnhancer } from './site-motion'

type Role = 'donor' | 'ngo' | 'volunteer'
type Profile = { id: string; full_name: string; role: Role; organization_name: string | null }
type Donation = { id: string; food_name: string; category: string; quantity_kg: number; servings: number; food_type: string; pickup_deadline: string; pickup_address: string; status: string; created_at: string }

const supabase = createClient()
const FloatingLeaf = dynamic(() => import('./floating-leaf'), { ssr: false })
const roles: { title: string; role: Role; icon: typeof Utensils; text: string; action: string; tone: string }[] = [
  { title: 'Food donors', role: 'donor', icon: Utensils, text: 'Share fresh surplus from your restaurant, kitchen, event or store.', action: 'I have food to share', tone: 'bg-[#eaf2e8]' },
  { title: 'Community partners', role: 'ngo', icon: HeartHandshake, text: 'Connect your organization with food that can help your community.', action: 'We serve our community', tone: 'bg-[#f2ecdf]' },
  { title: 'Volunteers', role: 'volunteer', icon: Truck, text: 'Bring your time, your wheels or a helping hand to the table.', action: 'I can lend a hand', tone: 'bg-[#e9edf2]' },
]
const steps = [
  { icon: Utensils, title: 'A little extra?', text: 'Restaurants and kitchens list fresh surplus before it goes to waste.' },
  { icon: HeartHandshake, title: 'A neighbor in need', text: 'Community organizations find food that fits their needs.' },
  { icon: Truck, title: 'A helping hand', text: 'Local volunteers lend a hand with pickup and delivery.' },
  { icon: HandHeart, title: 'A meal, shared', text: 'Good food reaches the people and families who need it most.' },
]

function AnimatedCount({ value, suffix = '' }: { value: number; suffix?: string }) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const isVisible = useInView(elementRef, { once: true, margin: '0px 0px -10% 0px' })
  const reduceMotion = useReducedMotion()
  const valueMotion = useMotionValue(0)
  const spring = useSpring(valueMotion, { stiffness: 92, damping: 22, mass: 0.8 })
  const display = useTransform(spring, (current) => `${Number(current.toFixed(1)).toLocaleString()}${suffix}`)
  useEffect(() => { if (isVisible && !reduceMotion) valueMotion.set(value) }, [isVisible, reduceMotion, valueMotion, value])
  return <motion.span ref={elementRef}>{reduceMotion ? `${value.toLocaleString()}${suffix}` : display}</motion.span>
}

function LazyLeaf() {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '160px' })
    observer.observe(anchor)
    return () => observer.disconnect()
  }, [])

  return <div ref={anchorRef} aria-hidden="true" className="pointer-events-none absolute inset-0">{visible && <FloatingLeaf />}</div>
}

export default function ShareMealHome() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [donationOpen, setDonationOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function loadAccount() {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    setUser(currentUser ? { id: currentUser.id, email: currentUser.email } : null)
    if (!currentUser) { setProfile(null); setDonations([]); return }
    const [{ data: profileData }, { data: donationData }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,role,organization_name').eq('id', currentUser.id).maybeSingle(),
      supabase.from('donations').select('id,food_name,category,quantity_kg,servings,food_type,pickup_deadline,pickup_address,status,created_at').eq('donor_id', currentUser.id).order('created_at', { ascending: false }).limit(5),
    ])
    setProfile(profileData as Profile | null)
    setDonations((donationData ?? []) as Donation[])
  }

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return
      setUser({ id: data.user.id, email: data.user.email })
      const [{ data: profileData }, { data: donationData }] = await Promise.all([
        supabase.from('profiles').select('id,full_name,role,organization_name').eq('id', data.user.id).maybeSingle(),
        supabase.from('donations').select('id,food_name,category,quantity_kg,servings,food_type,pickup_deadline,pickup_address,status,created_at').eq('donor_id', data.user.id).order('created_at', { ascending: false }).limit(5),
      ])
      if (active) { setProfile(profileData as Profile | null); setDonations((donationData ?? []) as Donation[]) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
      if (session?.user) window.setTimeout(() => { if (active) void loadAccount() }, 0)
      else { setProfile(null); setDonations([]) }
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  const rescuedKg = useMemo(() => donations.filter((donation) => donation.status === 'delivered').reduce((total, donation) => total + Number(donation.quantity_kg), 0), [donations])

  async function submitDonation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) { router.push('/login'); return }
    if (profile?.role !== 'donor') { setNotice('Food donations can be submitted from a donor account.'); setDonationOpen(false); return }
    setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const pickupDeadline = new Date(String(form.get('deadline')))
    if (!Number.isFinite(pickupDeadline.getTime()) || pickupDeadline.getTime() <= Date.now()) { setError('Choose a pickup deadline in the future.'); setBusy(false); return }
    const imageFile = form.get('foodImage')
    let imageUrl: string | null = null
    if (imageFile instanceof File && imageFile.size > 0) {
      if (!imageFile.type.startsWith('image/')) { setError('Please choose an image file.'); setBusy(false); return }
      if (imageFile.size > 5 * 1024 * 1024) { setError('Food image must be smaller than 5 MB.'); setBusy(false); return }
      const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('food-images').upload(imagePath, imageFile, { contentType: imageFile.type, upsert: false })
      if (uploadError) { setError('Food photo could not be uploaded. Please try again.'); setBusy(false); return }
      const { data: publicImage } = supabase.storage.from('food-images').getPublicUrl(imagePath)
      imageUrl = publicImage.publicUrl
    }
    const { error: insertError } = await supabase.from('donations').insert({
      donor_id: user.id,
      image_url: imageUrl,
      food_name: String(form.get('foodName') ?? '').trim(),
      category: String(form.get('category') ?? 'Cooked meals'),
      quantity_kg: Number(form.get('quantity')),
      servings: Number(form.get('servings')),
      food_type: String(form.get('foodType') ?? 'Vegetarian'),
      pickup_deadline: pickupDeadline.toISOString(),
      pickup_address: String(form.get('address') ?? '').trim(),
      pickup_latitude: form.get('pickupLatitude') ? Number(form.get('pickupLatitude')) : null,
      pickup_longitude: form.get('pickupLongitude') ? Number(form.get('pickupLongitude')) : null,
      special_instructions: String(form.get('instructions') ?? '').trim() || null,
    })
    if (insertError) setError('We couldn’t submit that donation. Check your details and try again.')
    else { setDonationOpen(false); setNotice('Donation submitted for verification. Thank you for sharing good food.'); await loadAccount() }
    setBusy(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setDonations([]); setNotice('You’re signed out.')
  }

  const reveal = reduceMotion ? false : { opacity: 0, y: 20 }
  const inView = { opacity: 1, y: 0 }
  const viewport = { once: true, amount: 0.16 }

  return <main className="min-h-screen overflow-hidden bg-[#faf9f5] text-[#193b30]">
    <PublicScrollEnhancer />
    <div className="bg-[#164c3b] px-4 py-2 text-center text-[10px] font-semibold tracking-[.13em] text-white/90 sm:text-xs">RESCUE FOOD <span className="mx-2 text-[#b7d1ba]">·</span> SHARE HOPE <span className="mx-2 text-[#b7d1ba]">·</span> MAKE EVERY MEAL COUNT</div>
    <header className="sticky top-0 z-30 border-b border-[#e8eae2]/70 bg-[#faf9f5]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="SHAREMEAL home"><span className="flex size-10 items-center justify-center rounded-[14px] bg-[#e6efe5] text-[#176b4b]"><Leaf size={21} /></span><span className="text-[19px] font-semibold tracking-[.04em]">SHAREMEAL<span className="text-[#176b4b]">.</span><span className="mt-0.5 block text-[9px] font-medium tracking-[.18em] text-[#78867e]">GOOD FOOD. GREATER IMPACT.</span></span></Link>
        <nav aria-label="Main navigation" className={`${menuOpen ? 'absolute left-4 right-4 top-[72px] flex flex-col rounded-2xl border border-[#e7e9e1] bg-white p-3 shadow-xl' : 'hidden'} gap-1 md:static md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          {['How it works', 'Impact', 'Community'].map((label, index) => <motion.a key={label} href={['#how-it-works', '#impact', '#community'][index]} onClick={() => setMenuOpen(false)} whileHover={reduceMotion ? undefined : { y: -1 }} className="group relative px-3 py-2 text-sm font-medium text-[#53665d]">{label}<span className="absolute inset-x-3 bottom-0 h-px origin-left scale-x-0 bg-[#659173] transition-transform duration-300 group-hover:scale-x-100" /></motion.a>)}
          <div className="flex flex-col gap-2 border-t border-[#eef0ea] px-2 pt-3 md:hidden">{user ? <><Link href="/dashboard" className="rounded-xl bg-[#176b4b] px-4 py-2.5 text-sm font-semibold text-white">My dashboard</Link><button onClick={signOut} className="rounded-xl px-4 py-2.5 text-left text-sm font-semibold">Log out</button></> : <><Link href="/login" className="rounded-xl px-4 py-2.5 text-left text-sm font-semibold">Log in</Link><Link href="/signup" className="rounded-xl bg-[#176b4b] px-4 py-2.5 text-sm font-semibold text-white">Join SHAREMEAL <ArrowRight className="ml-2 inline" size={15} /></Link></>}</div>
        </nav>
        <div className="hidden items-center gap-3 md:flex">{user ? <><Link href="/dashboard" className="rounded-full px-4 py-2 text-sm font-semibold text-[#496158] hover:bg-[#eef3eb]">My dashboard</Link><button onClick={signOut} className="rounded-full border border-[#dce3d9] px-4 py-2 text-sm font-semibold text-[#496158] hover:border-[#176b4b]"><LogOut className="mr-1 inline" size={14} />Sign out</button></> : <><Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-[#496158] hover:bg-[#eef3eb]">Log in</Link><Link href="/signup" className="rounded-full bg-[#176b4b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#164c3b]">Join the community <ArrowUpRight className="ml-2 inline" size={15} /></Link></>}</div>
        <button aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="flex size-10 items-center justify-center rounded-full border border-[#e3e8df] bg-white text-[#245542] md:hidden">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
      </div>
    </header>

    {notice && <div role="status" className="mx-auto flex max-w-[1160px] items-center gap-2 px-5 pt-4 text-sm text-[#176b4b]"><CircleCheck size={17} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')} className="ml-auto"><X size={16} /></button></div>}
    <section id="home" className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-16 pt-9 md:pb-24 md:pt-14 lg:grid-cols-[.91fr_1.09fr] lg:gap-12 lg:px-10">
      <div className="relative z-10 max-w-[540px]">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dfe9dc] bg-[#f0f5ee] px-3.5 py-2 text-[10px] font-bold tracking-[.12em] text-[#32644d] sm:text-[11px]"><span className="size-1.5 rounded-full bg-[#50936b]" /> A COMMUNITY THAT CARES</motion.div>
        <motion.h1 initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.13, delayChildren: 0.08 } } }} className="max-w-[570px] text-[clamp(3rem,6.4vw,4.8rem)] font-medium leading-[.99] tracking-[-.075em] text-[#193b30]"><motion.span variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }} className="block">Good food finds</motion.span><motion.span variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }} className="block font-serif italic font-normal text-[#538165]">a better home.</motion.span></motion.h1>
        <motion.p initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="mt-6 max-w-[460px] text-[15px] leading-7 text-[#718078] sm:text-base">Every day, good food goes to waste while neighbors go hungry. SHAREMEAL brings local kitchens, community organizations and caring volunteers together to change that.</motion.p>
        <div className="mt-8 flex flex-wrap items-center gap-3"><motion.button whileHover={reduceMotion ? undefined : { y: -2, scale: 1.015 }} whileTap={{ scale: 0.98 }} onClick={() => !user ? router.push('/signup?role=donor') : profile?.role === 'donor' ? setDonationOpen(true) : router.push('/dashboard') } className="group rounded-full bg-[#176b4b] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(23,107,75,.18)] transition hover:bg-[#164c3b]">Share a meal <ArrowRight className="ml-3 inline transition group-hover:translate-x-1" size={16} /></motion.button><a href="#how-it-works" className="rounded-full border border-[#dfe5dc] bg-white/70 px-6 py-3.5 text-sm font-semibold text-[#436256] transition hover:border-[#93b39b]">See how it works <ArrowDown className="ml-2 inline" size={15} /></a></div>
        <div className="mt-9 flex items-center gap-3 border-t border-[#e6e8df] pt-6"><div className="flex -space-x-2"><span className="flex size-8 items-center justify-center rounded-full border-2 border-[#faf9f5] bg-[#dce9dc] text-[#427356]"><Users size={14} /></span><span className="flex size-8 items-center justify-center rounded-full border-2 border-[#faf9f5] bg-[#e9e1cc] text-[#826b3e]"><HandHeart size={14} /></span><span className="flex size-8 items-center justify-center rounded-full border-2 border-[#faf9f5] bg-[#eadbd1] text-[#955e46]"><Leaf size={14} /></span></div><p className="text-xs leading-5 text-[#748078]">For the kitchens that give.<br /><span className="font-semibold text-[#3b594c]">For the communities that grow.</span></p></div>
      </div>
      <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.15, ease: 'easeOut' }} className="hero-3d-scene relative mx-auto w-full max-w-[640px] lg:max-w-none"><motion.div aria-hidden="true" animate={reduceMotion ? undefined : { x: [0, 8, 0], y: [0, -10, 0], scale: [1, 1.06, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute -right-10 -top-7 size-40 rounded-full bg-[#ebf1e5] blur-3xl"/><div className="relative overflow-hidden rounded-[34px] bg-[#e8e8d8] shadow-[0_24px_70px_rgba(38,69,47,.12)] sm:rounded-[42px] lg:rounded-[48px] lg:rounded-bl-[150px]"><Image src="/sharemeal-community-meal.png" alt="A community volunteer shares a warm meal with a neighbor" width={1400} height={1050} priority className="hero-main-image aspect-[1.23/1] w-full object-cover transition-transform duration-700 hover:scale-[1.025]"/><div className="absolute inset-0 bg-gradient-to-t from-[#173d2d]/55 via-transparent to-transparent"/><div className="absolute bottom-5 left-5 right-5 flex items-end justify-between sm:bottom-7 sm:left-7 sm:right-7"><div className="text-white"><p className="text-[10px] font-semibold tracking-[.18em] text-white/75">A SIMPLE ACT, A SHARED FUTURE</p><p className="mt-1 text-xl font-medium tracking-[-.035em] sm:text-2xl">Food is better when it&apos;s shared.</p></div><span className="hidden size-11 items-center justify-center rounded-full border border-white/35 bg-white/15 text-white backdrop-blur-sm sm:flex"><ArrowUpRight size={19} /></span></div></div><motion.div aria-hidden="true" className="hero-float-card hero-float-card-top" animate={{ y:[0,-11,0], rotate:[-5,-2,-5] }} transition={{ duration:5.5, repeat:Infinity, ease:"easeInOut" }}><span className="hero-float-icon"><Utensils size={18}/></span><span><b>Fresh food, shared</b><small>Goodness in motion</small></span></motion.div><motion.div aria-hidden="true" className="hero-float-card hero-float-card-side" animate={{ y:[0,9,0], rotate:[4,1,4] }} transition={{ duration:6.5, repeat:Infinity, ease:"easeInOut", delay:.4 }}><span className="hero-float-icon"><HeartHandshake size={18}/></span><span><b>5 km community</b><small>Help, closer to home</small></span></motion.div><div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-[#e9ece4] bg-white px-4 py-3 shadow-[0_10px_30px_rgba(33,63,44,.1)] sm:bottom-5 sm:-left-5 sm:px-5 sm:py-4"><span className="flex size-10 items-center justify-center rounded-full bg-[#eaf2e8] text-[#176b4b]"><Sprout size={19} /></span><div><p className="text-[11px] font-bold tracking-wide text-[#284d3b]">RESCUE FOOD</p><p className="text-[11px] text-[#829087]">Share hope, close to home</p></div></div><span className="absolute -right-3 top-6 hidden size-12 items-center justify-center rounded-full border border-[#dbe7d9] bg-[#f6f7ef] text-[#6a9274] md:flex"><Leaf size={20} /></span><LazyLeaf /></motion.div>
    </section>

    <section className="border-y border-[#e8eae2] bg-white/70"><div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-0 px-5 py-2 sm:grid-cols-4 lg:px-10">{[{ icon: Sprout, title: 'Less waste', text: 'Give surplus a purpose' }, { icon: HandHeart, title: 'More care', text: 'Nourish our neighbors' }, { icon: ShieldCheck, title: 'Built on trust', text: 'People-first, always' }, { icon: Users, title: 'Stronger together', text: 'Local hearts, shared hope' }].map(({ icon: Icon, title, text }) => <motion.div key={title} initial={reveal} whileInView={inView} viewport={viewport} transition={{ duration: 0.5 }} className="flex items-center gap-3 border-[#edf0e9] px-2 py-4 sm:border-r sm:px-5 sm:py-6 sm:last:border-r-0"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f4ed] text-[#48815d]"><Icon size={17} /></span><div><p className="text-xs font-semibold text-[#2a4d3b] sm:text-sm">{title}</p><p className="mt-0.5 hidden text-[11px] text-[#88938c] sm:block">{text}</p></div></motion.div>)}</div></section>

    <motion.section id="how-it-works" initial={reveal} whileInView={inView} viewport={viewport} transition={{ duration: 0.65, ease: 'easeOut' }} className="mx-auto max-w-[1240px] px-5 py-20 sm:py-24 lg:px-10"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold tracking-[.18em] text-[#63866d]">SMALL STEPS. REAL CONNECTION.</p><h2 className="mt-3 max-w-[550px] text-3xl font-medium tracking-[-.06em] sm:text-4xl">A meal finds its way <span className="font-serif italic font-normal text-[#668c70]">home.</span></h2></div><p className="max-w-[350px] text-sm leading-6 text-[#77847c]">A whole community closes the gap between surplus and need. Here&apos;s how.</p></div><div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{steps.map(({ icon: Icon, title, text }, index) => <motion.article key={title} initial={reduceMotion ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.48, delay: reduceMotion ? 0 : index * 0.08 }} whileHover={reduceMotion ? undefined : { y: -5, rotateX: 1, rotateY: -1 }} style={{ transformPerspective: 900 }} className="rounded-[22px] border border-[#e8eae2] bg-white p-5 transition-shadow hover:border-[#cbdacb] hover:shadow-[0_14px_35px_rgba(34,70,43,.08)] sm:p-6"><div className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-[15px] bg-[#edf3ea] text-[#43805a]"><Icon size={20} /></span><span className="text-xs font-medium tracking-[.12em] text-[#bac5bc]">0{index + 1}</span></div><h3 className="mt-7 text-base font-semibold tracking-[-.025em]">{title}</h3><p className="mt-2 text-[13px] leading-6 text-[#78857d]">{text}</p></motion.article>)}</div></motion.section>

    <motion.section id="impact" initial={reveal} whileInView={inView} viewport={viewport} transition={{ duration: 0.65 }} className="mx-5 overflow-hidden rounded-[28px] bg-[#164c3b] sm:mx-8 sm:rounded-[36px]"><div className="mx-auto grid max-w-[1160px] gap-9 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14 lg:py-14"><div><p className="text-[10px] font-semibold tracking-[.18em] text-[#bbd6c1]">OUR SHARED IMPACT</p><h2 className="mt-3 max-w-[490px] text-3xl font-medium leading-tight tracking-[-.055em] text-white sm:text-4xl">The best things grow when we <span className="font-serif italic font-normal text-[#bdd9b9]">share them.</span></h2><p className="mt-4 max-w-[470px] text-sm leading-6 text-white/65">Every rescued meal starts with someone choosing to care. Join the community and help us build a more thoughtful food system.</p><a href="#community" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#d3e6cb] hover:text-white">Meet the community <ArrowRight size={15} /></a></div><div className="grid grid-cols-2 gap-3 lg:w-[370px]">{[{ value: profile?.role === 'donor' ? rescuedKg : null, suffix: ' kg', label: 'Rescued by you' }, { value: profile?.role === 'donor' ? donations.length : null, suffix: '', label: 'Your donations' }].map((stat, index) => <motion.div key={stat.label} initial={reduceMotion ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: index * 0.1 }} className="rounded-2xl border border-white/15 bg-white/[.07] p-4 sm:p-5"><p className="text-2xl font-semibold tracking-[-.04em] text-white sm:text-3xl">{stat.value === null ? '—' : <AnimatedCount value={stat.value} suffix={stat.suffix} />}</p><p className="mt-1 text-[11px] text-white/60">{stat.label}</p></motion.div>)}</div></div></motion.section>

    <motion.section id="community" initial={reveal} whileInView={inView} viewport={viewport} transition={{ duration: 0.65 }} className="mx-auto max-w-[1240px] px-5 py-20 sm:py-24 lg:px-10"><div className="text-center"><p className="text-[10px] font-bold tracking-[.18em] text-[#63866d]">THERE&apos;S A PLACE FOR YOU HERE</p><h2 className="mt-3 text-3xl font-medium tracking-[-.06em] sm:text-4xl">Good things happen <span className="font-serif italic font-normal text-[#668c70]">together.</span></h2><p className="mx-auto mt-3 max-w-[480px] text-sm leading-6 text-[#77847c]">Whether you have food to share, a community to feed or time to give, you can make a difference.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{roles.map(({ icon: Icon, title, role, text, action, tone }, index) => <motion.article key={title} initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.48, delay: reduceMotion ? 0 : index * 0.08 }} whileHover={reduceMotion ? undefined : { y: -5, rotateX: 1, rotateY: -1 }} style={{ transformPerspective: 900 }} className="rounded-[22px] border border-[#e7eae2] bg-white p-6 transition-shadow hover:border-[#cbdacb] hover:shadow-[0_14px_35px_rgba(34,70,43,.08)] sm:p-7"><span className={`flex size-12 items-center justify-center rounded-2xl ${tone} text-[#3f7353]`}><Icon size={21} /></span><h3 className="mt-5 text-lg font-semibold tracking-[-.035em]">{title}</h3><p className="mt-2 min-h-[48px] text-[13px] leading-6 text-[#77847c]">{text}</p><Link href={`/signup?role=${role}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#176b4b] transition-[gap] hover:gap-3">{action}<ArrowRight size={15} /></Link></motion.article>)}</div></motion.section>

    {user && <motion.section id="dashboard" initial={reveal} whileInView={inView} viewport={viewport} transition={{ duration: 0.6 }} className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pb-20 lg:px-10"><div className="rounded-[28px] border border-[#e6e9e1] bg-white p-5 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold tracking-[.16em] text-[#63866d]">YOUR SHAREMEAL SPACE</p><h2 className="mt-2 text-2xl font-medium tracking-[-.05em]">Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ' back'}.</h2><p className="mt-1 text-sm text-[#77847c]">{profile?.organization_name || profile?.role || 'Community member'} · {user.email}</p></div>{profile?.role === 'donor' && <motion.button whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => { setError(''); setDonationOpen(true) }} className="rounded-full bg-[#176b4b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#164c3b]"><Plus className="mr-2 inline" size={16} />Share a donation</motion.button>}</div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#f4f6f0] p-4"><Package className="text-[#548164]" size={18} /><p className="mt-4 text-2xl font-semibold"><AnimatedCount value={donations.length} /></p><p className="mt-1 text-xs text-[#77847c]">Recent donations</p></div><div className="rounded-2xl bg-[#f4f6f0] p-4"><Sprout className="text-[#548164]" size={18} /><p className="mt-4 text-2xl font-semibold"><AnimatedCount value={rescuedKg} suffix=" kg" /></p><p className="mt-1 text-xs text-[#77847c]">Delivered food</p></div><div className="col-span-2 rounded-2xl bg-[#f4f6f0] p-4 sm:col-span-1"><ShieldCheck className="text-[#548164]" size={18} /><p className="mt-4 text-sm font-semibold">{profile?.role || 'Profile pending'}</p><p className="mt-1 text-xs text-[#77847c]">Your community role</p></div></div><div className="mt-7"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Your recent donations</h3>{profile?.role !== 'donor' && <span className="text-xs text-[#849087]">Role-specific tools are available in your dashboard</span>}</div>{donations.length ? <div className="mt-3 divide-y divide-[#eef0ea]">{donations.map((donation) => <motion.article key={donation.id} layout className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-semibold">{donation.food_name}</p><p className="mt-1 text-xs text-[#7b8880]">{donation.quantity_kg} kg · {donation.servings} servings · {donation.category}</p></div><span className="rounded-full bg-[#f4efe1] px-3 py-1.5 text-[10px] font-semibold capitalize text-[#806d43]">{donation.status.replaceAll('_', ' ')}</span></motion.article>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-[#dfe5dc] px-5 py-8 text-center"><Package className="mx-auto text-[#91a594]" size={22} /><p className="mt-3 text-sm font-medium">No donations yet</p><p className="mt-1 text-xs text-[#849087]">Your real SHAREMEAL activity will appear here.</p></div>}</div><Link href="/dashboard" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#176b4b]">Open your dashboard <ArrowRight size={15} /></Link></div></motion.section>}

    <motion.section initial={reveal} whileInView={inView} viewport={viewport} transition={{ duration: 0.6 }} className="mx-auto max-w-[1240px] px-5 pb-16 lg:px-10"><div className="flex flex-col items-start justify-between gap-5 rounded-[26px] bg-[#edf2e9] px-6 py-8 sm:flex-row sm:items-center sm:px-10 sm:py-9"><div><p className="text-[10px] font-bold tracking-[.16em] text-[#63866d]">ONE COMMUNITY, MANY SMALL ACTS</p><h2 className="mt-2 text-2xl font-medium tracking-[-.05em] sm:text-3xl">Every meal counts. <span className="font-serif italic font-normal text-[#668c70]">Be part of it.</span></h2></div><motion.button whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => user && profile?.role === 'donor' ? setDonationOpen(true) : router.push('/signup')} className="shrink-0 rounded-full bg-[#176b4b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#164c3b]">Join SHAREMEAL <ArrowRight className="ml-2 inline" size={15} /></motion.button></div></motion.section>
    <footer className="border-t border-[#e8eae2] bg-white/60"><div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between lg:px-10"><Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-[.03em]"><span className="flex size-8 items-center justify-center rounded-xl bg-[#e6efe5] text-[#176b4b]"><Leaf size={16} /></span>SHAREMEAL<span className="font-normal tracking-normal text-[#7e8a82]">· Rescue food. Share hope.</span></Link><div className="flex gap-5 text-xs text-[#748078]"><a href="#how-it-works" className="hover:text-[#176b4b]">How it works</a><a href="#community" className="hover:text-[#176b4b]">Community</a><a href="#community" className="hover:text-[#176b4b]">Get involved</a></div><p className="text-[11px] text-[#8a958d]">© {new Date().getFullYear()} SHAREMEAL. Good food. Greater impact.</p></div></footer>

    <AnimateDonationDialog open={donationOpen} onClose={() => setDonationOpen(false)} onSubmit={submitDonation} busy={busy} error={error} />
  </main>
}

function AnimateDonationDialog({ open, onClose, onSubmit, busy, error }: { open: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; busy: boolean; error: string }) {
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationMessage, setLocationMessage] = useState('Add a pickup address or use your live location.')
  function capturePickupLocation() {
    if (!navigator.geolocation) { setLocationMessage('Live location is not supported in this browser.'); return }
    setLocationMessage('Getting your location…')
    navigator.geolocation.getCurrentPosition(
      position => { setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocationMessage('Pickup location captured. Nearby NGOs within 5 km can be notified.') },
      () => setLocationMessage('Location permission was not granted. You can still enter the pickup address manually.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }
  return <AnimatePresence>
    {open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#12392c]/45 p-4 backdrop-blur-[3px]" data-lenis-prevent>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="donation-dialog-title" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.99 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="relative my-auto w-full max-w-[480px] rounded-[26px] border border-[#e7eae2] bg-[#fffefa] p-6 shadow-[0_28px_90px_rgba(15,47,32,.24)] sm:p-8">
        <button aria-label="Close donation dialog" onClick={onClose} className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-[#687a70] hover:bg-[#f1f3ed]"><X size={18} /></button><span className="flex size-11 items-center justify-center rounded-2xl bg-[#eaf2e8] text-[#176b4b]"><Package size={20} /></span><h2 id="donation-dialog-title" className="mt-4 text-2xl font-semibold tracking-[-.05em]">Share good food</h2><p className="mt-1 text-sm text-[#77847c]">Tell your neighbors what you have to share.</p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4"><label className="grid gap-1.5 text-xs font-semibold text-[#385648]">Food photo <span className="font-normal text-[#859188]">(optional · JPG, PNG or WEBP · max 5 MB)</span><input type="file" name="foodImage" accept="image/jpeg,image/png,image/webp,image/*" className="w-full rounded-xl border border-dashed border-[#cbdac9] bg-[#f7faf5] px-3 py-3 text-sm font-normal text-[#53665d] file:mr-3 file:rounded-full file:border-0 file:bg-[#e6efe5] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#176b4b]" /></label><label className="grid gap-1.5 text-xs font-semibold text-[#385648]">Food name<input required name="foodName" placeholder="e.g. Vegetable pulao" className="h-11 rounded-xl border border-[#dfe5dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#6d9a78]" /></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5 text-xs font-semibold text-[#385648]">Category<select name="category" className="h-11 rounded-xl border border-[#dfe5dc] bg-white px-3 text-sm font-normal"><option>Cooked meals</option><option>Rice and grains</option><option>Vegetables</option><option>Fruits</option><option>Bakery items</option><option>Packaged food</option><option>Dairy products</option><option>Other</option></select></label><label className="grid gap-1.5 text-xs font-semibold text-[#385648]">Food type<select name="foodType" className="h-11 rounded-xl border border-[#dfe5dc] bg-white px-3 text-sm font-normal"><option>Vegetarian</option><option>Vegan</option><option>Non-vegetarian</option><option>Other</option></select></label></div><div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5 text-xs font-semibold text-[#385648]">Quantity (kg)<input required min="0.1" step="0.1" type="number" name="quantity" placeholder="5" className="h-11 rounded-xl border border-[#dfe5dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#6d9a78]" /></label><label className="grid gap-1.5 text-xs font-semibold text-[#385648]">Approx. servings<input required min="1" step="1" type="number" name="servings" placeholder="20" className="h-11 rounded-xl border border-[#dfe5dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#6d9a78]" /></label></div><label className="grid gap-1.5 text-xs font-semibold text-[#385648]">Pickup by<input required type="datetime-local" name="deadline" min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} className="h-11 rounded-xl border border-[#dfe5dc] bg-white px-3 text-sm font-normal" /></label><label className="grid gap-1.5 text-xs font-semibold text-[#385648]">Pickup address<input required name="address" placeholder="Street, neighborhood, city" className="h-11 rounded-xl border border-[#dfe5dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#6d9a78]" /></label><div className="grid gap-2"><button type="button" onClick={capturePickupLocation} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#cbdac9] bg-[#f3f7f0] text-xs font-semibold text-[#376b49] hover:bg-[#eaf2e8]">Use my live pickup location</button><p className="text-[11px] leading-5 text-[#849087]">{locationMessage}</p><input type="hidden" name="pickupLatitude" value={coordinates?.latitude ?? ""}/><input type="hidden" name="pickupLongitude" value={coordinates?.longitude ?? ""}/></div><label className="grid gap-1.5 text-xs font-semibold text-[#385648]">Pickup notes <span className="font-normal text-[#859188]">(optional)</span><input name="instructions" placeholder="Storage details, containers, contact notes…" className="h-11 rounded-xl border border-[#dfe5dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#6d9a78]" /></label>{error && <p role="alert" className="text-xs text-[#bd4b43]">{error}</p>}<button disabled={busy} className="mt-1 h-12 rounded-full bg-[#176b4b] text-sm font-semibold text-white transition hover:bg-[#164c3b] disabled:opacity-60">{busy ? 'Submitting…' : 'Submit for verification'}</button><p className="text-center text-[11px] leading-5 text-[#849087]">Your donation will be marked pending verification.</p></form>
      </motion.div>
    </motion.div>}
  </AnimatePresence>
}
