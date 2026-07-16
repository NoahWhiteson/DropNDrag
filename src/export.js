import JSZip from 'jszip'
import { isTextKind, uniqueFilename } from './files.js'

async function itemToBlob(item) {
  if (item.file) return item.file

  if (item.url) {
    try {
      const res = await fetch(item.url)
      return await res.blob()
    } catch {
      return null
    }
  }

  if (item.content != null && isTextKind(item.type)) {
    const mime = item.mime || 'text/plain'
    return new Blob([item.content], { type: mime })
  }

  return null
}

function safeZipName(name) {
  return (name || 'session').replace(/[<>:"/\\|?*]/g, '_').trim() || 'session'
}

export async function exportSessionZip(session, items) {
  if (!items.length) return null

  const zip = new JSZip()
  const used = new Set()

  for (const item of items) {
    const filename = uniqueFilename(item.name || `item-${item.id}`, used)
    const blob = await itemToBlob(item)

    if (blob) {
      zip.file(filename, blob)
      continue
    }

    if (item.content != null) {
      zip.file(filename, item.content)
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeZipName(session?.title)}.zip`
  a.click()
  URL.revokeObjectURL(url)
  return true
}
