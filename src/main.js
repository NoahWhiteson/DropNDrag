import './style.css'

const app = document.querySelector('#app')
let itemId = 0
const items = []

app.innerHTML = `
  <header class="header">
    <div>
      <h1>Paste Preview</h1>
      <p class="subtitle">Paste with Ctrl+V or drag files anywhere on this page</p>
    </div>
    <button type="button" id="clear-btn" class="btn" hidden>Clear all</button>
  </header>

  <div id="drop-zone" class="drop-zone">
    <div class="drop-hint">
      <span class="drop-icon">+</span>
      <p>Drop files here or paste from clipboard</p>
      <p class="drop-sub">Images, text, PDFs, videos, anything</p>
    </div>
    <div id="preview-grid" class="preview-grid"></div>
  </div>
`

const dropZone = document.getElementById('drop-zone')
const previewGrid = document.getElementById('preview-grid')
const clearBtn = document.getElementById('clear-btn')
const dropHint = dropZone.querySelector('.drop-hint')

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function fileExt(name) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toUpperCase()
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
  items.forEach(revokeItem)
  items.length = 0
  render()
}

function addItem(data) {
  items.unshift({ id: ++itemId, ...data })
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

    if (file.type.startsWith('text/') || file.name.match(/\.(txt|md|json|js|ts|css|html|xml|csv|log)$/i)) {
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

  const files = clipboardData.files
  if (files.length > 0) {
    event.preventDefault()
    handleFiles(files)
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

function renderCard(item) {
  const meta = `
    <div class="card-meta">
      <span class="card-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
      <span class="card-size">${formatBytes(item.size)}</span>
    </div>
  `

  let body = ''

  if (item.type === 'image') {
    body = `<img src="${item.url}" alt="${escapeHtml(item.name)}" class="preview-image" />`
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
        <span class="file-mime">${escapeHtml(item.mime)}</span>
      </div>
    `
  }

  const download = item.url
    ? `<a href="${item.url}" download="${escapeHtml(item.name)}" class="card-action">Download</a>`
    : ''

  return `
    <article class="preview-card" data-id="${item.id}">
      <div class="card-header">
        <span class="card-type">${item.type}</span>
        <button type="button" class="card-remove" data-remove="${item.id}" aria-label="Remove">×</button>
      </div>
      <div class="card-body">${body}</div>
      ${meta}
      ${download ? `<div class="card-footer">${download}</div>` : ''}
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
}

previewGrid.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-remove]')
  if (btn) removeItem(Number(btn.dataset.remove))
})

clearBtn.addEventListener('click', clearAll)

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
  if (event.dataTransfer?.files?.length) {
    handleFiles(event.dataTransfer.files)
  }
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && items.length > 0) clearAll()
})
