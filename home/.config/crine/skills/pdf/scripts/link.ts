import type { TextItem } from '@firecrawl/pdf-inspector'

// processPdf drops annotation-only hyperlinks (e.g. "Android" text linking to "https://google.com")
export const addAnnotationLinks = (markdown: string, texts: TextItem[], links: TextItem[]) => {
  for (const link of links) {
    const text = texts.find(
      text =>
        text.page == link.page &&
        Math.abs(text.y - link.y) < 5 &&
        link.x < text.x + text.width &&
        link.x + link.width > text.x
    )
    if (!text) continue

    // Proportional x-position gives an approximate char index (font isn't monospace), so
    // snap to the enclosing whitespace-delimited word instead of slicing mid-word.
    const relCenter = (link.x + link.width / 2 - text.x) / text.width
    const charIndex = relCenter * text.text.length
    const tokens = [...text.text.matchAll(/\S+/g)]
    const token = tokens.find(token => charIndex >= token.index! && charIndex < token.index! + token[0].length)
    const display = token?.[0]
    if (!display) continue

    const index = markdown.indexOf(display)
    if (index == -1 || markdown.slice(0, index).endsWith('](')) continue
    markdown = markdown.slice(0, index) + `[${display}](${link.linkUrl})` + markdown.slice(index + display.length)
  }
  return markdown
}
