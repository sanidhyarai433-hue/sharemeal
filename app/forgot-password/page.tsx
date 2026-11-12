import type { Metadata } from 'next'
import { ForgotPasswordPage } from '@/app/auth-forms'

export const metadata: Metadata = { title: 'Reset your password — SHAREMEAL' }

export default function Page() { return <ForgotPasswordPage /> }
