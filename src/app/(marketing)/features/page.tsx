import type { Metadata } from 'next'
import FeaturesContent from './content'

export const metadata: Metadata = {
  title: 'Features — Public Data Maps',
  description: 'Spatial search, AI overviews, advanced filters, exports, and more — everything you need to explore French company data.',
}

export default function FeaturesPage() {
  return <FeaturesContent />
}
