/**
 * Preset filter definitions for the SIRENE v3 dataset.
 *
 * Each preset has a `test` predicate evaluated against the JSONB `fields`
 * of an establishment. Multiple active presets are ANDed together.
 *
 * Column references use the exact SIRENE v3 field names as they appear
 * in the OpenDataSoft enriched export (104 columns). Values are mostly
 * human-readable labels rather than raw INSEE codes.
 */

export interface PresetFilter {
  id: string
  label: string
  group: string
  description: string
  test: (fields: Record<string, string>) => boolean
}

const COL = {
  etatEtab: "Etat administratif de l'établissement",
  etatUL: "Etat administratif de l'unité légale",
  fermetureEtab: "Date de fermeture de l'établissement",
  fermetureUL: "Date de fermeture de l'unité légale",
  employeurEtab: "Caractère employeur de l'établissement",
  employeurUL: "Caractère employeur de l'unité légale",
  siege: 'Etablissement siège',
  catJuridique: "Catégorie juridique de l'unité légale",
  catEntreprise: "Catégorie de l'entreprise",
  trancheEffEtabTriable: "Tranche de l'effectif de l'établissement triable",
  apeEtab: "Activité principale de l'établissement",
  ess: 'Economie sociale et solidaire unité légale',
  mission: 'Société à mission unité légale',
  identifAssoc: "Identifiant association de l'unité légale",
  dateCreationEtab: "Date de création de l'établissement",
  dateCreationUL: "Date de création de l'unité légale",
  diffusionEtab: "Statut de diffusion de l'établissement",
}

/** Derives the NAF Rev2 section letter from an APE code (e.g. '70.22Z' → 'M'). */
function nafSection(f: Record<string, string>): string {
  const div = parseInt((f[COL.apeEtab] ?? '').substring(0, 2), 10)
  if (isNaN(div)) return ''
  if (div <= 3) return 'A'
  if (div <= 9) return 'B'
  if (div <= 33) return 'C'
  if (div === 35) return 'D'
  if (div <= 39) return 'E'
  if (div <= 43) return 'F'
  if (div <= 47) return 'G'
  if (div <= 53) return 'H'
  if (div <= 56) return 'I'
  if (div <= 63) return 'J'
  if (div <= 66) return 'K'
  if (div === 68) return 'L'
  if (div <= 75) return 'M'
  if (div <= 82) return 'N'
  if (div === 84) return 'O'
  if (div === 85) return 'P'
  if (div <= 88) return 'Q'
  if (div <= 93) return 'R'
  if (div <= 96) return 'S'
  if (div <= 98) return 'T'
  if (div === 99) return 'U'
  return ''
}

function isActive(f: Record<string, string>): boolean {
  return (
    f[COL.etatEtab] === 'Actif' &&
    f[COL.etatUL] === 'Active' &&
    !f[COL.fermetureEtab] &&
    !f[COL.fermetureUL]
  )
}

export const PRESET_FILTERS: PresetFilter[] = [
  {
    id: 'active',
    label: 'Active',
    group: 'Status',
    description: 'Open establishment & active parent company, no closure date on either',
    test: isActive,
  },
  {
    id: 'closed',
    label: 'Closed',
    group: 'Status',
    description: 'Establishment is administratively closed or has a closure date',
    test: (f) =>
      f[COL.etatEtab] === 'Fermé' ||
      !!f[COL.fermetureEtab],
  },
  {
    id: 'hq',
    label: 'HQ only',
    group: 'Status',
    description: 'Only headquarter establishments (siège social)',
    test: (f) => f[COL.siege] === 'oui',
  },
  {
    id: 'diffusible',
    label: 'Public',
    group: 'Status',
    description: 'Establishment that has opted into public diffusion (non-protected data)',
    test: (f) => f[COL.diffusionEtab] === 'O',
  },

  {
    id: 'company',
    label: 'Company',
    group: 'Legal form',
    description: 'Corporate entity (not an individual entrepreneur) — catégorie juridique ≥ 2000',
    test: (f) => {
      const cj = f[COL.catJuridique] ?? ''
      return cj.length > 0 && !cj.startsWith('1')
    },
  },
  {
    id: 'freelance',
    label: 'Freelance',
    group: 'Legal form',
    description: 'Individual entrepreneur (catégorie juridique 1000)',
    test: (f) => f[COL.catJuridique] === '1000',
  },
  {
    id: 'sas',
    label: 'SAS / SASU',
    group: 'Legal form',
    description: 'Société par Actions Simplifiée (5710) or single-shareholder variant (5720)',
    test: (f) => {
      const cj = f[COL.catJuridique] ?? ''
      return cj === '5710' || cj === '5720'
    },
  },
  {
    id: 'sarl',
    label: 'SARL / EURL',
    group: 'Legal form',
    description: 'SARL (5499) or single-owner EURL (5498)',
    test: (f) => {
      const cj = f[COL.catJuridique] ?? ''
      return cj === '5499' || cj === '5498'
    },
  },
  {
    id: 'association',
    label: 'Association',
    group: 'Legal form',
    description: 'Non-profit association (catégorie juridique 92xx) or has an association identifier',
    test: (f) => {
      const cj = f[COL.catJuridique] ?? ''
      return cj.startsWith('92') || !!f[COL.identifAssoc]
    },
  },

  {
    id: 'employer',
    label: 'Employer',
    group: 'Size',
    description: 'Establishment has declared employees',
    test: (f) => f[COL.employeurEtab] === 'Oui',
  },
  {
    id: 'pme',
    label: 'PME',
    group: 'Size',
    description: 'Small / Medium enterprise (catégorie INSEE = PME)',
    test: (f) => f[COL.catEntreprise] === 'PME',
  },
  {
    id: 'eti-ge',
    label: 'ETI / GE',
    group: 'Size',
    description: 'Mid-size (ETI) or large enterprise (GE)',
    test: (f) => {
      const cat = f[COL.catEntreprise] ?? ''
      return cat === 'ETI' || cat === 'GE'
    },
  },
  {
    id: '50plus',
    label: '50+ employees',
    group: 'Size',
    description: 'Establishment with 50 or more employees (tranche d\'effectif ≥ 21)',
    test: (f) => parseInt(f[COL.trancheEffEtabTriable] ?? '', 10) >= 21,
  },

  {
    id: 'ess',
    label: 'ESS',
    group: 'Values',
    description: 'Economie Sociale et Solidaire — company part of the social economy',
    test: (f) => f[COL.ess] === 'O',
  },
  {
    id: 'mission',
    label: 'Société à mission',
    group: 'Values',
    description: 'Benefit corporation — company with a declared social or environmental mission',
    test: (f) => f[COL.mission] === 'O',
  },

  {
    id: 'commerce',
    label: 'Commerce',
    group: 'Sector',
    description: 'Wholesale and retail trade (NAF section G)',
    test: (f) => nafSection(f) === 'G',
  },
  {
    id: 'industry',
    label: 'Industry',
    group: 'Sector',
    description: 'Manufacturing (NAF section C)',
    test: (f) => nafSection(f) === 'C',
  },
  {
    id: 'construction',
    label: 'Construction',
    group: 'Sector',
    description: 'Building and civil engineering (NAF section F)',
    test: (f) => nafSection(f) === 'F',
  },
  {
    id: 'tech',
    label: 'IT / Tech',
    group: 'Sector',
    description: 'Information and communication (NAF section J)',
    test: (f) => nafSection(f) === 'J',
  },
  {
    id: 'health',
    label: 'Health',
    group: 'Sector',
    description: 'Human health and social work (NAF section Q)',
    test: (f) => nafSection(f) === 'Q',
  },
  {
    id: 'food',
    label: 'Food & Hotels',
    group: 'Sector',
    description: 'Accommodation, restaurants and food services (NAF section I)',
    test: (f) => nafSection(f) === 'I',
  },
  {
    id: 'transport',
    label: 'Transport',
    group: 'Sector',
    description: 'Transportation and storage (NAF section H)',
    test: (f) => nafSection(f) === 'H',
  },
  {
    id: 'finance',
    label: 'Finance',
    group: 'Sector',
    description: 'Financial and insurance activities (NAF section K)',
    test: (f) => nafSection(f) === 'K',
  },
  {
    id: 'realestate',
    label: 'Real estate',
    group: 'Sector',
    description: 'Real estate activities (NAF section L)',
    test: (f) => nafSection(f) === 'L',
  },
  {
    id: 'pro-services',
    label: 'Pro services',
    group: 'Sector',
    description: 'Professional, scientific and technical activities — consulting, legal, accounting (NAF section M)',
    test: (f) => nafSection(f) === 'M',
  },
  {
    id: 'education',
    label: 'Education',
    group: 'Sector',
    description: 'Education sector (NAF section P)',
    test: (f) => nafSection(f) === 'P',
  },
  {
    id: 'agriculture',
    label: 'Agriculture',
    group: 'Sector',
    description: 'Agriculture, forestry and fishing (NAF section A)',
    test: (f) => nafSection(f) === 'A',
  },
]

/** Group labels in display order. */
export const PRESET_GROUPS = ['Status', 'Legal form', 'Size', 'Values', 'Sector'] as const

export interface CustomPreset {
  id: string
  label: string
  column: string
  operator: 'contains' | 'equals' | 'empty'
  negate: boolean
  value: string
}

/** Builds a test function from a user-defined custom preset. */
function customPresetTest(p: CustomPreset): (fields: Record<string, string>) => boolean {
  return (fields) => {
    const val = (fields[p.column] ?? '').toString().toLowerCase()
    let match: boolean
    switch (p.operator) {
      case 'contains': match = val.includes(p.value.toLowerCase()); break
      case 'equals': match = val === p.value.toLowerCase(); break
      case 'empty': match = val.length === 0; break
      default: match = true
    }
    return p.negate ? !match : match
  }
}

/**
 * Applies active presets to a company array.
 * All active presets are ANDed — a company must pass every active test.
 */
export function applyPresets(
  companies: any[],
  activePresetIds: string[],
  customPresets?: CustomPreset[],
): any[] {
  if (activePresetIds.length === 0) return companies
  const tests: ((fields: Record<string, string>) => boolean)[] = []
  for (const id of activePresetIds) {
    const builtin = PRESET_FILTERS.find((p) => p.id === id)
    if (builtin) { tests.push(builtin.test); continue }
    const custom = customPresets?.find((p) => p.id === id)
    if (custom) tests.push(customPresetTest(custom))
  }
  if (tests.length === 0) return companies
  return companies.filter((c) =>
    tests.every((test) => test(c.fields ?? {})),
  )
}
