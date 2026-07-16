const CODE_LANG = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  cs: 'csharp',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  css: 'css',
  scss: 'scss',
  less: 'less',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  lua: 'lua',
  r: 'r',
  vue: 'xml',
  svelte: 'xml',
}

const TEXT_EXT = new Set([
  'txt', 'log', 'env', 'ini', 'cfg', 'conf', 'gitignore', 'dockerignore',
])

export function extLower(name) {
  const dot = name.lastIndexOf('.')
  if (dot === -1) return name.toLowerCase()
  return name.slice(dot + 1).toLowerCase()
}

export function detectFileKind(file) {
  const name = file.name || ''
  const ext = extLower(name)
  const mime = file.type || ''

  if (mime.startsWith('image/') || ext === 'svg' || ext === 'webp' || ext === 'gif' || ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
    if (ext === 'svg' || mime === 'image/svg+xml') return { type: 'svg' }
    return { type: 'image' }
  }
  if (mime.startsWith('video/')) return { type: 'video' }
  if (mime.startsWith('audio/')) return { type: 'audio' }
  if (mime === 'application/pdf' || ext === 'pdf') return { type: 'pdf' }
  if (ext === 'md' || ext === 'mdx' || ext === 'markdown') return { type: 'markdown' }
  if (ext === 'html' || ext === 'htm') return { type: 'html' }
  if (ext === 'json' || ext === 'jsonc' || mime === 'application/json') return { type: 'json' }
  if (ext === 'csv' || ext === 'tsv' || mime === 'text/csv') return { type: 'csv', delimiter: ext === 'tsv' ? '\t' : ',' }
  if (CODE_LANG[ext]) return { type: 'code', language: CODE_LANG[ext] }
  if (mime.startsWith('text/') || TEXT_EXT.has(ext)) return { type: 'text' }
  if (['txt', 'log', 'xml'].includes(ext)) return { type: 'text' }
  return { type: 'file' }
}

export function isTextKind(type) {
  return ['text', 'markdown', 'html', 'json', 'csv', 'code'].includes(type)
}

export function typeLabel(type) {
  const labels = {
    image: 'Image',
    svg: 'SVG',
    video: 'Video',
    audio: 'Audio',
    pdf: 'PDF',
    markdown: 'Markdown',
    html: 'HTML',
    json: 'JSON',
    csv: 'CSV',
    code: 'Code',
    text: 'Text',
    file: 'File',
  }
  return labels[type] || 'File'
}

export function uniqueFilename(name, used) {
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  const dot = name.lastIndexOf('.')
  const base = dot === -1 ? name : name.slice(0, dot)
  const ext = dot === -1 ? '' : name.slice(dot)
  let i = 1
  while (used.has(`${base} (${i})${ext}`)) i++
  const next = `${base} (${i})${ext}`
  used.add(next)
  return next
}
