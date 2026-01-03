import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

export const token = process.env.FIGMA_ACCESS_TOKEN
if (!token) {
  console.error('Error: FIGMA_ACCESS_TOKEN env not set')
  process.exit(1)
}

export const cacheDir = join(homedir(), '.cache', 'figma')
export const cacheTTL = 10 * 24 * 60 * 60 * 1000 // 10 days

export type ParsedFigmaUrl = {
  fileKey: string
  nodeId?: string
}

/**
 * Parse Figma URL or raw fileKey/nodeId args
 * Accepts:
 * - Full URL: https://www.figma.com/design/andoid/...?node-id=825-17286
 * - File key only: andoid
 * - File key + node ID: andoid 825-17286
 */
export const parseFigmaArgs = (args: string[]): ParsedFigmaUrl & { extra: string[] } => {
  const [first, ...rest] = args
  if (!first) {
    console.error('Error: No Figma URL or file key provided')
    process.exit(1)
  }

  // Check if it's a URL
  if (first.includes('figma.com')) {
    const url = new URL(first)
    const pathMatch = url.pathname.match(/\/(file|design)\/([a-zA-Z0-9]+)/)
    if (!pathMatch) {
      console.error('Error: Invalid Figma URL')
      process.exit(1)
    }
    const fileKey = pathMatch[2]
    const nodeId = url.searchParams.get('node-id')?.replace(/-/g, ':')
    return { fileKey, nodeId: nodeId || undefined, extra: rest }
  }

  // Raw args: fileKey [nodeId]
  const nodeId = rest[0]?.replace(/-/g, ':')
  return {
    fileKey: first,
    nodeId: nodeId || undefined,
    extra: rest.slice(1)
  }
}

export const getCachePath = (fileKey: string) => join(cacheDir, `${fileKey}.json`)

export const loadFromCache = async (fileKey: string) => {
  try {
    const data = JSON.parse(await readFile(getCachePath(fileKey), 'utf-8'))
    if (Date.now() - data.fetchedAt < cacheTTL) {
      console.error('[cache hit]')
      return data.file
    }
    console.error('[cache expired]')
  } catch {}
  return null
}

export const saveToCache = async (fileKey: string, file: any) => {
  await mkdir(cacheDir, { recursive: true })
  await writeFile(getCachePath(fileKey), JSON.stringify({ fetchedAt: Date.now(), file }))
}

export const fetchFigmaFile = async (fileKey: string) => {
  const res = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: { 'X-Figma-Token': token }
  })
  if (!res.ok) throw new Error(`Figma API error: ${res.status} ${res.statusText}`)
  return res.json()
}

export const getFile = async (fileKey: string) => {
  const cached = await loadFromCache(fileKey)
  if (cached) return cached
  console.error('[fetching from API...]')
  const file = await fetchFigmaFile(fileKey)
  await saveToCache(fileKey, file)
  return file
}
