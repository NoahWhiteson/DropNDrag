import './style.css'

const app = document.querySelector('#app')
const toastRoot = document.getElementById('toast-root')
let itemId = 0
const items = []

const TYPE_LABELS = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF',
  text: 'Text',
  file: 'File',
}

app.innerHTML = `
  <header class="site-header">
    <div class="site-header-inner">
      <div class="brand">
        <div class="brand-icon">
          <img src="/logo.svg" alt="" width="20" height="20" />
        </div>
        <div>
          <h1>DropNDrag</h1>
          <p class="text-muted">Paste or drop files for instant preview</p>
        </div>
      </div>
      <div class="site-header-actions">
        <span id="stats" class="badge badge-secondary" hidden></span>
        <input type="file" id="file-input" multiple hidden />
        <button type="button" id="browse-btn" class="btn btn-outline btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Browse
        </button>
        <button type="button" id="clear-btn" class="btn btn-outline btn-sm btn-destructive" hidden>Clear</button>
      </div>
    </div>
  </header>

  <main id="drop-zone" class="drop-zone">
    <div class="drop-hint">
      <div class="drop-icon-wrap">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </div>
      <p class="drop-title">Drop files here</p>
      <p class="text-muted text-sm">or press <kbd>Ctrl</kbd> + <kbd>V</kbd> to paste</p>
    </div>
    <div id="preview-grid" class="preview-grid"></div>
  </main>

  <footer class="site-footer text-muted text-sm">
    <span><kbd>Esc</kbd> to clear</span>
    <span class="separator-dot"></span>
    <span>Click images to expand</span>
    <span class="separator-dot"></span>
    <span id="item-count"></span>
  </footer>

  <div id="lightbox" class="dialog-overlay" hidden>
    <div class="dialog-content">
      <button type="button" class="btn btn-ghost btn-icon lightbox-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <img id="lightbox-img" src="" alt="" class="lightbox-image" />
      <div class="lightbox-footer">
        <span id="lightbox-name" class="text-sm text-muted"></span>
        <a id="lightbox-dl" href="" download class="btn btn-outline btn-sm">Download</a>
      </div>
    </div>
  </div>
`

const dropZone = document.getElementById('drop-zone')
const previewGrid = document.getElementById('preview-grid')
const clearBtn = document.getElementById('clear-btn')
const browseBtn = document.getElementById('browse-btn')
const fileInput = document.getElementById('file-input')
const dropHint = dropZone.querySelector('.drop-hint')
const statsEl = document.getElementById('stats')
const itemCountEl = document.getElementById('item-count')
const lightbox = document.getElementById('lightbox')
const lightboxImg = document.getElementById('lightbox-img')
const lightboxName = document.getElementById('lightbox-name')
const lightboxDl = document.getElementById('lightbox-dl')

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fileExt(name) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toUpperCase()
}

function totalSize() {
  return items.reduce((sum, item) => sum + (item.size || 0), 0)
}

function toast(message) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = message
  toastRoot.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => el.remove(), 300)
  }, 2200)
}

function revokeItem(item) {
  if (item.url) URL.revokeObjectURL(item.url)
}

function removeItem(id) {
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return
  revokeItem(items[index])
  items.splice(index, 1)
  render()
}

function clearAll() {
  if (items.length === 0) return
  items.forEach(revokeItem)
  items.length = 0
  closeLightbox()
  render()
  toast('Cleared all items')
}

function addItem(data) {
  items.unshift({ id: ++itemId, addedAt: new Date(), ...data })
  render()
}

function handleFiles(fileList) {
  Array.from(fileList).forEach((file) => {
    if (file.type.startsWith('image/')) {
      addItem({
        type: 'image',
        name: file.name || 'Pasted image',
        size: file.size,
        mime: file.type,
        url: URL.createObjectURL(file),
        file,
      })
      return
    }

    if (file.type.startsWith('video/')) {
      addItem({
        type: 'video',
        name: file.name,
        size: file.size,
        mime: file.type,
        url: URL.createObjectURL(file),
        file,
      })
      return
    }

    if (file.type.startsWith('audio/')) {
      addItem({
        type: 'audio',
        name: file.name,
        size: file.size,
        mime: file.type,
        url: URL.createObjectURL(file),
        file,
      })
      return
    }

    if (file.type === 'application/pdf') {
      addItem({
        type: 'pdf',
        name: file.name,
        size: file.size,
        mime: file.type,
        url: URL.createObjectURL(file),
        file,
      })
      return
    }

    if (
      file.type.startsWith('text/') ||
      file.name.match(/\.(txt|md|json|js|ts|css|html|xml|csv|log|yml|yaml|svg)$/i)
    ) {
      const reader = new FileReader()
      reader.onload = () => {
        addItem({
          type: 'text',
          name: file.name,
          size: file.size,
          mime: file.type || 'text/plain',
          content: String(reader.result),
          file,
        })
      }
      reader.readAsText(file)
      return
    }

    addItem({
      type: 'file',
      name: file.name || 'Unnamed file',
      size: file.size,
      mime: file.type || 'application/octet-stream',
      url: URL.createObjectURL(file),
      file,
    })
  })
}

function handlePaste(event) {
  const { clipboardData } = event
  if (!clipboardData) return

  let handled = false

  if (clipboardData.files.length > 0) {
    event.preventDefault()
    handleFiles(clipboardData.files)
    handled = true
  }

  if (!handled) {
    for (const item of clipboardData.items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          event.preventDefault()
          handleFiles([file])
          handled = true
        }
      }
    }
  }

  if (!handled) {
    const text = clipboardData.getData('text/plain')
    if (text.trim()) {
      event.preventDefault()
      addItem({
        type: 'text',
        name: 'Pasted text',
        size: new Blob([text]).size,
        mime: 'text/plain',
        content: text,
      })
    }
  }
}

async function copyText(content) {
  await navigator.clipboard.writeText(content)
  toast('Copied to clipboard')
}

async function copyImage(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
  toast('Image copied to clipboard')
}

function openLightbox(item) {
  lightboxImg.src = item.url
  lightboxImg.alt = item.name
  lightboxName.textContent = item.name
  lightboxDl.href = item.url
  lightboxDl.download = item.name
  lightbox.hidden = false
  document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  lightbox.hidden = true
  lightboxImg.src = ''
  document.body.style.overflow = ''
}

function cardActions(item) {
  const actions = []

  if (item.type === 'text') {
    actions.push(
      `<button type="button" class="btn btn-ghost btn-sm" data-copy-text="${item.id}">Copy</button>`
    )
  }

  if (item.type === 'image') {
    actions.push(
      `<button type="button" class="btn btn-ghost btn-sm" data-copy-img="${item.id}">Copy</button>`
    )
    actions.push(
      `<button type="button" class="btn btn-ghost btn-sm" data-expand="${item.id}">Expand</button>`
    )
  }

  if (item.url) {
    actions.push(
      `<a href="${item.url}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Open</a>`
    )
    actions.push(
      `<a href="${item.url}" download="${escapeHtml(item.name)}" class="btn btn-ghost btn-sm">Download</a>`
    )
  }

  if (!actions.length) return ''
  return `<div class="card-footer">${actions.join('')}</div>`
}

function renderCard(item) {
  const label = TYPE_LABELS[item.type] || 'File'

  let body = ''

  if (item.type === 'image') {
    body = `<img src="${item.url}" alt="${escapeHtml(item.name)}" class="preview-image" data-expand="${item.id}" />`
  } else if (item.type === 'video') {
    body = `<video src="${item.url}" controls class="preview-media"></video>`
  } else if (item.type === 'audio') {
    body = `<audio src="${item.url}" controls class="preview-audio"></audio>`
  } else if (item.type === 'pdf') {
    body = `<iframe src="${item.url}" class="preview-pdf" title="${escapeHtml(item.name)}"></iframe>`
  } else if (item.type === 'text') {
    body = `<pre class="preview-text">${escapeHtml(item.content)}</pre>`
  } else {
    const ext = fileExt(item.name)
    body = `
      <div class="file-placeholder">
        <span class="file-ext">${escapeHtml(ext || 'FILE')}</span>
        <span class="text-muted text-xs">${escapeHtml(item.mime)}</span>
      </div>
    `
  }

  return `
    <article class="card" data-id="${item.id}">
      <div class="card-header">
        <div class="card-header-left">
          <span class="badge badge-outline">${label}</span>
          <span class="text-muted text-xs">${formatTime(item.addedAt)}</span>
        </div>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" data-remove="${item.id}" aria-label="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="card-content">${body}</div>
      <div class="card-meta">
        <span class="card-name text-sm" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <span class="text-muted text-xs">${formatBytes(item.size)}</span>
      </div>
      ${cardActions(item)}
    </article>
  `
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function render() {
  previewGrid.innerHTML = items.map(renderCard).join('')
  dropHint.hidden = items.length > 0
  clearBtn.hidden = items.length === 0

  if (items.length > 0) {
    statsEl.hidden = false
    statsEl.textContent = `${items.length} item${items.length === 1 ? '' : 's'} · ${formatBytes(totalSize())}`
    itemCountEl.textContent = `${items.length} preview${items.length === 1 ? '' : 's'}`
  } else {
    statsEl.hidden = true
    itemCountEl.textContent = ''
  }
}

previewGrid.addEventListener('click', async (event) => {
  const removeBtn = event.target.closest('[data-remove]')
  if (removeBtn) {
    removeItem(Number(removeBtn.dataset.remove))
    return
  }

  const copyTextBtn = event.target.closest('[data-copy-text]')
  if (copyTextBtn) {
    const item = items.find((i) => i.id === Number(copyTextBtn.dataset.copyText))
    if (item?.content) await copyText(item.content)
    return
  }

  const copyImgBtn = event.target.closest('[data-copy-img]')
  if (copyImgBtn) {
    const item = items.find((i) => i.id === Number(copyImgBtn.dataset.copyImg))
    if (item?.url) {
      try {
        await copyImage(item.url)
      } catch {
        toast('Could not copy image')
      }
    }
    return
  }

  const expandBtn = event.target.closest('[data-expand]')
  if (expandBtn) {
    const item = items.find((i) => i.id === Number(expandBtn.dataset.expand))
    if (item?.type === 'image') openLightbox(item)
  }
})

clearBtn.addEventListener('click', clearAll)
browseBtn.addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', (event) => {
  if (event.target.files?.length) handleFiles(event.target.files)
  event.target.value = ''
})

lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox)
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox()
})

document.addEventListener('paste', handlePaste)

document.addEventListener('dragover', (event) => {
  event.preventDefault()
  dropZone.classList.add('dragging')
})

document.addEventListener('dragleave', (event) => {
  if (event.relatedTarget && document.contains(event.relatedTarget)) return
  dropZone.classList.remove('dragging')
})

document.addEventListener('drop', (event) => {
  event.preventDefault()
  dropZone.classList.remove('dragging')
  if (event.dataTransfer?.files?.length) handleFiles(event.dataTransfer.files)
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!lightbox.hidden) closeLightbox()
    else if (items.length > 0) clearAll()
  }
})
