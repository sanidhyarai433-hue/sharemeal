'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export default function DashboardPanel({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  return <motion.section initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }} whileHover={reduceMotion ? undefined : { y: -2 }} className="mt-12 rounded-[28px] border border-[#e7eae2] bg-white p-6 shadow-[0_12px_40px_rgba(31,66,43,.04)] sm:mt-16 sm:p-10">{children}</motion.section>
}
