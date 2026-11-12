import type { Metadata } from 'next'
import { LoginPage } from '@/app/auth-forms'

export const metadata: Metadata = { title: 'Log in — SHAREMEAL', description: 'Log in to your SHAREMEAL account.' }

export default function Page() { return <LoginPage /> }
