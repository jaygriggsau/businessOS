// A tiny, safe Markdown-ish renderer for assistant replies. It escapes all
// HTML first, then re-introduces a small, known set of tags — so it is safe to
// use with dangerouslySetInnerHTML.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
}

export function formatMarkdown(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0

  const flushList = (tag: 'ul' | 'ol', items: string[]) => {
    out.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`)
  }

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    // Headings
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length + 1 // # -> h2, ## -> h3
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      i++
      continue
    }

    // Bulleted list
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ''))
        i++
      }
      flushList('ul', items)
      continue
    }

    // Numbered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''))
        i++
      }
      flushList('ol', items)
      continue
    }

    // Paragraph — gather consecutive plain lines
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^#{1,3}\s+/.test(lines[i])
    ) {
      para.push(lines[i])
      i++
    }
    out.push(`<p>${para.map(inline).join('<br>')}</p>`)
  }

  return out.join('')
}
