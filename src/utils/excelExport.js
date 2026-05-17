/**
 * ROM Tool — Excel Export (PDF-style layout, styled cells)
 *
 * Mirrors the PDF visual: navy section headers with white text, light-blue
 * sub-rows, navy grand-total row, alternating greys. One tab per included
 * scope plus a Summary tab. Cell styling uses xlsx-js-style (a fork of
 * SheetJS that actually writes cell styles).
 */

const NAVY    = '1A3560'   // section headers + grand total
const ACCENT  = '1A5FB4'   // accent text
const LTBLUE  = 'E8F0FE'   // sub-row fills
const GRAY    = 'F5F7FB'   // alternating row fill
const WHITE   = 'FFFFFF'
const TEXTDK  = '1A2133'
const TEXTMUT = '4A5A78'

function travelHrsByCat(rom, scopeId) {
  const out = {}
  rom.ENTITIES.forEach(e => (rom.travel[e.id] ?? []).forEach(trip => {
    if ((trip.coaId ?? rom.coas[0].id) !== scopeId) return
    const tripHrs = trip.travelHoursItems?.length
      ? trip.travelHoursItems.reduce((s, x) => s + (x.hours || 0), 0)
      : null
    ;(trip.travelers ?? []).forEach(tr => {
      if (!tr.laborCat) return
      const hrs = (tripHrs ?? (tr.travelHours || 0)) * Math.max(1, tr.qty || 1)
      out[tr.laborCat] = (out[tr.laborCat] || 0) + hrs
    })
  }))
  return out
}

function fmt(n)    { return Math.round(n || 0) }
function pct(v)    { return ((v || 0) * 100).toFixed(2) + '%' }
function dollar(n) { return '$' + Math.round(n || 0).toLocaleString() }

// Push project-info pair rows into the sheet, respecting the per-field
// "include" flags set in the Project Info drawer.
function pushProjectInfoRows(rows, rom) {
  const includes = rom.project?.includeFields || {}
  const ON = (k) => includes[k] !== false
  const candidates = [
    ['sponsor',         'Customer / Sponsor'],
    ['roomName',        'Project / Room'],
    ['building',        'Building'],
    ['cityBase',        'City / Base'],
    ['projectEngineer', 'Cronos Project Lead'],
    ['govLead',         'Government Project Lead'],
    ['pmSupportLead',   'PM Support Lead'],
    ['date',            'Date'],
  ].filter(([k]) => ON(k))
   .map(([k, label]) => [label, rom.project?.[k] || ''])
  for (let i = 0; i < candidates.length; i += 2) {
    const a = candidates[i]
    const b = candidates[i + 1] ?? ['', '']
    rows.push([a[0], a[1], '', b[0], b[1]])
  }
}

function safeSheetName(name, used) {
  const stripped = (name || 'Scope').replace(/[\\/?*[\]]/g, '').slice(0, 31)
  let candidate = stripped
  let n = 2
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n++})`
    candidate = stripped.slice(0, 31 - suffix.length) + suffix
  }
  used.add(candidate.toLowerCase())
  return candidate
}

// Style presets
const styleTitle      = { font: { name: 'Helvetica', sz: 16, bold: true, color: { rgb: NAVY  } }, alignment: { horizontal: 'left',   vertical: 'center' } }
const styleSubtitle   = { font: { name: 'Helvetica', sz: 11, italic: true, color: { rgb: TEXTMUT } }, alignment: { horizontal: 'left', vertical: 'center' } }
const styleHeroLabel  = { font: { name: 'Helvetica', sz: 10, bold: true, color: { rgb: WHITE } }, fill: { fgColor: { rgb: NAVY } }, alignment: { horizontal: 'left',  vertical: 'center' } }
const styleHeroValue  = { font: { name: 'Helvetica', sz: 16, bold: true, color: { rgb: WHITE } }, fill: { fgColor: { rgb: NAVY } }, alignment: { horizontal: 'right', vertical: 'center' }, numFmt: '"$"#,##0' }
const styleHeroSub    = { font: { name: 'Helvetica', sz: 9,  color: { rgb: TEXTMUT } }, fill: { fgColor: { rgb: LTBLUE } }, alignment: { horizontal: 'left', vertical: 'center' } }
const styleSection    = { font: { name: 'Helvetica', sz: 9,  bold: true, color: { rgb: WHITE } }, fill: { fgColor: { rgb: NAVY } }, alignment: { horizontal: 'left',  vertical: 'center' } }
const styleColHdr     = { font: { name: 'Helvetica', sz: 9,  bold: true, color: { rgb: WHITE } }, fill: { fgColor: { rgb: NAVY } }, alignment: { horizontal: 'left',  vertical: 'center' } }
const styleColHdrR    = { ...styleColHdr, alignment: { horizontal: 'right', vertical: 'center' } }
const styleSubRow     = { font: { name: 'Helvetica', sz: 10, bold: true, color: { rgb: NAVY  } }, fill: { fgColor: { rgb: LTBLUE } } }
const styleSubRowR    = { ...styleSubRow, alignment: { horizontal: 'right' }, numFmt: '"$"#,##0' }
const styleGrandRow   = { font: { name: 'Helvetica', sz: 12, bold: true, color: { rgb: WHITE } }, fill: { fgColor: { rgb: NAVY } } }
const styleGrandRowR  = { ...styleGrandRow, alignment: { horizontal: 'right' }, numFmt: '"$"#,##0' }
const styleCell       = { font: { name: 'Helvetica', sz: 10, color: { rgb: TEXTDK } } }
const styleCellMuted  = { font: { name: 'Helvetica', sz: 10, color: { rgb: TEXTMUT } } }
const styleCurrency   = { ...styleCell, alignment: { horizontal: 'right' }, numFmt: '"$"#,##0' }
const styleProjLabel  = { font: { name: 'Helvetica', sz: 9, bold: true, color: { rgb: TEXTMUT } } }
const styleProjValue  = { font: { name: 'Helvetica', sz: 10, color: { rgb: TEXTDK } } }

// Set the style on a cell (creates the cell if it doesn't exist).
function setStyle(ws, addr, style) {
  if (!ws[addr]) ws[addr] = { v: '', t: 's' }
  ws[addr].s = style
}
// Set both a value AND style at once (overwrites whatever's at addr).
function setCell(ws, addr, value, style, type = 's') {
  ws[addr] = { v: value, t: type, s: style }
}
function addr(row, col) {
  // Convert (0-based row, col) → "A1"-style address
  let s = ''
  let c = col
  while (true) {
    s = String.fromCharCode(65 + (c % 26)) + s
    c = Math.floor(c / 26) - 1
    if (c < 0) break
  }
  return s + (row + 1)
}

function buildScopeSheet(XLSX, rom, scope) {
  const t  = rom.coaTotals(scope.id)
  const oh = rom.overheadByCoa?.[scope.id] || {}

  // First build with plain arrays, then apply styles cell-by-cell.
  const rows = []
  rows.push(['Cost Estimate'])
  rows.push([scope.name])
  rows.push([])
  pushProjectInfoRows(rows, rom)
  rows.push(['Scope',              scope.name,                            '', '',               ''])
  rows.push([])
  rows.push(['LOADED TOTAL', t.totalLoaded])
  rows.push([`Labor ${dollar(t.labor)}   ·   Travel ${dollar(t.trips)}   ·   Material ${dollar(t.mat)}   ·   Overhead ${dollar(t.ohTotal + t.scr)}`])
  rows.push([])

  // Breakdown
  const breakdownTop = rows.length
  rows.push(['DESCRIPTION', 'AMOUNT'])
  rows.push(['ENGINEERING LABOR'])
  rom.ROLES.forEach(r => rows.push([r.label, rom.roleCostForCoa(r.id, null, scope.id)]))
  const scopeTravelLabor = rom.travelLaborFor(scope.id)
  if (scopeTravelLabor > 0) rows.push(['Travel Labor (travel hours)', scopeTravelLabor])
  rows.push(['Engineering Subtotal', t.labor])
  rows.push([])
  rows.push(['OTHER COSTS'])
  rows.push(['Travel',              t.trips])
  rows.push(['Material & Shipping', t.mat])
  rows.push(['Unloaded Total',      t.unloaded])
  rows.push([])
  rows.push(['OVERHEAD & RATES'])
  if (oh?.showLineItems === false) {
    rows.push(['Contract Fee', t.ohTotal + t.scr])
  } else {
    const items = Array.isArray(oh?.items) ? oh.items : []
    items.filter(it => it.enabled).forEach(it => {
      const cost = it.base === 'withOverhead' ? t.withOh * (it.pct || 0) : t.unloaded * (it.pct || 0)
      const suffix = (it.pct || 0) > 0 ? ` (${pct(it.pct)})` : ''
      rows.push([(it.label || 'Overhead item') + suffix, cost])
    })
  }
  rows.push(['Total Overhead', t.ohTotal + t.scr])
  rows.push([])
  rows.push(['LOADED TOTAL', t.totalLoaded])
  rows.push([])
  rows.push([])

  // Labor detail
  const laborTop = rows.length
  rows.push(['LABOR DETAIL'])
  rows.push(['Entity', 'Phase', 'Role', 'Task', 'Labor Cat', 'Days', 'Hrs/Day', 'Total Hrs', 'Rate ($/hr)', 'Cost ($)'])
  rom.lineItems.filter(l => l.coaId === scope.id && rom.enabledEntities.includes(l.entity)).forEach(l => {
    const entity = rom.ENTITIES.find(e => e.id === l.entity)
    const phase  = rom.LIFECYCLE_PHASES.find(p => p.id === l.phaseId)
    const role   = rom.ROLES.find(r => r.id === l.role)
    const cat    = rom.LABOR_CATS.find(c => c.id === l.laborCat)
    rows.push([
      entity?.label ?? l.entity, phase?.label ?? l.phaseId, role?.label ?? l.role,
      l.taskId || '', cat?.label ?? l.laborCat,
      l.days ?? 0, l.hoursPerDay ?? 0,
      rom.lineHours(l), l.rate || 0, rom.lineCost(l),
    ])
  })
  rows.push(['', '', '', '', '', '', 'Total', rom.laborHoursFor(scope.id), '', t.labor])
  rows.push([])

  // Travel detail
  const travelTop = rows.length
  rows.push(['TRAVEL DETAIL'])
  rows.push([
    'Trip', 'Entity', 'Destination', 'State', 'Per Diem ($/day)',
    'Traveler', 'Pay Cat', 'Qty', 'Days', 'Travel Hrs',
    'Hotel', 'Car', 'Airfare', 'Misc', 'Row Cost ($)',
  ])
  rom.visibleEntities.forEach(e => {
    (rom.travel[e.id] ?? [])
      .filter(trip => trip.coaId === scope.id)
      .forEach(trip => {
        const tripTravelers = trip.travelers ?? []
        if (tripTravelers.length === 0) {
          rows.push([
            trip.tripName || trip.destination || '(trip)', e.label,
            trip.destination || '', trip.state || '',
            (trip.lodgingRate || 0) + (trip.mieRate || 0),
            '(no travelers)', '', '', '', '', '', '', '', '', 0,
          ])
        }
        tripTravelers.forEach(tr => {
          const cat = rom.LABOR_CATS.find(c => c.id === tr.laborCat)
          rows.push([
            trip.tripName || trip.destination || '(trip)', e.label,
            trip.destination || '', trip.state || '',
            (trip.lodgingRate || 0) + (trip.mieRate || 0),
            tr.name || '', cat?.label || '',
            tr.qty || 1, tr.days || 0, tr.travelHours || 0,
            tr.hotel ? 'Yes' : '', tr.car ? 'Yes' : '', tr.airfare ? 'Yes' : '', tr.misc ? 'Yes' : '',
            rom.travelerCost(trip, tr) + rom.travelLaborCost(tr),
          ])
        })
      })
  })
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', 'Travel Total', t.trips])
  rows.push([])

  // Material detail
  const matTop = rows.length
  rows.push(['MATERIAL DETAIL'])
  rows.push(['Description', 'Qty', 'Unit Cost ($)', 'Extended ($)'])
  rom.material.items.filter(i => i.coaId === scope.id).forEach(i => {
    rows.push([i.description || '', i.qty || 0, i.unitCost || 0, (i.qty || 0) * (i.unitCost || 0)])
  })
  rows.push(['Hardware Subtotal',                       '', '', rom.materialUnloadedFor(scope.id)])
  rows.push([`Shipping (${pct(rom.material.shippingPct)})`, '', '', rom.materialUnloadedFor(scope.id) * (rom.material.shippingPct || 0)])
  rows.push(['Material Total',                          '', '', t.mat])

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Now apply styles by index
  setStyle(ws, addr(0, 0), styleTitle)
  setStyle(ws, addr(1, 0), styleSubtitle)
  // Project info rows: bold labels, plain values
  for (const r of [3, 4, 5]) {
    setStyle(ws, addr(r, 0), styleProjLabel)
    setStyle(ws, addr(r, 1), styleProjValue)
    setStyle(ws, addr(r, 3), styleProjLabel)
    setStyle(ws, addr(r, 4), styleProjValue)
  }
  // FY Funds → currency formatting
  setStyle(ws, addr(5, 4), { ...styleProjValue, numFmt: '"$"#,##0' })

  // Hero
  setStyle(ws, addr(7, 0), styleHeroLabel)
  setStyle(ws, addr(7, 1), styleHeroValue)
  setStyle(ws, addr(8, 0), styleHeroSub)

  // Breakdown
  setStyle(ws, addr(breakdownTop,     0), styleColHdr)
  setStyle(ws, addr(breakdownTop,     1), styleColHdrR)
  setStyle(ws, addr(breakdownTop + 1, 0), styleSection)
  // Engineering labor lines (one per role) — plain rows
  for (let i = 0; i < rom.ROLES.length; i++) {
    const r = breakdownTop + 2 + i
    setStyle(ws, addr(r, 0), styleCell)
    setStyle(ws, addr(r, 1), styleCurrency)
  }
  // Travel Labor row (italic/muted style when present)
  if (scopeTravelLabor > 0) {
    const tlRow = breakdownTop + 2 + rom.ROLES.length
    setStyle(ws, addr(tlRow, 0), styleCellMuted); setStyle(ws, addr(tlRow, 1), { ...styleCurrency, font: { ...styleCell.font, color: { rgb: TEXTMUT } } })
  }
  // Engineering subtotal (offset by 1 if Travel Labor row was inserted)
  let r = breakdownTop + 2 + rom.ROLES.length + (scopeTravelLabor > 0 ? 1 : 0)
  setStyle(ws, addr(r, 0), styleSubRow); setStyle(ws, addr(r, 1), styleSubRowR)
  // Other costs section header
  r += 2
  setStyle(ws, addr(r, 0), styleSection)
  // Travel, Material, Unloaded
  for (let i = 1; i <= 3; i++) {
    const rr = r + i
    setStyle(ws, addr(rr, 0), styleCell); setStyle(ws, addr(rr, 1), styleCurrency)
  }
  setStyle(ws, addr(r + 3, 0), styleSubRow); setStyle(ws, addr(r + 3, 1), styleSubRowR)
  // Overhead section header (account for skipped blank row)
  let ohHeader = r + 5
  setStyle(ws, addr(ohHeader, 0), styleSection)
  // We don't know how many overhead lines exactly without re-counting; just walk and style.
  let rowi = ohHeader + 1
  // overhead detail = scp + (optional global) + govLab + mgmtRsv + scr + totalOverhead
  const overheadCount = 5 + ((oh.globalPct ?? 0) > 0 ? 1 : 0)
  for (let i = 0; i < overheadCount - 1; i++) {
    setStyle(ws, addr(rowi, 0), styleCell); setStyle(ws, addr(rowi, 1), styleCurrency)
    rowi++
  }
  // Total overhead — sub row
  setStyle(ws, addr(rowi, 0), styleSubRow); setStyle(ws, addr(rowi, 1), styleSubRowR)
  rowi += 2
  // Loaded total
  setStyle(ws, addr(rowi, 0), styleGrandRow); setStyle(ws, addr(rowi, 1), styleGrandRowR)

  // Detail tables — header rows in navy
  for (const startRow of [laborTop, travelTop, matTop]) {
    setStyle(ws, addr(startRow, 0), styleSection)        // section title row
    // column-header row right under
    const hdrRow = startRow + 1
    for (let c = 0; c <= 14; c++) setStyle(ws, addr(hdrRow, c), styleColHdr)
  }

  // Column widths sized to the widest table (Travel = 15 cols)
  ws['!cols'] = [
    { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 12 }, { wch: 8  }, { wch: 8  }, { wch: 10 },
    { wch: 8  }, { wch: 8  }, { wch: 10 }, { wch: 8  }, { wch: 14 },
  ]
  // Title rows + hero sub-row span the full width
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
    { s: { r: 8, c: 0 }, e: { r: 8, c: 14 } },
    // Section row in breakdown (DESCRIPTION header colspan handled by single-cell)
  ]
  // Set row heights for hero block
  ws['!rows'] = []
  ws['!rows'][0] = { hpt: 22 }   // title
  ws['!rows'][7] = { hpt: 26 }   // hero

  return ws
}

function buildSummarySheet(XLSX, rom, included) {
  const rows = []
  rows.push(['Cost Estimate — Quote Summary'])
  rows.push([`Generated ${new Date().toLocaleDateString()}`])
  rows.push([])
  pushProjectInfoRows(rows, rom)
  rows.push(['Scopes included',     `${included.length} of ${rom.coas.length}`, '', '', ''])
  rows.push([])
  rows.push(['QUOTE GRAND TOTAL (LOADED)', rom.totalLoadedForQuote])
  rows.push([])
  rows.push(['SCOPE ROLLUP'])
  rows.push(['Scope', 'Labor', 'Travel', 'Material', 'Overhead + SCR', 'Loaded Total'])

  included.forEach(c => {
    const t = rom.coaTotals(c.id)
    rows.push([c.name, t.labor, t.trips, t.mat, t.ohTotal + t.scr, t.totalLoaded])
  })
  const grand = (fn) => included.reduce((s, c) => s + fn(rom.coaTotals(c.id)), 0)
  rows.push([
    'QUOTE GRAND TOTAL',
    grand(t => t.labor), grand(t => t.trips), grand(t => t.mat),
    grand(t => t.ohTotal + t.scr), rom.totalLoadedForQuote,
  ])
  if (rom.coas.length > included.length) {
    rows.push([])
    rows.push(['Excluded scopes:', rom.coas.filter(c => !c.includeInQuote).map(c => c.name).join(', ')])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Styles
  setStyle(ws, addr(0, 0), styleTitle)
  setStyle(ws, addr(1, 0), styleSubtitle)
  for (const r of [3, 4, 5]) {
    setStyle(ws, addr(r, 0), styleProjLabel)
    setStyle(ws, addr(r, 1), styleProjValue)
    setStyle(ws, addr(r, 3), styleProjLabel)
    setStyle(ws, addr(r, 4), styleProjValue)
  }
  setStyle(ws, addr(5, 1), { ...styleProjValue, numFmt: '"$"#,##0' })
  setStyle(ws, addr(7, 0), styleHeroLabel)
  setStyle(ws, addr(7, 1), styleHeroValue)
  setStyle(ws, addr(9, 0), styleSection)
  // Rollup table header
  for (let c = 0; c <= 5; c++) setStyle(ws, addr(10, c), c === 0 ? styleColHdr : styleColHdrR)
  // Rollup rows
  for (let i = 0; i < included.length; i++) {
    const r = 11 + i
    setStyle(ws, addr(r, 0), styleCell)
    for (let c = 1; c <= 5; c++) setStyle(ws, addr(r, c), styleCurrency)
  }
  // Grand total row
  const grandRow = 11 + included.length
  setStyle(ws, addr(grandRow, 0), styleGrandRow)
  for (let c = 1; c <= 5; c++) setStyle(ws, addr(grandRow, c), styleGrandRowR)

  ws['!cols']   = [{ wch: 38 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 16 }]
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 5 } },
  ]
  ws['!rows'] = []
  ws['!rows'][0] = { hpt: 22 }
  ws['!rows'][7] = { hpt: 26 }
  return ws
}

// ── Labor title groups — matches the 1-page PDF cost summary groupings ──
const SUMMARY_LABOR_GROUPS = [
  { title: 'Engineering',        catIds: ['eng1', 'eng2', 'eng3'] },
  { title: 'Programming',        catIds: ['prog1', 'prog2', 'prog3'] },
  { title: 'Project Management', catIds: ['pm1'] },
  { title: 'Project Support',    catIds: ['pm2'] },
  { title: 'Procurement',        catIds: ['proc'] },
  { title: 'Warehouse',          catIds: ['wh'] },
  { title: 'Technician',         catIds: ['tech1', 'tech2', 'tech3'] },
]

function buildScopeSummarySheet(XLSX, rom, scope) {
  const t   = rom.coaTotals(scope.id)

  // Labor hours by title group
  const lines = rom.lineItems.filter(l => l.coaId === scope.id)
  const hoursByCat = {}
  lines.forEach(l => { hoursByCat[l.laborCat] = (hoursByCat[l.laborCat] || 0) + (l.days || 0) * (l.hoursPerDay || 0) })
  const trvHrs = travelHrsByCat(rom, scope.id)
  Object.entries(trvHrs).forEach(([cat, hrs]) => { hoursByCat[cat] = (hoursByCat[cat] || 0) + hrs })
  const totalHrs = SUMMARY_LABOR_GROUPS.reduce((s, g) =>
    s + g.catIds.reduce((ss, id) => ss + (hoursByCat[id] || 0), 0), 0)

  const matUnloaded = rom.materialUnloadedFor(scope.id)
  const shipping    = matUnloaded * (rom.material.shippingPct || 0)
  const odcTotal    = t.trips + matUnloaded + shipping

  // Project info — two-column layout matching PDF
  // Columns A-B = left (Date, leads), Columns D-E = right (Sponsor, Building, Room, City)
  const includes = rom.project?.includeFields || {}
  const ON = k => includes[k] !== false
  const leftPI  = [
    ['date',            'Date'],
    ['projectEngineer', 'Cronos Project Lead'],
    ['govLead',         'Government Project Lead'],
    ['pmSupportLead',   'PM Support Lead'],
  ].filter(([k]) => ON(k)).map(([k, label]) => [label, rom.project?.[k] || ''])
  const rightPI = [
    ['sponsor',  'Sponsor'],
    ['building', 'Building'],
    ['roomName', 'Room'],
    ['cityBase', 'City / Base'],
  ].filter(([k]) => ON(k)).map(([k, label]) => [label, rom.project?.[k] || ''])

  const rows = []
  // Row 0: Title
  rows.push(['Cost Estimate'])
  // Row 1: Scope name
  rows.push([scope.name])
  rows.push([])

  // Project info rows (two-column, A=label B=value  D=label E=value)
  const piStart = rows.length
  const piCount = Math.max(leftPI.length, rightPI.length)
  for (let i = 0; i < piCount; i++) {
    const l = leftPI[i]  || ['', '']
    const r = rightPI[i] || ['', '']
    rows.push([l[0], l[1], '', r[0], r[1]])
  }
  rows.push([]) // spacer after PI

  // Labor section header
  const laborSecRow = rows.length
  rows.push(['Labor'])
  // Column headers
  const laborHdrRow = rows.length
  rows.push(['Title', 'Hours'])
  // Labor group body
  const laborBodyStart = rows.length
  SUMMARY_LABOR_GROUPS.forEach(g => {
    const hrs = g.catIds.reduce((s, id) => s + (hoursByCat[id] || 0), 0)
    rows.push([g.title, Math.round(hrs)])
  })
  // Subtotals
  const totalHrsRow = rows.length
  rows.push(['Total Hours', Math.round(totalHrs)])
  const laborSubRow = rows.length
  rows.push(['Labor Subtotal', t.labor])
  rows.push([]) // spacer

  // ODC section header
  const odcSecRow = rows.length
  rows.push(['ODC'])
  const odcBodyStart = rows.length
  rows.push(['Travel Subtotal', t.trips])
  rows.push(['Material Subtotal', matUnloaded])
  rows.push(['Shipping', shipping])
  const odcSubRow = rows.length
  rows.push(['Total ODC', odcTotal])
  rows.push([]) // spacer

  // Totals (Total Estimate → Contract Fee → Grand Total)
  const totalEstRow = rows.length
  rows.push(['Total Estimate', t.unloaded])
  const contractFeeRow = rows.length
  rows.push(['Contract Fee', t.ohTotal + t.scr])
  const grandRow = rows.length
  rows.push(['Grand Total', t.totalLoaded])

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // ── Style presets for the summary (minimal — matches PDF aesthetics) ──
  const styleBodyLabel  = { font: { name: 'Helvetica', sz: 10, color: { rgb: TEXTDK } } }
  const styleBodyNum    = { font: { name: 'Helvetica', sz: 10, color: { rgb: TEXTDK } }, alignment: { horizontal: 'right' } }
  const styleSubLabel   = { font: { name: 'Helvetica', sz: 10, bold: true, color: { rgb: TEXTDK } }, border: { top: { style: 'medium', color: { rgb: TEXTDK } } } }
  const styleSubNum     = { font: { name: 'Helvetica', sz: 10, bold: true, color: { rgb: TEXTDK } }, alignment: { horizontal: 'right' }, numFmt: '"$"#,##0', border: { top: { style: 'medium', color: { rgb: TEXTDK } } } }
  const styleGrandLabel = { font: { name: 'Helvetica', sz: 12, bold: true, color: { rgb: ACCENT } }, border: { top: { style: 'medium', color: { rgb: ACCENT } }, bottom: { style: 'medium', color: { rgb: ACCENT } }, left: { style: 'medium', color: { rgb: ACCENT } }, right: { style: 'medium', color: { rgb: ACCENT } } } }
  const styleGrandNum   = { font: { name: 'Helvetica', sz: 12, bold: true, color: { rgb: ACCENT } }, alignment: { horizontal: 'right' }, numFmt: '"$"#,##0', border: { top: { style: 'medium', color: { rgb: ACCENT } }, bottom: { style: 'medium', color: { rgb: ACCENT } }, left: { style: 'medium', color: { rgb: ACCENT } }, right: { style: 'medium', color: { rgb: ACCENT } } } }
  const styleSectionHdr = { font: { name: 'Helvetica', sz: 12, bold: true, color: { rgb: TEXTDK } } }
  const styleColHdrSumL = { font: { name: 'Helvetica', sz: 9, bold: true, color: { rgb: TEXTDK } }, border: { bottom: { style: 'medium', color: { rgb: TEXTDK } } } }
  const styleColHdrSumR = { ...styleColHdrSumL, alignment: { horizontal: 'right' } }

  // Title & subtitle
  setStyle(ws, addr(0, 0), styleTitle)
  setStyle(ws, addr(1, 0), styleSubtitle)

  // Project info
  for (let i = 0; i < piCount; i++) {
    const r = piStart + i
    setStyle(ws, addr(r, 0), styleProjLabel); setStyle(ws, addr(r, 1), styleProjValue)
    setStyle(ws, addr(r, 3), styleProjLabel); setStyle(ws, addr(r, 4), styleProjValue)
  }

  // Labor section header, column header, body
  setStyle(ws, addr(laborSecRow, 0), styleSectionHdr)
  setStyle(ws, addr(laborHdrRow, 0), styleColHdrSumL)
  setStyle(ws, addr(laborHdrRow, 1), styleColHdrSumR)
  for (let i = laborBodyStart; i < totalHrsRow; i++) {
    setStyle(ws, addr(i, 0), styleBodyLabel)
    setStyle(ws, addr(i, 1), styleBodyNum)
  }
  setStyle(ws, addr(totalHrsRow, 0), styleSubLabel)
  setStyle(ws, addr(totalHrsRow, 1), { ...styleSubNum, numFmt: '0' })
  setStyle(ws, addr(laborSubRow, 0), styleSubLabel)
  setStyle(ws, addr(laborSubRow, 1), styleSubNum)

  // ODC section header + body
  setStyle(ws, addr(odcSecRow, 0), styleSectionHdr)
  for (let i = odcBodyStart; i < odcSubRow; i++) {
    setStyle(ws, addr(i, 0), { ...styleBodyLabel, font: { ...styleBodyLabel.font, bold: true } })
    setStyle(ws, addr(i, 1), { ...styleBodyNum, numFmt: '"$"#,##0' })
  }
  setStyle(ws, addr(odcSubRow, 0), styleSubLabel)
  setStyle(ws, addr(odcSubRow, 1), styleSubNum)

  // Totals
  setStyle(ws, addr(totalEstRow, 0),   styleSubLabel); setStyle(ws, addr(totalEstRow, 1),   styleSubNum)
  setStyle(ws, addr(contractFeeRow, 0), styleSubLabel); setStyle(ws, addr(contractFeeRow, 1), styleSubNum)
  setStyle(ws, addr(grandRow, 0),      styleGrandLabel); setStyle(ws, addr(grandRow, 1),      styleGrandNum)

  ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 4 }, { wch: 28 }, { wch: 14 }]
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ]
  ws['!rows'] = [{ hpt: 24 }, { hpt: 14 }]
  return ws
}

async function loadLogoForExcelJS() {
  try {
    const resp = await fetch('/logo.png')
    if (!resp.ok) return null
    const ab = await resp.arrayBuffer()
    const bytes = new Uint8Array(ab)
    let binary = ''
    bytes.forEach(b => (binary += String.fromCharCode(b)))
    return btoa(binary)
  } catch { return null }
}

function buildExcelJSSummarySheet(ws, workbook, logoId, rom, scope) {
  const dk  = { argb: 'FF1A2133' }
  const acc = { argb: 'FF1A5FB4' }
  const hdr = { argb: 'FF1A3560' }

  ws.columns = [
    { width: 28 }, { width: 14 }, { width: 4 }, { width: 28 }, { width: 14 },
  ]

  // ── Header rows 1-3: logo left, title right ──
  ws.getRow(1).height = 32
  ws.getRow(2).height = 20
  ws.getRow(3).height = 10

  if (logoId !== null) {
    ws.addImage(logoId, {
      tl: { col: 0.15, row: 0.15 },   // small inset from corner
      ext: { width: 83, height: 60 },
    })
  }

  const titleCell = ws.getCell(1, 4)  // start at col D so title clears the logo
  titleCell.value = 'Cost Estimate'
  titleCell.font  = { name: 'Helvetica', bold: true, size: 20, color: dk }
  ws.mergeCells(1, 4, 1, 5)

  const subCell = ws.getCell(2, 4)
  subCell.value = scope.name || 'Untitled scope'
  subCell.font  = { name: 'Helvetica', size: 10, color: { argb: 'FF4A5A78' } }
  ws.mergeCells(2, 4, 2, 5)

  // Rule line below header
  for (let c = 1; c <= 5; c++) {
    ws.getCell(3, c).border = { bottom: { style: 'medium', color: hdr } }
  }

  // ── Project info (rows 5+, row 4 is blank spacer) ──
  const includes = rom.project?.includeFields || {}
  const ON = k => includes[k] !== false
  const leftPI  = [
    ['date',            'Date'],
    ['projectEngineer', 'Cronos Project Lead'],
    ['govLead',         'Government Project Lead'],
    ['pmSupportLead',   'PM Support Lead'],
  ].filter(([k]) => ON(k)).map(([k, label]) => [label, rom.project?.[k] || ''])
  const rightPI = [
    ['sponsor',  'Sponsor'],
    ['building', 'Building'],
    ['roomName', 'Room'],
    ['cityBase', 'City / Base'],
  ].filter(([k]) => ON(k)).map(([k, label]) => [label, rom.project?.[k] || ''])

  const piStart = 5
  const piCount = Math.max(leftPI.length, rightPI.length)
  for (let i = 0; i < piCount; i++) {
    const r = piStart + i
    ws.getRow(r).height = 14
    const [ll, lv] = leftPI[i]  || ['', '']
    const [rl, rv] = rightPI[i] || ['', '']
    const thin = { style: 'thin', color: hdr }
    ;[[1, ll, true], [2, lv, false]].forEach(([c, val, bold]) => {
      const cell = ws.getCell(r, c)
      cell.value  = val
      cell.font   = { name: 'Helvetica', size: 9, bold, color: dk }
      cell.border = { bottom: thin }
    })
    ;[[4, rl, true], [5, rv, false]].forEach(([c, val, bold]) => {
      const cell = ws.getCell(r, c)
      cell.value  = val
      cell.font   = { name: 'Helvetica', size: 9, bold, color: dk }
      cell.border = { bottom: thin }
    })
  }

  // ── Totals ──
  const t          = rom.coaTotals(scope.id)
  const lines      = rom.lineItems.filter(l => l.coaId === scope.id)
  const hoursByCat = {}
  lines.forEach(l => { hoursByCat[l.laborCat] = (hoursByCat[l.laborCat] || 0) + (l.days || 0) * (l.hoursPerDay || 0) })
  const trvHrs2 = travelHrsByCat(rom, scope.id)
  Object.entries(trvHrs2).forEach(([cat, hrs]) => { hoursByCat[cat] = (hoursByCat[cat] || 0) + hrs })
  const totalHrs    = SUMMARY_LABOR_GROUPS.reduce((s, g) => s + g.catIds.reduce((ss, id) => ss + (hoursByCat[id] || 0), 0), 0)
  const matUnloaded = rom.materialUnloadedFor(scope.id)
  const shipping    = matUnloaded * (rom.material.shippingPct || 0)
  const odcTotal    = t.trips + matUnloaded + shipping
  const dolFmt      = '"$"#,##0'

  let curRow = piStart + piCount + 1 // blank spacer after PI

  function sectionHdr(label) {
    ws.getRow(curRow).height = 16
    const c = ws.getCell(curRow, 1)
    c.value = label
    c.font  = { name: 'Helvetica', size: 11, bold: true, color: dk }
    curRow++
  }

  function colHdr(left, right) {
    ws.getRow(curRow).height = 12
    const lc = ws.getCell(curRow, 1)
    lc.value = left; lc.font = { name: 'Helvetica', size: 8, bold: true, color: dk }
    lc.border = { bottom: { style: 'medium', color: dk } }
    const rc = ws.getCell(curRow, 2)
    rc.value = right; rc.font = { name: 'Helvetica', size: 8, bold: true, color: dk }
    rc.alignment = { horizontal: 'right' }
    rc.border = { bottom: { style: 'medium', color: dk } }
    curRow++
  }

  function dataRow(label, value, opts = {}) {
    ws.getRow(curRow).height = opts.height || 13
    const lc = ws.getCell(curRow, 1)
    lc.value = label
    lc.font  = { name: 'Helvetica', size: opts.sz || 9, bold: !!opts.bold, color: opts.color || dk }
    const rc = ws.getCell(curRow, 2)
    rc.value = value
    rc.font  = { name: 'Helvetica', size: opts.sz || 9, bold: !!opts.bold, color: opts.color || dk }
    rc.alignment = { horizontal: 'right' }
    if (opts.numFmt) rc.numFmt = opts.numFmt
    if (opts.topBorder) {
      lc.border = { top: { style: 'medium', color: opts.topBorder } }
      rc.border = { top: { style: 'medium', color: opts.topBorder } }
    }
    if (opts.allBorder) {
      const b = { top: { style: 'medium', color: opts.allBorder }, bottom: { style: 'medium', color: opts.allBorder }, left: { style: 'medium', color: opts.allBorder }, right: { style: 'medium', color: opts.allBorder } }
      lc.border = b; rc.border = b
    }
    curRow++
  }

  // Labor
  sectionHdr('Labor')
  colHdr('Title', 'Hours')
  SUMMARY_LABOR_GROUPS.forEach(g => {
    const hrs = g.catIds.reduce((s, id) => s + (hoursByCat[id] || 0), 0)
    dataRow(g.title, Math.round(hrs))
  })
  dataRow('Total Hours',    Math.round(totalHrs), { bold: true, topBorder: dk, numFmt: '0' })
  dataRow('Labor Subtotal', t.labor,              { bold: true, topBorder: dk, numFmt: dolFmt })
  curRow++ // spacer

  // ODC
  sectionHdr('ODC')
  dataRow('Travel Subtotal',   t.trips,      { bold: true, numFmt: dolFmt })
  dataRow('Material Subtotal', matUnloaded,  { bold: true, numFmt: dolFmt })
  dataRow('Shipping',          shipping,     { bold: true, numFmt: dolFmt })
  dataRow('Total ODC',         odcTotal,     { bold: true, topBorder: dk, numFmt: dolFmt })
  curRow++ // spacer

  // Final totals
  dataRow('Total Estimate', t.unloaded,           { bold: true, topBorder: dk, numFmt: dolFmt })
  dataRow('Contract Fee',   t.ohTotal + t.scr,    { bold: true, topBorder: dk, numFmt: dolFmt })
  dataRow('Grand Total',    t.totalLoaded,        { bold: true, sz: 11, color: acc, allBorder: acc, numFmt: dolFmt, height: 18 })
}

export async function generateExcelSummary(rom) {
  const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js')
  const workbook = new ExcelJS.Workbook()

  const included = rom.coas.filter(c => c.includeInQuote)
  if (included.length === 0) {
    throw new Error('No scopes are ticked "include in quote". Open the Scopes dropdown and tick at least one.')
  }

  const logoB64 = await loadLogoForExcelJS()
  const logoId  = logoB64 ? workbook.addImage({ base64: logoB64, extension: 'png' }) : null

  const usedNames = new Set()
  for (const scope of included) {
    const ws = workbook.addWorksheet(safeSheetName(scope.name, usedNames))
    buildExcelJSSummarySheet(ws, workbook, logoId, rom, scope)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href       = url
  const sponsor = (rom.project.sponsor || 'Quote').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40)
  const dateStr = new Date().toISOString().slice(0, 10)
  a.download   = `ROM_${sponsor}_CostSummary_${dateStr}.xlsx`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 0)
}

export async function generateExcel(rom) {
  // xlsx-js-style is a fork of SheetJS that actually writes cell styles
  const XLSX = await import('xlsx-js-style')
  const wb   = XLSX.utils.book_new()

  const included = rom.coas.filter(c => c.includeInQuote)
  if (included.length === 0) {
    throw new Error('No scopes are ticked "include in quote". Open the Scopes dropdown and tick at least one.')
  }

  XLSX.utils.book_append_sheet(wb, buildSummarySheet(XLSX, rom, included), 'Summary')

  const usedNames = new Set(['summary'])
  included.forEach(scope => {
    const sheetName = safeSheetName(scope.name, usedNames)
    XLSX.utils.book_append_sheet(wb, buildScopeSheet(XLSX, rom, scope), sheetName)
  })

  const sponsor = (rom.project.sponsor || 'Quote').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40)
  const dateStr = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `ROM_${sponsor}_${dateStr}.xlsx`)
}
