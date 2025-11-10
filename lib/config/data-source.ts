export type DataSourceType = 'supabase' | 'api'

export interface DataSourceConfig {
  type: DataSourceType
  apiBaseUrl?: string
}

const DATA_SOURCE_KEY = 'data_source_config'

export function getDataSourceConfig(): DataSourceConfig {
  if (typeof window === 'undefined') {
    return { type: 'supabase' }
  }

  const stored = localStorage.getItem(DATA_SOURCE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return { type: 'supabase' }
    }
  }
  return { type: 'supabase' }
}

export function setDataSourceConfig(config: DataSourceConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DATA_SOURCE_KEY, JSON.stringify(config))
  }
}

export function getApiBaseUrl(): string {
  const config = getDataSourceConfig()
  return config.apiBaseUrl || ''
}
