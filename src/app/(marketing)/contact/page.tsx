import type { Metadata } from 'next'
import ContactContent from './content'

export const metadata: Metadata = {
  title: 'Contact – Public Data Maps',
  description: 'Get in touch with the Public Data Maps team.',
}

export default function ContactPage() {
  return <ContactContent />
}
