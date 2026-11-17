'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck } from 'lucide-react'

const supabase = createClient()

export default function PickupVerification() {
  const [donationId, setDonationId] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setMessage(''); setSuccess(false)
    const { data, error } = await supabase.rpc('verify_pickup_otp', {
      p_donation_id: donationId.trim(),
      p_code: code.trim(),
    })
    if (error || data !== true) setMessage(error?.message || 'Pickup could not be verified. Check the reference and code.')
    else { setSuccess(true); setMessage('Pickup verified successfully. The donation record now contains the verified pickup timestamp.'); setDonationId(''); setCode('') }
    setBusy(false)
  }

  return <section className="mt-7 rounded-3xl border border-[#dfe8dc] bg-white p-6 shadow-sm sm:p-8">
    <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#eaf2e8] text-[#176b4b]"><ShieldCheck size={21}/></span><div><p className="text-[10px] font-bold tracking-[.16em] text-[#63866d]">SECURE COLLECTION</p><h2 className="mt-1 text-xl font-semibold">Verify a food pickup</h2></div></div>
    <p className="mt-3 text-sm leading-6 text-[#77847c]">Ask the donor for the donation reference and their six-digit OTP. Codes expire after 30 minutes and allow up to five attempts.</p>
    <form onSubmit={verify} className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
      <label className="grid gap-1.5 text-xs font-semibold text-[#385648]">Donation reference<input required value={donationId} onChange={e=>setDonationId(e.target.value)} placeholder="Paste donation ID" className="h-11 rounded-xl border border-[#dfe5dc] px-3 text-sm font-normal outline-none focus:border-[#6d9a78]"/></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#385648]">6-digit OTP<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\\D/g,'').slice(0,6))} placeholder="000000" className="h-11 rounded-xl border border-[#dfe5dc] px-3 text-sm font-semibold tracking-[.2em] outline-none focus:border-[#6d9a78]"/></label>
      <button disabled={busy || code.length!==6 || !donationId.trim()} className="mt-auto h-11 rounded-full bg-[#176b4b] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy?'Verifying…':'Verify pickup'}</button>
    </form>
    {message&&<p role="status" className={`mt-4 rounded-xl p-3 text-xs leading-5 ${success?'bg-[#edf5eb] text-[#286445]':'bg-[#fff3ef] text-[#a34e43]'}`}>{message}</p>}
  </section>
}
