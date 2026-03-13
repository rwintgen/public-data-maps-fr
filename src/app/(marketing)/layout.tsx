import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'
import { LocaleProvider } from '@/lib/i18n'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <div className="flex flex-col min-h-full">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </LocaleProvider>
  )
}
