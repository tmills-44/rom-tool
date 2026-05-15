/**
 * ROM Tool — PDF Export (scope-aware)
 *
 * Public entry: generatePDF(rom, { mode })
 *   mode = 'separate' → one PDF file downloaded per included scope
 *   mode = 'combined' → one PDF with each scope as its own section, separated by page breaks
 *   (default: 'separate')
 *
 * Only scopes ticked "Include in quote" are emitted.
 */

const NAVY   = [26,  53,  96]
const ACCENT = [26,  95, 180]
const LTBLUE = [232, 240, 254]
const WHITE  = [255, 255, 255]
const GRAY   = [245, 247, 251]
const MUTED  = [74,  90, 120]
const TEXT   = [26,  33,  51]

function fmt(n) { return n ? '$' + Math.round(n).toLocaleString() : '$0' }
function pct(v) { return ((v || 0) * 100).toFixed(0) + '%' }

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = src + '?v=' + Date.now()
  })
}

// ── Render one scope's worth of pages into the supplied doc ──────────────
function renderScopePages({ doc, rom, scope, autoTable, logoData, isFirstInDoc }) {
  const t        = rom.coaTotals(scope.id)
  const oh       = rom.overheadByCoa[scope.id] || {}
  const W        = doc.internal.pageSize.getWidth()
  const margin   = 40
  const inner    = W - margin * 2

  function table(opts) { autoTable(doc, opts); return doc.lastAutoTable.finalY }

  // Page break before this scope when we're appending to an existing doc
  if (!isFirstInDoc) doc.addPage()
  let y = margin

  // Logo
  let headerBottom = margin
  if (logoData) {
    const logoW = 110
    const logoH = Math.round(logoW * (210 / 290))
    doc.addImage(logoData, 'PNG', margin, margin, logoW, logoH)
    headerBottom = margin + logoH
  }

  // Title — scope name appears prominently so combined PDFs are scannable
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...NAVY)
  doc.text('ROUGH ORDER OF MAGNITUDE', W - margin, margin + 22, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text(scope.name, W - margin, margin + 38, { align: 'right' })

  y = Math.max(headerBottom, margin + 50) + 10
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, inner, 2, 'F')
  y += 12

  // Project info
  const infoRows = [
    ['Customer / Sponsor', rom.project.sponsor         || '—', 'Project / Room', rom.project.roomName             || '—'],
    ['Project Lead',       rom.project.projectEngineer || '—', 'Date',           rom.project.date                 || '—'],
    ['Scope',              scope.name,                          'FY Funds',       fmt(rom.project.anticipatedFYFunds)],
  ]
  y = table({
    startY: y, body: infoRows,
    margin: { left: margin, right: margin }, tableWidth: inner,
    styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 } },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: MUTED, cellWidth: 110 },
      1: { textColor: TEXT,   cellWidth: inner / 2 - 110 },
      2: { fontStyle: 'bold', textColor: MUTED, cellWidth: 110 },
      3: { textColor: TEXT },
    },
    theme: 'plain',
  }) + 14

  // Hero box — loaded total
  const boxH = 48
  doc.setFillColor(...LTBLUE)
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(1.5)
  doc.roundedRect(margin, y, inner, boxH, 5, 5, 'FD')

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NAVY)
  doc.text('LOADED TOTAL · ' + scope.name.toUpperCase(), margin + 14, y + 18)

  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
  doc.text(
    `Labor ${fmt(t.labor)}   ·   Travel ${fmt(t.trips)}   ·   Material ${fmt(t.mat)}   ·   Overhead ${fmt(t.ohTotal + t.scr)}`,
    margin + 14, y + 33
  )

  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...ACCENT)
  doc.text(fmt(t.totalLoaded), W - margin - 14, y + 30, { align: 'right' })
  y += boxH + 18

  // Full cost breakdown
  const sec   = (s) => ({ content: s, colSpan: 2, styles: { fillColor: NAVY,   textColor: WHITE,  fontStyle: 'bold', fontSize: 8 } })
  const sub   = (s) => ({ content: s,             styles: { fillColor: LTBLUE, textColor: NAVY,   fontStyle: 'bold' } })
  const grand = (s) => ({ content: s,             styles: { fillColor: NAVY,   textColor: WHITE,  fontStyle: 'bold', fontSize: 11 } })

  const breakdownBody = [
    [ sec('Engineering Labor') ],
    ...rom.ROLES.map(r => [r.label, fmt(rom.roleCostForCoa(r.id, null, scope.id))]),
    [ sub('Engineering Subtotal'), sub(fmt(t.labor)) ],

    [ sec('Other Costs') ],
    ['Travel',              fmt(t.trips)],
    ['Material & Shipping', fmt(t.mat)],
    [ sub('Unloaded Total'), sub(fmt(t.unloaded)) ],

    [ sec('Overhead & Rates') ],
    [oh.scpLabel || 'SCP',  fmt(t.scp)],
    ...((oh.globalPct ?? 0) > 0 ? [[oh.globalLabel || 'Global', fmt(t.glob)]] : []),
    [oh.govLaborLabel || 'Gov Labor', fmt(t.govLab)],
    ['Management Reserve',  fmt(t.mgmtRsv)],
    [`Support Cost Rate (${pct(oh.scrPct)})`, fmt(t.scr)],
    [ sub('Total Overhead'), sub(fmt(t.ohTotal + t.scr)) ],

    [ grand('LOADED TOTAL'), grand(fmt(t.totalLoaded)) ],
  ]

  table({
    startY: y, head: [['Description', 'Amount']], body: breakdownBody,
    margin: { left: margin, right: margin }, tableWidth: inner,
    headStyles:         { fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold' },
    columnStyles:       { 0: { cellWidth: inner * 0.72 }, 1: { cellWidth: inner * 0.28, halign: 'right', fontStyle: 'bold' } },
    bodyStyles:         { fontSize: 9, textColor: TEXT },
    alternateRowStyles: { fillColor: GRAY },
    styles:             { cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
    didParseCell(data) {
      if (data.row.raw?.length === 1) data.cell.styles.fillColor = NAVY
    },
  })

  // Engineering detail page
  doc.addPage()
  y = margin
  if (logoData) doc.addImage(logoData, 'PNG', margin, y, 70, Math.round(70 * 210 / 290))
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...NAVY)
  doc.text(`${scope.name} — Engineering Detail`, W - margin, y + 18, { align: 'right' })
  doc.setFillColor(...NAVY); doc.rect(margin, y + 30, inner, 1.5, 'F')
  y += 46

  if (rom.visibleEntities.length > 0) {
    y = table({
      startY: y,
      head: [['Role', ...rom.visibleEntities.map(e => e.label), 'Total']],
      body: [
        ...rom.ROLES.map(r => [
          r.label,
          ...rom.visibleEntities.map(e => fmt(rom.roleCostForCoa(r.id, e.id, scope.id))),
          fmt(rom.roleCostForCoa(r.id, null, scope.id)),
        ]),
        [
          { content: 'Total', styles: { fontStyle: 'bold' } },
          ...rom.visibleEntities.map(e => ({ content: fmt(rom.entityCostForCoa(e.id, scope.id)), styles: { fontStyle: 'bold' } })),
          { content: fmt(t.labor), styles: { fontStyle: 'bold', textColor: ACCENT } },
        ],
      ],
      margin: { left: margin, right: margin }, tableWidth: inner,
      headStyles:         { fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold' },
      bodyStyles:         { fontSize: 9, textColor: TEXT },
      alternateRowStyles: { fillColor: GRAY },
      styles:             { cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
      columnStyles:       { 0: { cellWidth: 140 } },
    }) + 20
  }

  const phaseRows = rom.LIFECYCLE_PHASES
    .map(ph => {
      const total = rom.ROLES.reduce((s, r) => s + rom.phaseCostForCoa(r.id, ph.id, null, scope.id), 0)
      if (!total) return null
      return [ph.label, ...rom.ROLES.map(r => fmt(rom.phaseCostForCoa(r.id, ph.id, null, scope.id))), fmt(total)]
    })
    .filter(Boolean)

  if (phaseRows.length) {
    table({
      startY: y,
      head: [['Phase', ...rom.ROLES.map(r => r.label.split(' ')[0]), 'Total']],
      body: [
        ...phaseRows,
        [
          { content: 'Total', styles: { fontStyle: 'bold' } },
          ...rom.ROLES.map(r => ({ content: fmt(rom.roleCostForCoa(r.id, null, scope.id)), styles: { fontStyle: 'bold' } })),
          { content: fmt(t.labor), styles: { fontStyle: 'bold', textColor: ACCENT } },
        ],
      ],
      margin: { left: margin, right: margin }, tableWidth: inner,
      headStyles:         { fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold' },
      bodyStyles:         { fontSize: 9, textColor: TEXT },
      alternateRowStyles: { fillColor: GRAY },
      styles:             { cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
      columnStyles:       { 0: { cellWidth: 160 } },
    })
  }
}

// ── Quote rollup page — sits at the end of a combined PDF ─────────────────
function renderQuoteRollup({ doc, rom, autoTable, logoData, included }) {
  doc.addPage()
  const W      = doc.internal.pageSize.getWidth()
  const margin = 40
  const inner  = W - margin * 2
  let y        = margin

  function table(opts) { autoTable(doc, opts); return doc.lastAutoTable.finalY }

  if (logoData) doc.addImage(logoData, 'PNG', margin, y, 110, Math.round(110 * 210 / 290))
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...NAVY)
  doc.text('QUOTE ROLLUP', W - margin, margin + 22, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...MUTED)
  doc.text(`${included.length} scope${included.length === 1 ? '' : 's'} included`, W - margin, margin + 38, { align: 'right' })

  y = margin + 90
  doc.setFillColor(...NAVY); doc.rect(margin, y - 12, inner, 2, 'F')

  const rollupRows = included.map(c => {
    const t = rom.coaTotals(c.id)
    return [c.name, fmt(t.labor), fmt(t.trips), fmt(t.mat), fmt(t.ohTotal + t.scr), fmt(t.totalLoaded)]
  })
  const sum = (fn) => included.reduce((s, c) => s + fn(rom.coaTotals(c.id)), 0)
  rollupRows.push([
    { content: 'QUOTE GRAND TOTAL', styles: { fontStyle: 'bold', fillColor: NAVY, textColor: WHITE } },
    { content: fmt(sum(t => t.labor)),                 styles: { fontStyle: 'bold', fillColor: NAVY, textColor: WHITE } },
    { content: fmt(sum(t => t.trips)),                 styles: { fontStyle: 'bold', fillColor: NAVY, textColor: WHITE } },
    { content: fmt(sum(t => t.mat)),                   styles: { fontStyle: 'bold', fillColor: NAVY, textColor: WHITE } },
    { content: fmt(sum(t => t.ohTotal + t.scr)),       styles: { fontStyle: 'bold', fillColor: NAVY, textColor: WHITE } },
    { content: fmt(rom.totalLoadedForQuote),           styles: { fontStyle: 'bold', fillColor: NAVY, textColor: WHITE } },
  ])

  table({
    startY: y, head: [['Scope', 'Labor', 'Travel', 'Material', 'Overhead', 'Loaded Total']], body: rollupRows,
    margin: { left: margin, right: margin }, tableWidth: inner,
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: TEXT },
    alternateRowStyles: { fillColor: GRAY },
    styles: { cellPadding: { top: 5, bottom: 5, left: 6, right: 6 } },
    columnStyles: { 0: { cellWidth: 180 } },
  })
}

// ── Add the footer to every page of a finished doc ───────────────────────
function applyFooter(doc, rom) {
  const W = doc.internal.pageSize.getWidth()
  const margin = 40
  const footerY = doc.internal.pageSize.getHeight()
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.5)
    doc.line(margin, footerY - 28, W - margin, footerY - 28)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED)
    doc.text(
      `${rom.project.sponsor || 'ROM Tool'} · Generated ${new Date().toLocaleDateString()}`,
      margin, footerY - 16
    )
    doc.text(`Page ${i} of ${pageCount}`, W - margin, footerY - 16, { align: 'right' })
  }
}

function fileName(rom, scope) {
  const sponsor  = (rom.project.sponsor  || 'ROM').replace(/[^a-z0-9]/gi, '_').slice(0, 30)
  const scopePt  = scope ? '_' + (scope.name || 'Scope').replace(/[^a-z0-9]/gi, '_').slice(0, 30) : ''
  const datePart = (rom.project.date || new Date().toISOString().split('T')[0]).replace(/-/g, '')
  return `ROM_${sponsor}${scopePt}_${datePart}.pdf`
}

// ── Public entry ─────────────────────────────────────────────────────────
export async function generatePDF(rom, options = {}) {
  const mode = options.mode === 'combined' ? 'combined' : 'separate'

  const { jsPDF }              = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const included = rom.coas.filter(c => c.includeInQuote)
  if (included.length === 0) {
    throw new Error('No scopes are ticked "include in quote". Open the Scopes dropdown and tick at least one.')
  }

  const logoData = await loadImage('/logo.png')

  if (mode === 'separate') {
    // One PDF per scope
    for (const scope of included) {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
      renderScopePages({ doc, rom, scope, autoTable, logoData, isFirstInDoc: true })
      applyFooter(doc, rom)
      doc.save(fileName(rom, scope))
    }
    return
  }

  // Combined mode — one doc, scope sections + final rollup
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  included.forEach((scope, idx) => {
    renderScopePages({ doc, rom, scope, autoTable, logoData, isFirstInDoc: idx === 0 })
  })
  if (included.length > 1) {
    renderQuoteRollup({ doc, rom, autoTable, logoData, included })
  }
  applyFooter(doc, rom)
  doc.save(fileName(rom))
}
