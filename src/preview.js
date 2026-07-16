import { marked } from 'marked'
import hljs from 'highlight.js/lib/common'
import { escapeHtml } from './utils.js'

marked.setOptions({ breaks: true, gfm: true })

function parseCsv(text, delimiter = ',') {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      if (ch === '\r') i++
    } else {
      cell += ch
    }
  }

  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((r) => r.some((c) => c.trim()))
}

function highlightCode(content, language) {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(content, { language }).value
  }
  return hljs.highlightAuto(content).value
}

export function renderPreviewBody(item) {
  if (item.tooLarge) {
    return `<div class="file-placeholder"><span class="file-ext">!</span><span class="text-muted text-xs">Not saved — over 2MB</span></div>`
  }

  switch (item.type) {
    case 'image':
    case 'svg':
      if (!item.url) break
      return `<img src="${item.url}" alt="${escapeHtml(item.name)}" class="preview-image" data-expand="${item.id}" />`

    case 'video':
      if (!item.url) break
      return `<video src="${item.url}" controls class="preview-media"></video>`

    case 'audio':
      if (!item.url) break
      return `<audio src="${item.url}" controls class="preview-audio"></audio>`

    case 'pdf':
      if (!item.url) break
      return `<iframe src="${item.url}" class="preview-pdf" title="${escapeHtml(item.name)}"></iframe>`

    case 'markdown':
      if (item.content == null) break
      return `<div class="preview-markdown">${marked.parse(item.content)}</div>`

    case 'html':
      if (item.content == null) break
      return `<iframe srcdoc="${escapeHtml(item.content)}" sandbox="" class="preview-html" title="${escapeHtml(item.name)}"></iframe>`

    case 'json': {
      if (item.content == null) break
      let formatted = item.content
      try {
        formatted = JSON.stringify(JSON.parse(item.content), null, 2)
      } catch {
        /* keep raw */
      }
      const html = highlightCode(formatted, 'json')
      return `<pre class="preview-code"><code class="hljs language-json">${html}</code></pre>`
    }

    case 'csv': {
      if (item.content == null) break
      const rows = parseCsv(item.content, item.delimiter || ',')
      if (!rows.length) {
        return `<pre class="preview-text">${escapeHtml(item.content)}</pre>`
      }
      const [header, ...body] = rows
      const headHtml = header.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
      const bodyHtml = body
        .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
        .join('')
      return `<div class="preview-table-wrap"><table class="preview-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`
    }

    case 'code':
      if (item.content == null) break
      return `<pre class="preview-code"><code class="hljs language-${escapeHtml(item.language || 'plaintext')}">${highlightCode(item.content, item.language)}</code></pre>`

    case 'text':
      if (item.content == null) break
      return `<pre class="preview-text">${escapeHtml(item.content)}</pre>`

    default:
      break
  }

  if (item.url) {
    const ext = item.name?.split('.').pop()?.toUpperCase() || 'FILE'
    return `<div class="file-placeholder"><span class="file-ext">${escapeHtml(ext)}</span><span class="text-muted text-xs">${escapeHtml(item.mime || '')}</span></div>`
  }

  return `<div class="file-placeholder"><span class="file-ext">?</span><span class="text-muted text-xs">No preview</span></div>`
}
