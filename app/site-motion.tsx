'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import Lenis from 'lenis'

export function SiteMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return <MotionConfig reducedMotion="user">
    <AnimatePresence mode="sync" initial={false}>
      <motion.div key={pathname} className="min-h-screen bg-[#faf9f5]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
        {children}
      </motion.div>
    </AnimatePresence>
  </MotionConfig>
}

export function PublicScrollEnhancer() {
  const pathname = usePathname()
  useEffect(() => {
    if (pathname !== '/') return
    const lenis = new Lenis({ autoRaf: true, anchors: true, allowNestedScroll: true, respectReducedMotion: true, lerp: 0.12 })
    return () => lenis.destroy()
  }, [pathname])
  return null
}
