import { parseFigmaArgs, getFile } from "./utils"

const { fileKey, nodeId, extra } = parseFigmaArgs(process.argv.slice(2))
const depth = extra[0] ? parseInt(extra[0]) : undefined

type FigmaNode = {
  id: string
  name: string
  type: string
  visible?: boolean
  children?: FigmaNode[]
  characters?: string
  fills?: any[]
  strokes?: any[]
  effects?: any[]
  opacity?: number
  cornerRadius?: number
  rectangleCornerRadii?: number[]
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number }
  layoutMode?: string
  primaryAxisAlignItems?: string
  counterAxisAlignItems?: string
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  itemSpacing?: number
  componentId?: string
}

type SimplifiedNode = {
  id: string
  name: string
  type: string
  text?: string
  size?: { w: number; h: number }
  layout?: {
    mode?: string
    gap?: number
    padding?: string
    align?: string
    justify?: string
  }
  fills?: string
  strokes?: string
  opacity?: number
  borderRadius?: string
  componentId?: string
  children?: SimplifiedNode[]
}

const findNode = (root: FigmaNode, targetId: string): FigmaNode => {
  if (root.id === targetId) return root
  if (root.children) {
    for (const child of root.children) {
      try {
        return findNode(child, targetId)
      } catch {}
    }
  }
  throw new Error(`Node ${targetId} not found`)
}

const simplifyFills = (fills?: any[]) => {
  if (!fills?.length) return
  const visible = fills.filter((f) => f.visible !== false)
  if (!visible.length) return

  return visible
    .map((f) => {
      if (f.type === "SOLID") {
        const { r, g, b } = f.color
        const a = f.opacity ?? 1
        return a < 1
          ? `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a.toFixed(2)})`
          : `#${Math.round(r * 255).toString(16).padStart(2, "0")}${Math.round(g * 255).toString(16).padStart(2, "0")}${Math.round(b * 255).toString(16).padStart(2, "0")}`
      }
      if (f.type === "IMAGE") return "image"
      if (f.type.includes("GRADIENT")) return f.type.toLowerCase().replace("_", "-")
      return f.type
    })
    .join(", ")
}

const simplifyNode = (node: FigmaNode, currentDepth: number, maxDepth?: number): SimplifiedNode | null => {
  if (node.visible === false) return null

  const result: SimplifiedNode = {
    id: node.id,
    name: node.name,
    type: node.type === "VECTOR" ? "IMAGE-SVG" : node.type,
  }

  if (node.characters) result.text = node.characters

  if (node.absoluteBoundingBox) {
    result.size = {
      w: Math.round(node.absoluteBoundingBox.width),
      h: Math.round(node.absoluteBoundingBox.height),
    }
  }

  if (node.layoutMode) {
    result.layout = {
      mode: node.layoutMode.toLowerCase(),
      gap: node.itemSpacing,
      align: node.counterAxisAlignItems?.toLowerCase(),
      justify: node.primaryAxisAlignItems?.toLowerCase(),
    }
    const p = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].filter(
      (v) => v !== undefined
    )
    if (p.length && p.some((v) => v !== 0)) {
      result.layout.padding = p.join(" ")
    }
  }

  const fills = simplifyFills(node.fills)
  if (fills) result.fills = fills

  const strokes = simplifyFills(node.strokes)
  if (strokes) result.strokes = strokes

  if (node.opacity !== undefined && node.opacity !== 1) result.opacity = node.opacity

  if (node.cornerRadius) result.borderRadius = `${node.cornerRadius}px`
  if (node.rectangleCornerRadii) {
    result.borderRadius = node.rectangleCornerRadii.map((r) => `${r}px`).join(" ")
  }

  if (node.componentId) result.componentId = node.componentId

  // Default: traverse all children (no depth limit unless specified)
  if (node.children && (maxDepth === undefined || currentDepth < maxDepth)) {
    const children = node.children
      .map((c) => simplifyNode(c, currentDepth + 1, maxDepth))
      .filter((c): c is SimplifiedNode => c !== null)

    const svgTypes = new Set(["IMAGE-SVG", "STAR", "LINE", "ELLIPSE", "REGULAR_POLYGON", "RECTANGLE"])
    if (
      ["FRAME", "GROUP", "INSTANCE"].includes(node.type) &&
      children.every((c) => svgTypes.has(c.type))
    ) {
      result.type = "IMAGE-SVG"
    } else if (children.length) {
      result.children = children
    }
  }

  return result
}

try {
  const file = await getFile(fileKey)
  const targetNode = nodeId ? findNode(file.document, nodeId) : file.document
  const simplified = simplifyNode(targetNode, 0, depth)
  console.log(JSON.stringify(simplified, null, 2))
} catch (error: any) {
  console.error("Error:", error.message)
  process.exit(1)
}
