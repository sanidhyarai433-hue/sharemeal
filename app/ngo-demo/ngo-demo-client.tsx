'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, MapPin, Clock3, PackageCheck, HeartHandshake, Leaf, RotateCcw, CheckCircle2, Utensils, Boxes, Truck, Navigation } from 'lucide-react'

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


type DemoPoint = { id:number; name:string; donor:string; lat:number; lng:number; area:string; distance:string; kg:number; deadline:string }
const demoPoints: DemoPoint[] = [
 {id:1,name:'Vegetable pulao with raita',donor:'Green Bowl Kitchen',lat:12.8826,lng:74.8561,area:'Kadri, Mangaluru',distance:'2.1 km',kg:15,deadline:'Today, 8:30 PM'},
 {id:2,name:'Fresh seasonal vegetables',donor:'Coastal Fresh Mart',lat:12.8870,lng:74.8432,area:'Bejai, Mangaluru',distance:'3.4 km',kg:10,deadline:'Today, 9:00 PM'},
 {id:3,name:'Chapati and chana masala',donor:'Annapoorna Canteen',lat:12.8702,lng:74.8424,area:'Hampankatta, Mangaluru',distance:'4.8 km',kg:8,deadline:'Today, 7:45 PM'},
 {id:4,name:'Bananas and papayas',donor:'Daily Harvest Store',lat:12.8738,lng:74.8580,area:'Bendoor, Mangaluru',distance:'5.2 km',kg:12,deadline:'Tomorrow, 10:00 AM'}
]
function LiveDemoMap({selectedMapId,onSelect}:{selectedMapId:number;onSelect:(id:number)=>void}) {
 const mapElement=useRef<HTMLDivElement|null>(null),map=useRef<any>(null),receiverMarker=useRef<any>(null),watchId=useRef<number|null>(null)
 const [location,setLocation]=useState<{lat:number;lng:number}|null>(null)
 const [status,setStatus]=useState('Map ready · enable location to track your position')
 const [tracking,setTracking]=useState(false)
 useEffect(()=>{
  let disposed=false
  const init=()=>{
   if(disposed||!mapElement.current||!(window as any).L||map.current)return
   const L=(window as any).L
   map.current=L.map(mapElement.current,{zoomControl:true}).setView([12.8797,74.8433],13)
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map.current)
   demoPoints.forEach(point=>{const marker=L.marker([point.lat,point.lng]).addTo(map.current).bindPopup('<b>'+point.donor+'</b><br/>'+point.name+'<br/>'+point.area+' · '+point.kg+' kg');marker.on('click',()=>onSelect(point.id))})
   setTimeout(()=>map.current?.invalidateSize(),150)
  }
  if(!(window as any).L){
   if(!document.querySelector('link[data-sharemeal-leaflet]')){const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.dataset.sharemealLeaflet='true';document.head.appendChild(css)}
   const existing=document.querySelector('script[data-sharemeal-leaflet]') as HTMLScriptElement|null
   if(existing){existing.addEventListener('load',init);if((window as any).L)init()}
   else{const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.dataset.sharemealLeaflet='true';script.onload=init;script.onerror=()=>setStatus('Map library could not load. Check your internet connection.');document.body.appendChild(script)}
  }else init()
  return()=>{disposed=true;if(watchId.current!==null)navigator.geolocation?.clearWatch(watchId.current);map.current?.remove();map.current=null}
 },[onSelect])
 function startTracking(){
  if(!navigator.geolocation){setStatus('Your browser does not support live location.');return}
  setStatus('Waiting for location permission…')
  watchId.current=navigator.geolocation.watchPosition(position=>{
   const L=(window as any).L,next={lat:position.coords.latitude,lng:position.coords.longitude}
   setLocation(next);setTracking(true);setStatus('Live location tracking is on · accuracy about '+Math.round(position.coords.accuracy)+' m')
   if(L&&map.current){if(!receiverMarker.current)receiverMarker.current=L.circleMarker([next.lat,next.lng],{radius:10,color:'#fff',weight:3,fillColor:'#1685e5',fillOpacity:1}).addTo(map.current).bindPopup('Your live location');else receiverMarker.current.setLatLng([next.lat,next.lng]);map.current.setView([next.lat,next.lng],14)}
  },err=>{setStatus(err.code===1?'Location permission denied. Allow location access in your browser and retry.':'Could not get location. Check GPS and retry.');setTracking(false)},{enableHighAccuracy:true,maximumAge:3000,timeout:15000})
 }
 function stopTracking(){if(watchId.current!==null)navigator.geolocation.clearWatch(watchId.current);watchId.current=null;setTracking(false);setStatus('Live tracking paused.')}
 const selected=demoPoints.find(p=>p.id===selectedMapId)??demoPoints[0]
 const destination=selected.lat+','+selected.lng
 const routeUrl=location?'https://www.google.com/maps/dir/?api=1&origin='+location.lat+','+location.lng+'&destination='+destination+'&travelmode=driving':'https://www.google.com/maps/search/?api=1&query='+destination
 return <section className="mb-5 overflow-hidden rounded-2xl border border-[#dfe7dc] bg-white shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0e9] px-5 py-4"><div><p className="text-[10px] font-bold tracking-[.18em] text-[#779578]">LIVE LOCATION · DEMO MAP</p><h2 className="mt-1 text-lg font-semibold">Track your location & nearby pickups</h2><p className="mt-1 text-xs text-[#849087]">Real map tiles · live receiver GPS · sample donor pins</p></div>{!tracking?<button onClick={startTracking} className="rounded-full bg-[#176b4b] px-4 py-2.5 text-xs font-semibold text-white">◎ Start live tracking</button>:<button onClick={stopTracking} className="rounded-full border border-[#d8e2d6] px-4 py-2.5 text-xs font-semibold text-[#426b4e]">Pause tracking</button>}</div>
  <div className="grid lg:grid-cols-[1.5fr_.8fr]"><div className="relative"><div ref={mapElement} className="h-[390px] w-full bg-[#e9eee2]"/><div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-[10px] text-[#63766a] shadow">🔵 Your live GPS · 🟢 Sample donor locations</div></div>
   <aside className="flex flex-col justify-between border-t border-[#edf0e9] p-5 lg:border-l lg:border-t-0"><div><span className="rounded-full bg-[#edf4eb] px-2.5 py-1 text-[10px] font-bold text-[#4d7956]">SELECTED PICKUP</span><h3 className="mt-4 text-xl font-semibold">{selected.name}</h3><p className="mt-1 text-xs text-[#849087]">{selected.donor}</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f7f8f3] p-3"><p className="text-[10px] text-[#849087]">Sample distance</p><p className="mt-1 font-semibold">{selected.distance}</p></div><div className="rounded-xl bg-[#f7f8f3] p-3"><p className="text-[10px] text-[#849087]">Food quantity</p><p className="mt-1 font-semibold">{selected.kg} kg</p></div></div><p className="mt-4 flex items-center gap-2 text-xs text-[#78877d]"><MapPin size={14}/>{selected.area}</p><p className="mt-2 flex items-center gap-2 text-xs text-[#78877d]"><Clock3 size={14}/>{selected.deadline}</p><p className="mt-5 rounded-xl bg-[#f4f7f1] p-3 text-[11px] leading-5 text-[#607466]">{status}</p>{location&&<p className="mt-2 text-[10px] text-[#849087]">Your coordinates: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>}</div>
    <a target="_blank" rel="noreferrer" href={routeUrl} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#176b4b] px-4 text-xs font-semibold text-white hover:bg-[#164c3b]"><Navigation size={15}/>{location?'Navigate from my location':'Open pickup in Google Maps'} <ArrowLeft size={14} className="rotate-180"/></a>
   </aside></div>
  <div className="border-t border-[#edf0e9] px-5 py-3 text-[10px] leading-5 text-[#849087]">Demo note: your blue dot uses your device GPS and updates while tracking is active. Green donor pins are sample coordinates around Mangaluru, not live donor devices. Real donor tracking requires the donor to share their pickup location.</div>
 </section>
}

export default function NgoDemoClient() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [tab, setTab] = useState<'discover' | 'requests'>('discover')
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [ready, setReady] = useState(false)
  const [selectedMapId, setSelectedMapId] = useState(1)

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

  return <main className="ngo-demo-scene relative isolate min-h-screen overflow-hidden text-[#f0f6ee]">
    <div aria-hidden="true" className="ngo-demo-atmosphere pointer-events-none absolute inset-0 -z-10 overflow-hidden"><span className="ngo-orb ngo-orb-one"/><span className="ngo-orb ngo-orb-two"/><span className="ngo-orb ngo-orb-three"/><span className="ngo-glow-line ngo-glow-line-one"/><span className="ngo-glow-line ngo-glow-line-two"/>{Array.from({length:14},(_,i)=><span key={i} className={`ngo-leaf ngo-leaf-${i+1}`} />)}</div>
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
      {tab==='discover' ? <><div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a096]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search food, donor or location..." className="h-12 w-full rounded-xl border border-[#e1e7dd] bg-white pl-11 pr-4 text-sm outline-none focus:border-[#78a17d]"/></label><select value={category} onChange={e=>setCategory(e.target.value)} className="h-12 rounded-xl border border-[#e1e7dd] bg-white px-4 text-sm text-[#496454] outline-none"><option>All</option><option>Prepared meals</option><option>Groceries</option><option>Fruits</option></select></div>
      <LiveDemoMap selectedMapId={selectedMapId} onSelect={setSelectedMapId} />
      <div className="grid gap-4 md:grid-cols-2">{filtered.map(item=><article key={item.id} className="rounded-2xl border border-[#e5e9df] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-[#edf4eb] px-2.5 py-1 text-[10px] font-bold text-[#4d7956]">{item.category}</span><h2 className="mt-3 text-lg font-semibold tracking-tight">{item.name}</h2><p className="mt-1 text-xs text-[#849087]">Donated by {item.donor}</p></div><div className="rounded-xl bg-[#f0f5ed] px-3 py-2 text-center"><p className="text-lg font-bold text-[#286445]">{item.score}%</p><p className="text-[9px] font-bold tracking-wide text-[#81927f]">DEMO MATCH</p></div></div><div className="my-4 grid grid-cols-2 gap-3 rounded-xl bg-[#f8f9f5] p-3"><div><p className="text-[10px] text-[#8b978d]">Quantity</p><p className="mt-1 text-sm font-semibold">{item.kg} kg · {item.servings} servings</p></div><div><p className="text-[10px] text-[#8b978d]">Pickup by</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold"><Clock3 size={13}/>{item.deadline}</p></div></div><div className="flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-1.5 text-xs text-[#849087]"><MapPin size={14}/>{item.area} · {item.distance}</p><button disabled={requestedIds.has(item.id)} onClick={()=>requestFood(item.id)} className="rounded-full bg-[#176b4b] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#164c3b] disabled:cursor-default disabled:bg-[#e8efe6] disabled:text-[#54745a]">{requestedIds.has(item.id)?'Requested ✓':'Request food'}</button></div></article>)}</div>{filtered.length===0&&<div className="rounded-2xl border border-dashed border-[#dce4d9] bg-white p-12 text-center text-sm text-[#829087]">No sample listings match your search.</div>}</> : <div className="grid gap-4 md:grid-cols-2">{requests.length===0?<div className="col-span-full rounded-2xl border border-dashed border-[#dce4d9] bg-white p-12 text-center"><HeartHandshake className="mx-auto text-[#8ca98b]" size={30}/><h2 className="mt-3 font-semibold">No requests yet</h2><p className="mt-1 text-sm text-[#849087]">Explore available food and request a listing to see it here.</p><button onClick={()=>setTab('discover')} className="mt-4 rounded-full bg-[#176b4b] px-5 py-2.5 text-xs font-semibold text-white">Browse listings</button></div>:requests.map(request=>{const item=listings.find(x=>x.id===request.listingId)!;return <article key={item.id} className="rounded-2xl border border-[#e5e9df] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">{item.name}</h2><p className="mt-1 text-xs text-[#849087]">{item.donor} · {item.kg} kg</p></div><span className="rounded-full bg-[#edf4eb] px-3 py-1 text-[10px] font-bold text-[#4d7956]">{stages[request.status]}</span></div><div className="my-5 grid grid-cols-4 gap-1">{stages.map((stage,index)=><div key={stage}><div className={`h-1.5 rounded-full ${index<=request.status?'bg-[#4f8a60]':'bg-[#e7ebe4]'}`}/><p className="mt-2 text-[9px] text-[#849087]">{stage}</p></div>)}</div><p className="text-[11px] text-[#87938a]">Demo request · {request.requestedAt}</p><button disabled={request.status===3} onClick={()=>advance(item.id)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#cbdac9] px-4 py-2 text-xs font-semibold text-[#376b49] hover:bg-[#f1f6ef] disabled:opacity-50">{request.status===0?<><HeartHandshake size={14}/> Mark as accepted</>:request.status===1?<><PackageCheck size={14}/> Mark as picked up</>:request.status===2?<><Truck size={14}/> Mark as delivered</>:<><CheckCircle2 size={14}/> Completed</>}</button>{request.status>=1&&<div className="mt-4 rounded-xl border border-[#dce9d9] bg-[#f3f8f1] p-4"><div className="flex items-center gap-2 text-xs font-bold text-[#286445]"><CheckCircle2 size={15}/> Donor notified · Demo</div><p className="mt-1 text-[11px] leading-5 text-[#728277]">The donor has accepted your request. In the live system, this event should notify the donor and unlock verified contact details.</p><div className="mt-3 rounded-lg bg-white p-3"><p className="text-[10px] font-bold tracking-wide text-[#81927f]">SAMPLE DONOR CONTACT · NOT REAL</p><p className="mt-1 text-sm font-semibold">{item.donor}</p><p className="mt-1 text-xs text-[#6e7e73]">Demo contact: +91 90000 00000</p><p className="text-xs text-[#6e7e73]">Pickup: {item.area}</p></div><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.area+', Mangaluru')}`} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-[#176b4b] px-4 text-xs font-semibold text-white"><Navigation size={14}/> Open pickup location</a></div>}</article>})}</div>}
      <div className="mt-8 flex gap-3 rounded-2xl border border-[#e9e5d6] bg-[#fffdf6] p-4 text-xs leading-5 text-[#82785e]"><span className="mt-0.5 text-[#b18a3c]">ⓘ</span><p><strong>Demo environment:</strong> All food listings, donor names, match scores and pickup details are sample data. Requests and status changes are saved only in this browser. No real donor or NGO is contacted, and no real food pickup is arranged.</p></div>
    </div>
  </main>
}
