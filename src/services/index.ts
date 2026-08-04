import type { NameService } from '../types'
import { LocalNameService } from './localNameService'
import { DeepSeekNameService } from './deepseekNameService'

/**
 * Which engine the app is talking to.
 *
 * The local one is the default because it works with nothing configured — no key, no
 * server, no network. Set VITE_ARCHIS_ENGINE=deepseek once the backend route exists and
 * nothing else in the app changes; the UI only ever sees the NameService interface.
 */
export function createNameService(): NameService {
  const engine = import.meta.env.VITE_ARCHIS_ENGINE
  if (engine === 'deepseek') return new DeepSeekNameService()
  return new LocalNameService()
}

export { LocalNameService, DeepSeekNameService }
