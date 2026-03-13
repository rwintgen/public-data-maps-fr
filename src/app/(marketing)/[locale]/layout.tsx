import { LocaleProvider, type Locale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'

const LOCALES: Locale[] = ['en', 'fr']

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

function HtmlLang({ locale }: { locale: string }) {
  return <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang="${locale}"` }} />
}

export default function LocaleLayout({ children, params }: Props) {
  if (!LOCALES.includes(params.locale as Locale)) notFound()

  return (
    <LocaleProvider locale={params.locale as Locale}>
      <HtmlLang locale={params.locale} />
      <div className="flex flex-col min-h-full">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </LocaleProvider>
  )
}
