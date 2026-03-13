import type { Metadata } from 'next'
import EnterpriseContent from './content'

export const metadata: Metadata = {
  title: 'Enterprise — Public Data Maps',
  description: 'Unlimited searches, team workspaces, per-seat billing, and priority support for organizations.',
}

export default function EnterprisePage() {
  return <EnterpriseContent />
}
