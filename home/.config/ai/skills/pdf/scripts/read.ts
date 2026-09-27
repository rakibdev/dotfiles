import { readFileSync } from 'fs'
import { resolve } from 'path'
import { processPdf, extractTextWithPositions } from '@firecrawl/pdf-inspector'
import { addAnnotationLinks } from './link'

const path = resolve(process.cwd(), process.argv[2])
const buffer = readFileSync(path)
const result = processPdf(buffer)

if (!result.markdown) {
  console.error(`No text (${result.pdfType})`)
  process.exit(1)
}

const items = extractTextWithPositions(buffer)
const texts = items.filter(item => item.itemType == 'Text')
const links = items.filter(item => item.itemType == 'Link')
const withAnnotation = addAnnotationLinks(result.markdown, texts, links)

console.log(withAnnotation)
