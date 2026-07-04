import type { BusinessApi } from '../shared/types'

declare global {
  interface Window {
    api: BusinessApi
  }
}

export {}
