import type { Metadata } from 'next'
import { ResetPasswordPage } from '@/app/auth-forms'

export const metadata: Metadata = { title: 'Choose a new password — SHAREMEAL' }

export default function Page() { return <ResetPasswordPage /> }
