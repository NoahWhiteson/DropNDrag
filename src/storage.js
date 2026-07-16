const STORAGE_KEY = 'dropndrag-v1'
const MAX_BLOB_SIZE = 2 * 1024 * 1024

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function hasSavedSession() {
  const state = loadState()
  if (!state?.sessions?.length) return false
  return state.sessions.some((s) => s.items?.length > 0)
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    console.warn('Could not save session — storage may be full')
  }
}

export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function serializeItem(item) {
  const stored = {
    id: item.id,
    type: item.type,
    name: item.name,
    size: item.size,
    mime: item.mime,
    addedAt: item.addedAt instanceof Date ? item.addedAt.toISOString() : item.addedAt,
  }

  if (item.content != null) {
    stored.content = item.content
    return stored
  }

  let blob = item.file
  if (!blob && item.url) {
    try {
      const res = await fetch(item.url)
      blob = await res.blob()
    } catch {
      return stored
    }
  }

  if (!blob) return stored

  if (blob.size > MAX_BLOB_SIZE) {
    stored.tooLarge = true
    return stored
  }

  stored.dataUrl = await blobToDataUrl(blob)
  return stored
}

export function deserializeItem(stored) {
  const item = {
    id: stored.id,
    type: stored.type,
    name: stored.name,
    size: stored.size,
    mime: stored.mime,
    addedAt: new Date(stored.addedAt),
    tooLarge: stored.tooLarge,
  }

  if (stored.content != null) {
    item.content = stored.content
    return item
  }

  if (stored.dataUrl) {
    item.url = stored.dataUrl
  }

  return item
}

export async function buildStatePayload({ itemId, currentSessionId, sessions, items }) {
  const serializedItems = await Promise.all(items.map(serializeItem))
  const updatedSessions = sessions.map((s) =>
    s.id === currentSessionId ? { ...s, items: serializedItems } : s
  )

  return {
    itemId,
    currentSessionId,
    sessions: updatedSessions,
  }
}

export function createSession(title = 'New session') {
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: new Date().toISOString(),
    items: [],
  }
}
