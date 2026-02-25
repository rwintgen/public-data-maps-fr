import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sirene Area Companies',
  description: 'Find companies in a given area',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>{children}</body>
    </html>
  )
}
