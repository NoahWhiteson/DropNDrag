import './style.css'

const app = document.querySelector('#app')
const toastRoot = document.getElementById('toast-root')
let itemId = 0
const items = []

const TYPE_ICONS = {
  image: '◈',
  video: '▶',
  audio: '♫',
  pdf: '◧',
  text: '¶',
  file: '◇',
}

app.innerHTML = `
  <header class="header">
    <div class="brand">
      <img src="/logo.svg" alt="" class="logo" width="40" height="40" />
      <div>
        <h1>Drop<span class="accent">N</span>Drag</h1>
        <p class="subtitle">Paste or drop anything — instant previews</p>
      </div>
    </div>
    <div class="header-actions">
      <span id="stats" class="stats" hidden></span>
      <input type="file" id="file-input" multiple hidden />
      <button type="button" id="browse-btn" class="btn btn-ghost">
        <span class="btn-icon">⊕</span> Browse
      </button>
      <button type="button" id="clear-btn" class="btn btn-danger" hidden>Clear all</button>
    </div>
  </header>

  <div id="drop-zone" class="drop-zone">
    <div class="drop-hint">
      <img src="/logo.svg" alt="" class="drop-logo" width="64" height="64" />
      <p class="drop-title">Drop files here</p>
      <p class="drop-sub">or press <kbd>Ctrl</kbd>+<kbd>V</kbd> to paste from clipboard</p>
      <div class="drop-tags">
        <span>Images</span><span>Text</span><span>PDF</span><span>Video</span><span>Anything</span>
      </div>
    </div>
    <div id="preview-grid" class="preview-grid"></div>
  </div>

  <footer class="footer">
    <span><kbd>Esc</kbd> clear all</span>
    <span>Click images to expand</span>
    <span id="item-count"></span>
  </footer>

  <div id="lightbox" class="lightbox" hidden>
    <button type="button" class="lightbox-close" aria-label="Close">×</button>
    <img id="lightbox-img" src="" alt="" />
    <div class="lightbox-bar">
      <span id="lightbox-name"></span>
      <a id="lightbox-dl" href="" download class="btn btn-ghost btn-sm">Download</a>
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
      `<button type="button" class="card-action" data-copy-text="${item.id}">Copy</button>`
    )
  }

  if (item.type === 'image') {
    actions.push(
      `<button type="button" class="card-action" data-copy-img="${item.id}">Copy image</button>`
    )
    actions.push(
      `<button type="button" class="card-action" data-expand="${item.id}">Expand</button>`
    )
  }

  if (item.url) {
    actions.push(
      `<a href="${item.url}" target="_blank" rel="noopener" class="card-action">Open</a>`
    )
    actions.push(
      `<a href="${item.url}" download="${escapeHtml(item.name)}" class="card-action">Download</a>`
    )
  }

  if (!actions.length) return ''
  return `<div class="card-footer">${actions.join('')}</div>`
}

function renderCard(item) {
  const icon = TYPE_ICONS[item.type] || '◇'

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
    const lines = item.content.split('\n').length
    body = `
      <div class="text-wrap">
        <div class="text-info">${lines} line${lines === 1 ? '' : 's'}</div>
        <pre class="preview-text">${escapeHtml(item.content)}</pre>
      </div>
    `
  } else {
    const ext = fileExt(item.name)
    body = `
      <div class="file-placeholder">
        <span class="file-ext">${escapeHtml(ext || 'FILE')}</span>
        <span class="file-mime">${escapeHtml(item.mime)}</span>
      </div>
    `
  }

  return `
    <article class="preview-card" data-id="${item.id}">
      <div class="card-header">
        <span class="card-type"><span class="type-icon">${icon}</span> ${item.type}</span>
        <span class="card-time">${formatTime(item.addedAt)}</span>
        <button type="button" class="card-remove" data-remove="${item.id}" aria-label="Remove">×</button>
      </div>
      <div class="card-body">${body}</div>
      <div class="card-meta">
        <span class="card-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <span class="card-size">${formatBytes(item.size)}</span>
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
