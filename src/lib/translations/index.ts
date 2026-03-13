import { en } from './en'
import { fr } from './fr'

export type Translations = typeof en
export const translations = { en, fr } as const
