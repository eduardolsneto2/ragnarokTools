import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { MVP_IDS } from './mvp-ids'

const API_URL = 'https://www.divine-pride.net/api/database/Monster'
const OUTPUT = resolve('src/data/mvp-data.json')
const apiKey = process.env.DIVINE_PRIDE_API_KEY
const server = process.env.DIVINE_PRIDE_SERVER ?? 'iRO'

if (!apiKey) {
  throw new Error('Set DIVINE_PRIDE_API_KEY before refreshing MVP data.')
}

type ApiSpawn = {
  mapname?: string
  mapName?: string
  name?: string
  amount?: number
  respawnTime?: number
  respawnVariance?: number
  variance?: number
}

type ApiMonster = {
  id: number
  name: string
  level?: number
  element?: string
  elementLevel?: number
  race?: string
  health?: number
  type?: string
  spawns?: ApiSpawn[]
  spawn?: ApiSpawn[]
}

const wait = (milliseconds: number) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds))

const mapLabel = (mapname: string) =>
  mapname
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

async function fetchMonster(id: number) {
  const url = `${API_URL}/${id}?apiKey=${encodeURIComponent(apiKey!)}`
  const response = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'x-server': server },
  })

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after') ?? 2)
    console.warn(`Rate limited. Waiting ${retryAfter}s…`)
    await wait(retryAfter * 1000)
    return fetchMonster(id)
  }

  if (response.status === 404) return null
  if (!response.ok) throw new Error(`${id}: ${response.status} ${response.statusText}`)

  return (await response.json()) as ApiMonster
}

const results = []

for (const [index, id] of MVP_IDS.entries()) {
  const monster = await fetchMonster(id)
  const rawSpawns = monster?.spawns ?? monster?.spawn ?? []
  const spawns = rawSpawns
    .filter((spawn) => spawn.mapname ?? spawn.mapName)
    .map((spawn) => {
      const mapname = spawn.mapname ?? spawn.mapName!
      return {
        mapname,
        mapDisplayName: spawn.name ?? mapLabel(mapname),
        amount: spawn.amount ?? 1,
        respawnTime: spawn.respawnTime ?? 0,
        respawnVariance: spawn.respawnVariance ?? spawn.variance ?? 0,
      }
    })
    .filter((spawn) => spawn.respawnTime > 0)

  if (monster && spawns.length > 0 && monster.type?.toLowerCase() === 'mvp') {
    results.push({
      id: monster.id,
      name: monster.name,
      level: monster.level ?? 0,
      element: [monster.element, monster.elementLevel].filter(Boolean).join(' '),
      race: monster.race ?? 'Unknown',
      health: monster.health ?? 0,
      imageUrl: `https://static.divine-pride.net/images/mobs/png/${monster.id}.png`,
      spawns,
    })
    console.log(`[${index + 1}/${MVP_IDS.length}] Added ${monster.name}`)
  } else {
    console.log(`[${index + 1}/${MVP_IDS.length}] Skipped ${id}`)
  }

  // Divine Pride allows at most one request per second.
  await wait(1100)
}

results.sort((a, b) => a.name.localeCompare(b.name))
await mkdir(dirname(OUTPUT), { recursive: true })
await writeFile(OUTPUT, `${JSON.stringify(results, null, 2)}\n`)
console.log(`Wrote ${results.length} MVPs for ${server} to ${OUTPUT}`)
