import { mkdir, writeFile } from "fs/promises"
import { dirname } from "path"
import { parseFigmaArgs, token } from "./utils"

const { fileKey, nodeId, extra } = parseFigmaArgs(process.argv.slice(2))
if (!nodeId) {
  console.error("Error: node-id required (in URL or as second arg)")
  process.exit(1)
}

const [outputPath, format = "png", scaleArg = "2"] = extra
if (!outputPath) {
  console.error("Usage: download-image.ts <figmaUrl|fileKey> [nodeId] <outputPath> [format:png|svg] [scale:1-4]")
  process.exit(1)
}

const scale = parseInt(scaleArg)

const getImageUrl = async () => {
  const params = new URLSearchParams({
    ids: nodeId,
    format,
    ...(format === "png" && { scale: scale.toString() }),
    ...(format === "svg" && {
      svg_outline_text: "true",
      svg_simplify_stroke: "true",
    }),
  })

  const res = await fetch(`https://api.figma.com/v1/images/${fileKey}?${params}`, {
    headers: { "X-Figma-Token": token },
  })

  if (!res.ok) throw new Error(`Figma API error: ${res.status} ${res.statusText}`)

  const data = await res.json()
  const imageUrl = data.images?.[nodeId]

  if (!imageUrl) throw new Error(`No image URL returned for node ${nodeId}`)
  return imageUrl
}

const downloadImage = async (url: string, path: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`)

  const buffer = await res.arrayBuffer()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, Buffer.from(buffer))
}

try {
  console.error(`Fetching ${format.toUpperCase()} for node ${nodeId}...`)
  const imageUrl = await getImageUrl()

  console.error(`Downloading to ${outputPath}...`)
  await downloadImage(imageUrl, outputPath)

  console.log(`Saved: ${outputPath}`)
} catch (error: any) {
  console.error("Error:", error.message)
  process.exit(1)
}
