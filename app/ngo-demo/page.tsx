import type { Metadata } from 'next'
import NgoDemoClient from './ngo-demo-client'

export const metadata: Metadata = {
  title: 'NGO Demo | SHAREMEAL',
  description: 'Explore the SHAREMEAL food receiver dashboard using sample data.',
}

export default function NgoDemoPage() {
  return <NgoDemoClient />
}
