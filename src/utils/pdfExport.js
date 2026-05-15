/**
 * ROM Tool — PDF Export
 * Uses jsPDF + jsPDF-AutoTable (loaded dynamically to avoid SSR/build issues)
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

export async function generatePDF(rom) {
  const { jsPDF }               = await import('jspdf')
  const { default: autoTable }  = await import('jspdf-autotable')

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const W      = doc.internal.pageSize.getWidth()
  const margin = 40
  const inner  = W - margin * 2

  // helper — wraps autoTable and returns finalY
  function table(opts) {
    autoTable(doc, opts)
    return doc.lastAutoTable.finalY
  }

  // ── Logo ────────────────────────────────────────────────────────────
  const logoData    = await loadImage('/logo.png')
  let headerBottom  = margin

  if (logoData) {
    const logoW = 110
    const logoH = Math.round(logoW * (210 / 290))
    doc.addImage(logoData, 'PNG', margin, margin, logoW, logoH)
    headerBottom = margin + logoH
  }

  // ── Title (right-aligned) ───────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...NAVY)
  doc.text('ROUGH ORDER OF MAGNITUDE', W - margin, margin + 22, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text('Cost Estimate · C4NAV', W - margin, margin + 38, { align: 'right' })

  // ── Navy rule ───────────────────────────────────────────────────────
  let y = Math.max(headerBottom, margin + 50) + 10
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, inner, 2, 'F')
  y += 12

  // ── Project info ────────────────────────────────────────────────────
  const infoRows = [
    ['Customer / Sponsor', rom.project.sponsor         || '—', 'Project / Room', rom.project.roomName             || '—'],
    ['Project Engineer',   rom.project.projectEngineer || '—', 'Date',           rom.project.date                 || '—'],
    ['Template',           rom.project.templateName    || '—', 'FY Funds',       fmt(rom.project.anticipatedFYFunds)],
  ]

  y = table({
    startY: y,
    body: infoRows,
    margin: { left: margin, right: margin },
    tableWidth: inner,
    styles:       { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 } },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: MUTED, cellWidth: 110 },
      1: { textColor: TEXT,   cellWidth: inner / 2 - 110 },
      2: { fontStyle: 'bold', textColor: MUTED, cellWidth: 110 },
      3: { textColor: TEXT },
    },
    theme: 'plain',
  }) + 14

  // ── Grand Total hero box ────────────────────────────────────────────
  const boxH = 48
  doc.setFillColor(...LTBLUE)
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(1.5)
  doc.roundedRect(margin, y, inner, boxH, 5, 5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...NAVY)
  doc.text('GRAND TOTAL (LOADED)', margin + 14, y + 18)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(
    `Engineering ${fmt(rom.engineeringTotal)}   ·   Travel ${fmt(rom.travelTotal)}   ·   Material ${fmt(rom.materialTotal)}   ·   Overhead ${fmt(rom.totalOverhead)}`,
    margin + 14, y + 33
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...ACCENT)
  doc.text(fmt(rom.totalLoadedCost), W - margin - 14, y + 30, { align: 'right' })
  y += boxH + 18

  // ── Full cost breakdown ─────────────────────────────────────────────
  const sec   = (t) => ({ content: t, colSpan: 2, styles: { fillColor: NAVY,   textColor: WHITE,  fontStyle: 'bold', fontSize: 8 } })
  const sub   = (t) => ({ content: t,             styles: { fillColor: LTBLUE, textColor: NAVY,   fontStyle: 'bold' } })
  const grand = (t) => ({ content: t,             styles: { fillColor: NAVY,   textColor: WHITE,  fontStyle: 'bold', fontSize: 11 } })

  const breakdownBody = [
    [ sec('Engineering Labor') ],
    ...rom.ROLES.map(r => [r.label, fmt(rom.roleCost(r.id, null))]),
    [ sub('Engineering Subtotal'), sub(fmt(rom.engineeringTotal)) ],

    [ sec('Other Costs') ],
    ['Travel',              fmt(rom.travelTotal)],
    ['Material & Shipping', fmt(rom.materialTotal)],
    [ sub('Unloaded Total'), sub(fmt(rom.unloadedProjectTotal)) ],

    [ sec('Overhead & Rates') ],
    [rom.overhead.scpLabel,      fmt(rom.scpCost)],
    ...(rom.overhead.globalPct > 0 ? [[rom.overhead.globalLabel, fmt(rom.globalCost)]] : []),
    [rom.overhead.govLaborLabel, fmt(rom.govLaborCost)],
    ['Management Reserve',       fmt(rom.managementReserveCost)],
    [`Support Cost Rate (${pct(rom.overhead.scrPct)})`, fmt(rom.scrCost)],
    [ sub('Total Overhead'), sub(fmt(rom.totalOverhead)) ],

    [ grand('GRAND TOTAL (LOADED)'), grand(fmt(rom.totalLoadedCost)) ],
  ]

  table({
    startY: y,
    head: [['Description', 'Amount']],
    body:  breakdownBody,
    margin: { left: margin, right: margin },
    tableWidth: inner,
    headStyles:         { fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold' },
    columnStyles:       { 0: { cellWidth: inner * 0.72 }, 1: { cellWidth: inner * 0.28, halign: 'right', fontStyle: 'bold' } },
    bodyStyles:         { fontSize: 9, textColor: TEXT },
    alternateRowStyles: { fillColor: GRAY },
    styles:             { cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
    didParseCell(data) {
      if (data.row.raw?.length === 1) data.cell.styles.fillColor = NAVY
    },
  })

  // ── Page 2: Engineering Detail ──────────────────────────────────────
  doc.addPage()
  y = margin

  if (logoData) doc.addImage(logoData, 'PNG', margin, y, 70, Math.round(70 * 210 / 290))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...NAVY)
  doc.text('Engineering Detail', W - margin, y + 18, { align: 'right' })
  doc.setFillColor(...NAVY)
  doc.rect(margin, y + 30, inner, 1.5, 'F')
  y += 46

  // By Entity × Role
  if (rom.visibleEntities.length > 0) {
    y = table({
      startY: y,
      head: [['Role', ...rom.visibleEntities.map(e => e.label), 'Total']],
      body: [
        ...rom.ROLES.map(r => [
          r.label,
          ...rom.visibleEntities.map(e => fmt(rom.roleCost(r.id, e.id))),
          fmt(rom.roleCost(r.id, null)),
        ]),
        [
          { content: 'Total', styles: { fontStyle: 'bold' } },
          ...rom.visibleEntities.map(e => ({ content: fmt(rom.entityCost(e.id)), styles: { fontStyle: 'bold' } })),
          { content: fmt(rom.engineeringTotal), styles: { fontStyle: 'bold', textColor: ACCENT } },
        ],
      ],
      margin: { left: margin, right: margin },
      tableWidth: inner,
      headStyles:         { fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold' },
      bodyStyles:         { fontSize: 9, textColor: TEXT },
      alternateRowStyles: { fillColor: GRAY },
      styles:             { cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
      columnStyles:       { 0: { cellWidth: 140 } },
    }) + 20
  }

  // By Phase × Role
  const phaseRows = rom.LIFECYCLE_PHASES
    .map(ph => {
      const total = rom.ROLES.reduce((s, r) => s + rom.phaseCost(r.id, ph.id, null), 0)
      if (!total) return null
      return [ph.label, ...rom.ROLES.map(r => fmt(rom.phaseCost(r.id, ph.id, null))), fmt(total)]
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
          ...rom.ROLES.map(r => ({ content: fmt(rom.roleCost(r.id, null)), styles: { fontStyle: 'bold' } })),
          { content: fmt(rom.engineeringTotal), styles: { fontStyle: 'bold', textColor: ACCENT } },
        ],
      ],
      margin: { left: margin, right: margin },
      tableWidth: inner,
      headStyles:         { fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold' },
      bodyStyles:         { fontSize: 9, textColor: TEXT },
      alternateRowStyles: { fillColor: GRAY },
      styles:             { cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
      columnStyles:       { 0: { cellWidth: 160 } },
    })
  }

  // ── Footer on every page ────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  const footerY   = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.5)
    doc.line(margin, footerY - 28, W - margin, footerY - 28)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(
      `${rom.project.sponsor || 'ROM Tool'} · Generated ${new Date().toLocaleDateString()}`,
      margin, footerY - 16
    )
    doc.text(`Page ${i} of ${pageCount}`, W - margin, footerY - 16, { align: 'right' })
  }

  // ── Save ────────────────────────────────────────────────────────────
  const sponsor  = (rom.project.sponsor  || 'ROM').replace(/[^a-z0-9]/gi, '_')
  const room     = (rom.project.roomName || '').replace(/[^a-z0-9]/gi, '_')
  const datePart = (rom.project.date     || new Date().toISOString().split('T')[0]).replace(/-/g, '')
  doc.save(`ROM_${sponsor}${room ? '_' + room : ''}_${datePart}.pdf`)
}
