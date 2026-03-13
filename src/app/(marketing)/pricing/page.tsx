import type { Metadata } from 'next'
import PricingContent from './content'

export const metadata: Metadata = {
  title: 'Pricing — Public Data Maps',
  description: 'Simple, transparent pricing for individuals and teams. Start free, upgrade when you need more.',
}

export default function PricingPage() {
  return <PricingContent />
}
