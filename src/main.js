import './style.css'
import {
  loadState,
  saveState,
  clearStorage,
  hasSavedSession,
  buildStatePayload,
  deserializeItem,
  createSession,
} from './storage.js'

const app = document.querySelector('#app')
const toastRoot = document.getElementById('toast-root')

let itemId = 0
let items = []
let sessions = []
let currentSessionId = null
let searchQuery = ''
let viewMode = 'grid'
let sidebarOpen = true
let saveTimer = null

const TYPE_LABELS = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF',
  text: 'Text',
  file: 'File',
}

const ICONS = {
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  sidebar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  grid: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  list: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  image: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  text: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
  file: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
}

function mountShell() {
  app.innerHTML = `
    <div class="shell ${sidebarOpen ? '' : 'sidebar-collapsed'}">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-top">
          <button type="button" class="sidebar-new" id="new-session-btn">
            ${ICONS.plus}
            <span>New session</span>
          </button>
        </div>
        <div class="sidebar-label">History</div>
        <nav class="sidebar-sessions" id="session-list"></nav>
        <div class="sidebar-footer">
          <span class="text-muted text-xs">Auto-saved locally</span>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <button type="button" class="icon-btn" id="sidebar-toggle" aria-label="Toggle sidebar">${ICONS.sidebar}</button>
          <span class="topbar-title" id="session-title">DropNDrag</span>
          <div class="topbar-actions">
            <div class="search-wrap">
              ${ICONS.search}
              <input type="search" id="search-input" class="search-input" placeholder="Search items…" />
            </div>
            <button type="button" class="icon-btn" id="view-toggle" aria-label="Toggle view">${ICONS.grid}</button>
            <button type="button" class="icon-btn" id="clear-btn" hidden aria-label="Clear session">${ICONS.close}</button>
          </div>
        </header>

        <main class="content" id="drop-zone">
          <input type="file" id="file-input" multiple hidden />
          <div class="empty-state" id="empty-state">
            <h2 class="greeting">Ready when you are.</h2>
            <p class="text-muted">Drop files anywhere or paste with Ctrl+V.</p>
            <div class="quick-actions">
              <button type="button" class="quick-chip" data-action="browse">${ICONS.image} Add images</button>
              <button type="button" class="quick-chip" data-action="browse">${ICONS.file} Upload files</button>
              <button type="button" class="quick-chip" data-action="paste-text">${ICONS.text} Paste text</button>
            </div>
          </div>
          <div id="preview-grid" class="preview-grid"></div>
        </main>
      </div>
    </div>

    <div id="restore-dialog" class="dialog-overlay" hidden>
      <div class="dialog-card">
        <h3>Restore session?</h3>
        <p class="text-muted">Seems like something happened, would you like to load your previous session?</p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" id="restore-no">Start fresh</button>
          <button type="button" class="btn btn-primary" id="restore-yes">Load session</button>
        </div>
      </div>
    </div>

    <div id="lightbox" class="dialog-overlay lightbox" hidden>
      <div class="dialog-content">
        <button type="button" class="icon-btn lightbox-close" aria-label="Close">${ICONS.close}</button>
        <img id="lightbox-img" src="" alt="" class="lightbox-image" />
        <div class="lightbox-footer">
          <span id="lightbox-name" class="text-sm text-muted"></span>
          <a id="lightbox-dl" href="" download class="btn btn-ghost btn-sm">Download</a>
        </div>
      </div>
    </div>
  `
}

function $(id) {
  return document.getElementById(id)
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date) {
  const d = new Date(date)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function fileExt(name) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toUpperCase()
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
  if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url)
}

function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const payload = await buildStatePayload({ itemId, currentSessionId, sessions, items })
    sessions = payload.sessions
    saveState(payload)
  }, 400)
}

function initSession() {
  const session = createSession()
  sessions = [session]
  currentSessionId = session.id
  items = []
  itemId = 0
}

function applyState(state) {
  itemId = state.itemId || 0
  currentSessionId = state.currentSessionId
  sessions = state.sessions || []
  const current = sessions.find((s) => s.id === currentSessionId) || sessions[0]
  if (!current) {
    initSession()
    return
  }
  currentSessionId = current.id
  items = (current.items || []).map(deserializeItem)
}

function syncSessionItems() {
  const session = sessions.find((s) => s.id === currentSessionId)
  if (!session) return
  if (items.length && session.title === 'New session') {
    session.title = items[0].name.length > 28 ? `${items[0].name.slice(0, 28)}…` : items[0].name
  }
  scheduleSave()
}

function removeItem(id) {
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return
  revokeItem(items[index])
  items.splice(index, 1)
  render()
  syncSessionItems()
}

function clearAll() {
  if (items.length === 0) return
  items.forEach(revokeItem)
  items = []
  closeLightbox()
  render()
  syncSessionItems()
  toast('Session cleared')
}

function addItem(data) {
  items.unshift({ id: ++itemId, addedAt: new Date(), ...data })
  render()
  syncSessionItems()
}

async function persistNow() {
  const payload = await buildStatePayload({ itemId, currentSessionId, sessions, items })
  sessions = payload.sessions
  saveState(payload)
}

function switchSession(id) {
  const session = sessions.find((s) => s.id === id)
  if (!session || id === currentSessionId) return
  persistNow().then(() => {
    items.forEach(revokeItem)
    currentSessionId = id
    const fresh = sessions.find((s) => s.id === id)
    items = (fresh?.items || []).map(deserializeItem)
    searchQuery = ''
    $('search-input').value = ''
    render()
  })
}

function newSession() {
  persistNow().then(() => {
    items.forEach(revokeItem)
    const session = createSession()
    sessions.unshift(session)
    currentSessionId = session.id
    items = []
    searchQuery = ''
    $('search-input').value = ''
    render()
    toast('New session started')
  })
}

function deleteSession(id, event) {
  event.stopPropagation()
  if (sessions.length === 1) {
    items.forEach(revokeItem)
    items = []
    sessions[0].title = 'New session'
    sessions[0].createdAt = new Date().toISOString()
    render()
    syncSessionItems()
    return
  }
  const idx = sessions.findIndex((s) => s.id === id)
  if (idx === -1) return
  if (id === currentSessionId) {
    sessions.splice(idx, 1)
    const next = sessions[0]
    currentSessionId = next.id
    items = (next.items || []).map(deserializeItem)
  } else {
    sessions.splice(idx, 1)
  }
  render()
  scheduleSave()
}

function filteredItems() {
  if (!searchQuery.trim()) return items
  const q = searchQuery.toLowerCase()
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      (item.content && item.content.toLowerCase().includes(q))
  )
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
    for (const entry of clipboardData.items) {
      if (entry.kind === 'file') {
        const file = entry.getAsFile()
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
  toast('Copied')
}

async function copyImage(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
  toast('Image copied')
}

function openLightbox(item) {
  $('lightbox-img').src = item.url
  $('lightbox-img').alt = item.name
  $('lightbox-name').textContent = item.name
  $('lightbox-dl').href = item.url
  $('lightbox-dl').download = item.name
  $('lightbox').hidden = false
  document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  $('lightbox').hidden = true
  $('lightbox-img').src = ''
  document.body.style.overflow = ''
}

function cardActions(item) {
  if (item.tooLarge) {
    return `<div class="card-footer"><span class="text-muted text-xs">File too large to restore</span></div>`
  }

  const actions = []
  if (item.type === 'text') {
    actions.push(`<button type="button" class="btn btn-ghost btn-sm" data-copy-text="${item.id}">Copy</button>`)
  }
  if (item.type === 'image' && item.url) {
    actions.push(`<button type="button" class="btn btn-ghost btn-sm" data-copy-img="${item.id}">Copy</button>`)
    actions.push(`<button type="button" class="btn btn-ghost btn-sm" data-expand="${item.id}">Expand</button>`)
  }
  if (item.url) {
    actions.push(`<a href="${item.url}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Open</a>`)
    actions.push(`<a href="${item.url}" download="${escapeHtml(item.name)}" class="btn btn-ghost btn-sm">Save</a>`)
  }
  if (!actions.length) return ''
  return `<div class="card-footer">${actions.join('')}</div>`
}

function renderCard(item) {
  const label = TYPE_LABELS[item.type] || 'File'
  let body = ''

  if (item.tooLarge) {
    body = `<div class="file-placeholder"><span class="file-ext">!</span><span class="text-muted text-xs">Not saved — over 2MB</span></div>`
  } else if (item.type === 'image' && item.url) {
    body = `<img src="${item.url}" alt="${escapeHtml(item.name)}" class="preview-image" data-expand="${item.id}" />`
  } else if (item.type === 'video' && item.url) {
    body = `<video src="${item.url}" controls class="preview-media"></video>`
  } else if (item.type === 'audio' && item.url) {
    body = `<audio src="${item.url}" controls class="preview-audio"></audio>`
  } else if (item.type === 'pdf' && item.url) {
    body = `<iframe src="${item.url}" class="preview-pdf" title="${escapeHtml(item.name)}"></iframe>`
  } else if (item.type === 'text') {
    body = `<pre class="preview-text">${escapeHtml(item.content)}</pre>`
  } else {
    body = `<div class="file-placeholder"><span class="file-ext">${escapeHtml(fileExt(item.name) || 'FILE')}</span><span class="text-muted text-xs">${escapeHtml(item.mime)}</span></div>`
  }

  return `
    <article class="card ${viewMode === 'list' ? 'card-list' : ''}" data-id="${item.id}">
      <div class="card-header">
        <div class="card-header-left">
          <span class="badge">${label}</span>
          <span class="text-muted text-xs">${formatTime(item.addedAt)}</span>
        </div>
        <button type="button" class="icon-btn icon-btn-sm" data-remove="${item.id}" aria-label="Remove">${ICONS.close}</button>
      </div>
      <div class="card-content">${body}</div>
      <div class="card-meta">
        <span class="card-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <span class="text-muted text-xs">${formatBytes(item.size)}</span>
      </div>
      ${cardActions(item)}
    </article>
  `
}

function renderSessions() {
  $('session-list').innerHTML = sessions
    .map((s) => {
      const count = s.id === currentSessionId ? items.length : (s.items || []).length
      return `
    <button type="button" class="session-item ${s.id === currentSessionId ? 'active' : ''}" data-session="${s.id}">
      <span class="session-item-title">${escapeHtml(s.title)}</span>
      <span class="session-item-meta text-muted text-xs">${formatDate(s.createdAt)} · ${count} items</span>
      <span class="session-delete" data-delete-session="${s.id}" aria-label="Delete session">${ICONS.close}</span>
    </button>
  `
    })
    .join('')

  const current = sessions.find((s) => s.id === currentSessionId)
  $('session-title').textContent = current?.title || 'DropNDrag'
}

function render() {
  const visible = filteredItems()
  $('preview-grid').innerHTML = visible.map(renderCard).join('')
  $('preview-grid').className = `preview-grid ${viewMode === 'list' ? 'preview-list' : ''}`
  $('empty-state').hidden = items.length > 0
  $('clear-btn').hidden = items.length === 0
  $('view-toggle').innerHTML = viewMode === 'grid' ? ICONS.list : ICONS.grid
  renderSessions()
}

function bindEvents() {
  const dropZone = $('drop-zone')
  const fileInput = $('file-input')

  fileInput.addEventListener('change', (e) => {
    if (e.target.files?.length) handleFiles(e.target.files)
    e.target.value = ''
  })

  $('clear-btn').addEventListener('click', clearAll)
  $('new-session-btn').addEventListener('click', newSession)

  $('sidebar-toggle').addEventListener('click', () => {
    sidebarOpen = !sidebarOpen
    document.querySelector('.shell').classList.toggle('sidebar-collapsed', !sidebarOpen)
  })

  $('search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value
    render()
  })

  $('view-toggle').addEventListener('click', () => {
    viewMode = viewMode === 'grid' ? 'list' : 'grid'
    render()
  })

  document.querySelectorAll('.quick-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (chip.dataset.action === 'paste-text') {
        navigator.clipboard.readText().then((text) => {
          if (text.trim()) {
            addItem({
              type: 'text',
              name: 'Pasted text',
              size: new Blob([text]).size,
              mime: 'text/plain',
              content: text,
            })
          } else toast('Clipboard is empty')
        }).catch(() => toast('Allow clipboard access to paste text'))
      } else {
        fileInput.click()
      }
    })
  })

  $('session-list').addEventListener('click', (e) => {
    const del = e.target.closest('[data-delete-session]')
    if (del) {
      deleteSession(del.dataset.deleteSession, e)
      return
    }
    const btn = e.target.closest('[data-session]')
    if (btn) switchSession(btn.dataset.session)
  })

  $('preview-grid').addEventListener('click', async (e) => {
    const removeBtn = e.target.closest('[data-remove]')
    if (removeBtn) return removeItem(Number(removeBtn.dataset.remove))

    const copyTextBtn = e.target.closest('[data-copy-text]')
    if (copyTextBtn) {
      const item = items.find((i) => i.id === Number(copyTextBtn.dataset.copyText))
      if (item?.content) await copyText(item.content)
      return
    }

    const copyImgBtn = e.target.closest('[data-copy-img]')
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

    const expandBtn = e.target.closest('[data-expand]')
    if (expandBtn) {
      const item = items.find((i) => i.id === Number(expandBtn.dataset.expand))
      if (item?.type === 'image') openLightbox(item)
    }
  })

  document.querySelector('.lightbox-close').addEventListener('click', closeLightbox)
  $('lightbox').addEventListener('click', (e) => {
    if (e.target === $('lightbox')) closeLightbox()
  })

  document.addEventListener('paste', handlePaste)
  document.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.classList.add('dragging')
  })
  document.addEventListener('dragleave', (e) => {
    if (e.relatedTarget && document.contains(e.relatedTarget)) return
    dropZone.classList.remove('dragging')
  })
  document.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('dragging')
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('lightbox').hidden) closeLightbox()
      else if (!$('restore-dialog').hidden) $('restore-dialog').hidden = true
      else if (items.length > 0) clearAll()
    }
  })
}

function showRestoreDialog() {
  return new Promise((resolve) => {
    const dialog = $('restore-dialog')
    dialog.hidden = false
    $('restore-yes').onclick = () => {
      dialog.hidden = true
      resolve(true)
    }
    $('restore-no').onclick = () => {
      dialog.hidden = true
      clearStorage()
      initSession()
      render()
      resolve(false)
    }
  })
}

async function boot() {
  mountShell()
  bindEvents()

  if (hasSavedSession()) {
    const restore = await showRestoreDialog()
    if (restore) {
      applyState(loadState())
      toast('Session restored')
    } else {
      initSession()
    }
  } else {
    initSession()
  }

  render()
}

boot()
