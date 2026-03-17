export const DEFAULT_GLOBAL_VISIBLE_COLS = [
  'Dénomination de l\'unité légale',
  'SIRET',
  'Section de l\'établissement',
  'Activité principale de l\'établissement',
  'Etat administratif de l\'établissement',
  'Catégorie juridique de l\'unité légale',
  'Tranche de l\'effectif de l\'établissement',
  'Adresse de l\'établissement',
  'Code postal de l\'établissement',
  'Commune de l\'établissement',
]

export const DEFAULT_LIST_COLS = [
  'Dénomination de l\'unité légale',
  'Section de l\'établissement',
  'Code postal de l\'établissement',
  'Commune de l\'établissement',
]

export const DEFAULT_POPUP_COLS = [
  'Dénomination de l\'unité légale',
  'SIRET',
  'Section de l\'établissement',
  'Commune de l\'établissement',
]

export interface DefaultFieldPrefs {
  hiddenFields: string[]
  listColumns: string[]
  popupColumns: string[]
}

export function getDefaultHiddenFields(allColumns: string[]): string[] {
  const visible = new Set(DEFAULT_GLOBAL_VISIBLE_COLS)
  return allColumns.filter((c) => !visible.has(c))
}

export function getDefaultListColumns(allColumns: string[]): string[] {
  if (allColumns.length === 0) return [...DEFAULT_LIST_COLS]
  return DEFAULT_LIST_COLS.filter((c) => allColumns.includes(c))
}

export function getDefaultPopupColumns(allColumns: string[]): string[] {
  if (allColumns.length === 0) return [...DEFAULT_POPUP_COLS]
  return DEFAULT_POPUP_COLS.filter((c) => allColumns.includes(c))
}

export function buildDefaultFieldPrefs(allColumns: string[]): DefaultFieldPrefs {
  return {
    hiddenFields: getDefaultHiddenFields(allColumns),
    listColumns: getDefaultListColumns(allColumns),
    popupColumns: getDefaultPopupColumns(allColumns),
  }
}
