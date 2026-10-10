import type { Shard, ShardLoader } from './roots'

/**
 * How the browser reaches the shards. Nothing here is downloaded until a search asks.
 *
 * Kept apart from roots.ts because `import.meta.glob` only exists inside Vite: the
 * database itself takes any loader, which is what lets scripts/battery.ts read the same
 * shards straight off the disk.
 */
let files: Promise<Record<string, () => Promise<Shard>>> | undefined

export const loadShard: ShardLoader = async (index) => {
  files ??= import('./shardFiles').then((module) => module.files)
  const file = (await files)[`./generated/shards/${index}.json`]
  if (!file) throw new Error(`The root database is missing shard ${index}.`)
  return file()
}
