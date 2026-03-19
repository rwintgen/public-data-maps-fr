'use client'

import { useEffect } from 'react'
import { AppLocaleProvider } from '@/lib/useAppLocale'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add('app-shell')
    return () => { document.body.classList.remove('app-shell') }
  }, [])

  return <AppLocaleProvider>{children}</AppLocaleProvider>
}
