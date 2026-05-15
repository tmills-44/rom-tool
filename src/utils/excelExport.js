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

function fmt(n)    { return Math.round(n || 0) }
function pct(v)    { return ((v || 0) * 100).toFixed(2) + '%' }
function dollar(n) { return '$' + Math.round(n || 0).toLocaleString() }

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
  rows.push(['Customer / Sponsor', rom.project.sponsor         || '', '', 'Project / Room', rom.project.roomName       || ''])
  rows.push(['Project Lead',       rom.project.projectEngineer || '', '', 'Date',           rom.project.date           || ''])
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
  rows.push(['Engineering Subtotal', t.labor])
  rows.push([])
  rows.push(['OTHER COSTS'])
  rows.push(['Travel',              t.trips])
  rows.push(['Material & Shipping', t.mat])
  rows.push(['Unloaded Total',      t.unloaded])
  rows.push([])
  rows.push(['OVERHEAD & RATES'])
  rows.push([oh.scpLabel || 'SCP', t.scp])
  if ((oh.globalPct ?? 0) > 0) rows.push([oh.globalLabel || 'Global', t.glob])
  rows.push([oh.govLaborLabel || 'Gov Labor', t.govLab])
  rows.push(['Management Reserve', t.mgmtRsv])
  rows.push([`Support Cost Rate (${pct(oh.scrPct)})`, t.scr])
  rows.push(['Total Overhead', t.ohTotal + t.scr])
  rows.push([])
  rows.push(['LOADED TOTAL', t.totalLoaded])
  rows.push([])
  rows.push([])

  // Labor detail
  const laborTop = rows.length
  rows.push(['LABOR DETAIL'])
  rows.push(['Entity', 'Phase', 'Role', 'Task', 'Labor Cat', 'Days', 'Hrs/Day', 'Total Hrs', 'Rate ($/hr)', 'Cost ($)'])
  rom.lineItems.filter(l => l.coaId === scope.id).forEach(l => {
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
  rom.ENTITIES.forEach(e => {
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
  // Engineering subtotal
  let r = breakdownTop + 2 + rom.ROLES.length
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
  rows.push(['Customer / Sponsor',  rom.project.sponsor         || '', '', 'Project / Room', rom.project.roomName       || ''])
  rows.push(['Project Lead',        rom.project.projectEngineer || '', '', 'Date',           rom.project.date           || ''])
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
