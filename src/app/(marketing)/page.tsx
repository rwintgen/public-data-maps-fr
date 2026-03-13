import type { Metadata } from 'next'
import HomeContent from './content'

export const metadata: Metadata = {
  title: 'Public Data Maps — Explore French Company Data on a Map',
  description:
    'Draw an area on the map and instantly find every registered company inside it. Powered by the official INSEE SIRENE dataset.',
}

export default function HomePage() {
  return <HomeContent />
}
