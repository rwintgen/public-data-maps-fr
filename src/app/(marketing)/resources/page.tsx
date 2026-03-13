import type { Metadata } from 'next'
import ResourcesContent from './content'

export const metadata: Metadata = {
  title: 'Resources — Public Data Maps',
  description: 'Video tutorials and guides to help you get the most out of Public Data Maps.',
}

export default function ResourcesPage() {
  return <ResourcesContent />
}
