// ── TEMP-MATERIAL-TAB ───────────────────────────────────────────────
// MEL Excel importer. Reads a workbook with the same shape as the
// internal proposal spreadsheet (`temp-pro.xlsx`):
//   - "Refrence Tables" sheet, rows 45-67, columns 3-7 (1-indexed):
//       label, A, B, C, D, X
//   - "MELs" sheet, repeating blocks of:
//       header row:    col A=parent qty, col B=bundle name
//       component rows: col B=qtyPerUnit, col D=part#, col E=description,
//                       col F=manufacturer, col G=unit price
//       "Total" row terminates each block.
// Returns an array of seed objects matching the MEL_SEED shape in
// src/stores/rom.js so the caller can just push them into the active
// scope. When the real Material workflow lands, delete this file along
// with the rest of the TEMP-MATERIAL-TAB sites.
// ────────────────────────────────────────────────────────────────────

const MEL_SHEET   = 'MELs'
const REF_SHEET   = 'Refrence Tables'
const TEMPLATES   = ['A', 'B', 'C', 'D']

// Same name normalisation we used when building the hardcoded seed —
// the two sheets disagree about pluralisation and hyphenation.
function normaliseName(name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim()
  const fixes = {
    '2 Bay Credenza':            '2-Bay Credenza',
    '3 Bay Credenza':            '3-Bay Credenza',
    '38 RU Rack':                '38RU Rack',
    'Ceiling Mic':               'Ceiling Mics',
    'Gooseneck Mic':             'Gooseneck Mics',
    'Touch Panel':               'Touch Panels',
    'VTC Codec':                 'VTC Codecs',
    'Control Processor and DSP': 'Control Processor & DSP',
  }
  return fixes[n] || n
}

// Heuristic category mapping. Caller can rebucket via the BOM UI.
function categoryFor(name) {
  const n = name.toLowerCase()
  if (n.includes('display') || n.includes('splash')) return 'cat-displays'
  if (n.includes('mic') || n.includes('speaker') || n.includes('camera') || n.includes('codec')) return 'cat-audio'
  if (n.includes('switch') || n.includes('pc source')) return 'cat-computing'
  if (n.includes('touch') || n.includes('processor') || n.includes('dsp')) return 'cat-control'
  if (n.includes('rack') || n.includes('credenza') || n.includes('podium')) return 'cat-mounts'
  return 'cat-misc'
}

// Pull a cell value from a SheetJS sheet using A1-style coords (1-indexed).
function cellValue(sheet, row, col) {
  const colLetter = colToLetter(col)
  const ref = colLetter + row
  const cell = sheet[ref]
  return cell ? cell.v : null
}

function colToLetter(col) {
  let s = ''
  while (col > 0) {
    const m = (col - 1) % 26
    s = String.fromCharCode(65 + m) + s
    col = Math.floor((col - 1) / 26)
  }
  return s
}

// Extract per-template parent quantities from the Refrence Tables sheet.
function readQtyMap(wb) {
  const ws = wb.Sheets[REF_SHEET]
  if (!ws) throw new Error(`Sheet "${REF_SHEET}" not found in workbook`)
  const out = {}
  for (let r = 45; r <= 67; r++) {
    const label = cellValue(ws, r, 3)
    if (!label) continue
    out[String(label).trim()] = {
      A: Number(cellValue(ws, r, 4)) || 0,
      B: Number(cellValue(ws, r, 5)) || 0,
      C: Number(cellValue(ws, r, 6)) || 0,
      D: Number(cellValue(ws, r, 7)) || 0,
    }
  }
  return out
}

// Walk the MELs sheet and emit bundle objects.
function readBundles(wb) {
  const ws = wb.Sheets[MEL_SHEET]
  if (!ws) throw new Error(`Sheet "${MEL_SHEET}" not found in workbook`)

  const range = ws['!ref'] ? ws['!ref'] : 'A1:H900'
  const maxRow = parseInt(range.split(':')[1].match(/\d+/)[0], 10)

  const bundles = []
  let current = null

  for (let r = 3; r <= maxRow; r++) {
    const a = cellValue(ws, r, 1)
    const b = cellValue(ws, r, 2)
    const d = cellValue(ws, r, 4)
    const e = cellValue(ws, r, 5)
    const f = cellValue(ws, r, 6)
    const g = cellValue(ws, r, 7)

    // Skip "Total" rows and fully-empty rows
    if (d === 'Total') continue
    if (a == null && b == null && d == null && e == null) continue

    // Header row: col B has a string bundle name, cols D-G empty
    if (typeof b === 'string' && d == null && e == null && f == null && g == null) {
      current = { name: normaliseName(b), components: [] }
      bundles.push(current)
      continue
    }
    // Component row: col D has a part number (string or number), col E is a description
    if (current && d != null && typeof e === 'string') {
      current.components.push({
        qtyPerUnit:   Number(b) || 0,
        partNumber:   String(d),
        description:  e.trim(),
        manufacturer: f ? String(f).trim() : '',
        unitPrice:    Number(g) || 0,
      })
    }
  }
  return bundles
}

// Main entrypoint. Accepts a File or Blob, returns an array of seed
// objects ready to be turned into material items. Throws on bad shape.
export async function parseMELWorkbook(file) {
  const XLSX = await import('xlsx')
  const buf  = await file.arrayBuffer()
  const wb   = XLSX.read(buf, { type: 'array' })

  const qtyMap = readQtyMap(wb)
  const bundles = readBundles(wb)

  return bundles.map(b => ({
    description:   b.name,
    categoryId:    categoryFor(b.name),
    qtyByTemplate: qtyMap[b.name] || { A: 0, B: 0, C: 0, D: 0 },
    components:    b.components,
  }))
}
