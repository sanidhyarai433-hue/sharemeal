'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, MapPin, Clock3, PackageCheck, HeartHandshake, Leaf, RotateCcw, CheckCircle2, Utensils, Boxes, Truck } from 'lucide-react'

type Listing = { id: number; name: string; donor: string; category: string; kg: number; servings: number; area: string; distance: string; deadline: string; score: number }
type RequestItem = { listingId: number; status: number; requestedAt: string }
const listings: Listing[] = [
  { id: 1, name: 'Vegetable pulao with raita', donor: 'Green Bowl Kitchen', category: 'Prepared meals', kg: 15, servings: 75, area: 'Kadri, Mangaluru', distance: '2.1 km', deadline: 'Today, 8:30 PM', score: 96 },
  { id: 2, name: 'Fresh seasonal vegetables', donor: 'Coastal Fresh Mart', category: 'Groceries', kg: 10, servings: 40, area: 'Bejai, Mangaluru', distance: '3.4 km', deadline: 'Today, 9:00 PM', score: 91 },
  { id: 3, name: 'Chapati and chana masala', donor: 'Annapoorna Canteen', category: 'Prepared meals', kg: 8, servings: 48, area: 'Hampankatta, Mangaluru', distance: '4.8 km', deadline: 'Today, 7:45 PM', score: 88 },
  { id: 4, name: 'Bananas and papayas', donor: 'Daily Harvest Store', category: 'Fruits', kg: 12, servings: 55, area: 'Bendoor, Mangaluru', distance: '5.2 km', deadline: 'Tomorrow, 10:00 AM', score: 84 },
]
const stages = ['Requested', 'Accepted', 'Picked up', 'Delivered']
const storageKey = 'sharemeal-ngo-demo-requests-v1'

export default function NgoDemoClient() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [tab, setTab] = useState<'discover' | 'requests'>('discover')
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try { const saved = localStorage.getItem(storageKey); if (saved) setRequests(JSON.parse(saved)) } catch {}
    setReady(true)
  }, [])
  useEffect(() => { if (ready) localStorage.setItem(storageKey, JSON.stringify(requests)) }, [requests, ready])

  const filtered = useMemo(() => listings.filter(item => (category === 'All' || item.category === category) && (item.name + item.donor + item.area).toLowerCase().includes(query.toLowerCase())), [category, query])
  const requestedIds = new Set(requests.map(item => item.listingId))
  const totalKg = requests.reduce((sum, request) => sum + (listings.find(item => item.id === request.listingId)?.kg ?? 0), 0)
  const totalServings = requests.reduce((sum, request) => sum + (listings.find(item => item.id === request.listingId)?.servings ?? 0), 0)

  function requestFood(id: number) {
    if (!requestedIds.has(id)) setRequests(current => [...current, { listingId: id, status: 0, requestedAt: new Date().toLocaleString() }])
    setTab('requests')
  }
  function advance(id: number) { setRequests(current => current.map(item => item.listingId === id ? { ...item, status: Math.min(item.status + 1, 3) } : item)) }
  function reset() { setRequests([]); localStorage.removeItem(storageKey) }

  return <main className="min-h-screen bg-[#f7f7f1] text-[#193b30]">
    <header className="border-b border-[#e5e9df] bg-white/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl bg-[#eaf2e8] text-[#176b4b]"><Leaf size={19}/></span>SHAREMEAL<span className="text-[#8cac83]">.</span></Link>
        <div className="flex items-center gap-3"><span className="hidden rounded-full bg-[#fff3dc] px-3 py-1.5 text-[11px] font-bold text-[#93651c] sm:inline">DEMO MODE</span><Link href="/login" className="text-sm font-semibold text-[#547061] hover:text-[#176b4b]">Exit demo</Link></div>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Link href="/login" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#789084] hover:text-[#176b4b]"><ArrowLeft size={14}/> Back to login</Link><p className="text-[10px] font-bold tracking-[.2em] text-[#779578]">COMMUNITY PARTNER SPACE</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.055em] sm:text-4xl">Good evening, Community Partner.</h1><p className="mt-2 text-sm text-[#78877d]">Find surplus food nearby and coordinate a pickup for your community.</p></div><div className="rounded-2xl border border-[#e6e8dc] bg-white px-4 py-3 text-xs text-[#718176]"><span className="font-semibold text-[#315c43]">Sample NGO account</span><br/>Mangaluru Community Support</div></div>
      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{label:'Available listings',value:listings.length,icon:Boxes},{label:'Requests made',value:requests.length,icon:HeartHandshake},{label:'Food requested',value:totalKg+' kg',icon:PackageCheck},{label:'Potential servings',value:totalServings,icon:Utensils}].map((stat) => <div key={stat.label} className="rounded-2xl border border-[#e7e9df] bg-white p-4 sm:p-5"><div className="flex items-center justify-between"><span className="text-xs text-[#849087]">{stat.label}</span><stat.icon size={17} className="text-[#6c9875]"/></div><p className="mt-3 text-2xl font-semibold tracking-tight">{stat.value}</p></div>)}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-full border border-[#e2e7dd] bg-white p-1"><button onClick={()=>setTab('discover')} className={`rounded-full px-5 py-2 text-xs font-semibold transition ${tab==='discover'?'bg-[#176b4b] text-white':'text-[#718176] hover:bg-[#f1f5ef]'}`}>Discover food</button><button onClick={()=>setTab('requests')} className={`rounded-full px-5 py-2 text-xs font-semibold transition ${tab==='requests'?'bg-[#176b4b] text-white':'text-[#718176] hover:bg-[#f1f5ef]'}`}>My requests ({requests.length})</button></div><button onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#849087] hover:text-[#a34e43]"><RotateCcw size={13}/> Reset demo activity</button></div>
      {tab==='discover' ? <><div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a096]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search food, donor or location..." className="h-12 w-full rounded-xl border border-[#e1e7dd] bg-white pl-11 pr-4 text-sm outline-none focus:border-[#78a17d]"/></label><select value={category} onChange={e=>setCategory(e.target.value)} className="h-12 rounded-xl border border-[#e1e7dd] bg-white px-4 text-sm text-[#496454] outline-none"><option>All</option><option>Prepared meals</option><option>Groceries</option><option>Fruits</option></select></div><div className="grid gap-4 md:grid-cols-2">{filtered.map(item=><article key={item.id} className="rounded-2xl border border-[#e5e9df] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-[#edf4eb] px-2.5 py-1 text-[10px] font-bold text-[#4d7956]">{item.category}</span><h2 className="mt-3 text-lg font-semibold tracking-tight">{item.name}</h2><p className="mt-1 text-xs text-[#849087]">Donated by {item.donor}</p></div><div className="rounded-xl bg-[#f0f5ed] px-3 py-2 text-center"><p className="text-lg font-bold text-[#286445]">{item.score}%</p><p className="text-[9px] font-bold tracking-wide text-[#81927f]">DEMO MATCH</p></div></div><div className="my-4 grid grid-cols-2 gap-3 rounded-xl bg-[#f8f9f5] p-3"><div><p className="text-[10px] text-[#8b978d]">Quantity</p><p className="mt-1 text-sm font-semibold">{item.kg} kg · {item.servings} servings</p></div><div><p className="text-[10px] text-[#8b978d]">Pickup by</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold"><Clock3 size={13}/>{item.deadline}</p></div></div><div className="flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-1.5 text-xs text-[#849087]"><MapPin size={14}/>{item.area} · {item.distance}</p><button disabled={requestedIds.has(item.id)} onClick={()=>requestFood(item.id)} className="rounded-full bg-[#176b4b] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#164c3b] disabled:cursor-default disabled:bg-[#e8efe6] disabled:text-[#54745a]">{requestedIds.has(item.id)?'Requested ✓':'Request food'}</button></div></article>)}</div>{filtered.length===0&&<div className="rounded-2xl border border-dashed border-[#dce4d9] bg-white p-12 text-center text-sm text-[#829087]">No sample listings match your search.</div>}</> : <div className="grid gap-4 md:grid-cols-2">{requests.length===0?<div className="col-span-full rounded-2xl border border-dashed border-[#dce4d9] bg-white p-12 text-center"><HeartHandshake className="mx-auto text-[#8ca98b]" size={30}/><h2 className="mt-3 font-semibold">No requests yet</h2><p className="mt-1 text-sm text-[#849087]">Explore available food and request a listing to see it here.</p><button onClick={()=>setTab('discover')} className="mt-4 rounded-full bg-[#176b4b] px-5 py-2.5 text-xs font-semibold text-white">Browse listings</button></div>:requests.map(request=>{const item=listings.find(x=>x.id===request.listingId)!;return <article key={item.id} className="rounded-2xl border border-[#e5e9df] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">{item.name}</h2><p className="mt-1 text-xs text-[#849087]">{item.donor} · {item.kg} kg</p></div><span className="rounded-full bg-[#edf4eb] px-3 py-1 text-[10px] font-bold text-[#4d7956]">{stages[request.status]}</span></div><div className="my-5 grid grid-cols-4 gap-1">{stages.map((stage,index)=><div key={stage}><div className={`h-1.5 rounded-full ${index<=request.status?'bg-[#4f8a60]':'bg-[#e7ebe4]'}`}/><p className="mt-2 text-[9px] text-[#849087]">{stage}</p></div>)}</div><p className="text-[11px] text-[#87938a]">Demo request · {request.requestedAt}</p><button disabled={request.status===3} onClick={()=>advance(item.id)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#cbdac9] px-4 py-2 text-xs font-semibold text-[#376b49] hover:bg-[#f1f6ef] disabled:opacity-50">{request.status===0?<><HeartHandshake size={14}/> Mark as accepted</>:request.status===1?<><PackageCheck size={14}/> Mark as picked up</>:request.status===2?<><Truck size={14}/> Mark as delivered</>:<><CheckCircle2 size={14}/> Completed</>}</button></article>})}</div>}
      <div className="mt-8 flex gap-3 rounded-2xl border border-[#e9e5d6] bg-[#fffdf6] p-4 text-xs leading-5 text-[#82785e]"><span className="mt-0.5 text-[#b18a3c]">ⓘ</span><p><strong>Demo environment:</strong> All food listings, donor names, match scores and pickup details are sample data. Requests and status changes are saved only in this browser. No real donor or NGO is contacted, and no real food pickup is arranged.</p></div>
    </div>
  </main>
}
