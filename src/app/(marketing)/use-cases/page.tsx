import type { Metadata } from 'next'
import UseCasesContent from './content'

export const metadata: Metadata = {
  title: 'Use Cases — Public Data Maps',
  description: 'See how companies use Public Data Maps for route planning, prospecting, real estate analysis, and market research.',
}

export default function UseCasesPage() {
  return <UseCasesContent />
}
