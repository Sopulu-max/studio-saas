export type ViewMode = 'list' | 'grid' | 'chart-donut' | 'chart-bar'

/** Read active layout from searchParams, falling back to the first mode. */
export function resolveLayout(raw: string | undefined, modes: ViewMode[]): ViewMode {
  if (raw && modes.includes(raw as ViewMode)) return raw as ViewMode
  return modes[0]
}
