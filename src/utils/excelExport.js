/**
 * ROM Tool — Excel Export
 * Uses SheetJS (xlsx) loaded dynamically.
 * Produces a multi-sheet workbook:
 *   1. Summary       — project info + full cost breakdown
 *   2. Engineering   — line-item detail with hours, rate, cost
 *   3. Travel        — trip detail per entity
 *   4. Material      — BOM + shipping
 */

function fmt(n) { return Math.round(n || 0) }
function pct(v) { return ((v || 0) * 100).toFixed(2) + '%' }
function dollar(n) { return '$' + Math.round(n || 0).toLocaleString() }

function headerRow(cells) {
  return cells.map(v => ({ v, t: 's', s: { font: { bold: true } } }))
}

export async function generateExcel(rom) {
  const XLSX = await import('xlsx')
  const wb   = XLSX.utils.book_new()

  // ── 1. SUMMARY SHEET ────────────────────────────────────────────────
  const summaryData = [
    ['ROM Tool — Cost Estimate', '', '', ''],
    [],
    ['Customer / Sponsor', rom.project.sponsor        || ''],
    ['Project / Room',     rom.project.roomName        || ''],
    ['Project Engineer',   rom.project.projectEngineer || ''],
    ['Template',           rom.project.templateName    || ''],
    ['Date',               rom.project.date            || ''],
    ['FY Funds',           fmt(rom.project.anticipatedFYFunds)],
    [],
    ['COST BREAKDOWN',     '', 'Amount', ''],
    // Engineering
    ['Engineering Labor'],
    ...rom.ROLES.map(r => ['  ' + r.label, '', fmt(rom.roleCost(r.id, null))]),
    ['Engineering Subtotal', '', fmt(rom.engineeringTotal)],
    [],
    // Other
    ['Other Costs'],
    ['  Travel', '',              fmt(rom.travelTotal)],
    ['  Material & Shipping', '', fmt(rom.materialTotal)],
    ['Unloaded Total', '',        fmt(rom.unloadedProjectTotal)],
    [],
    // Overhead
    ['Overhead & Rates'],
    ['  ' + rom.overhead.scpLabel,      '', fmt(rom.scpCost)],
    ...(rom.overhead.globalPct > 0
      ? [['  ' + rom.overhead.globalLabel, '', fmt(rom.globalCost)]]
      : []),
    ['  ' + rom.overhead.govLaborLabel, '', fmt(rom.govLaborCost)],
    ['  Management Reserve',            '', fmt(rom.managementReserveCost)],
    ['  Support Cost Rate (' + pct(rom.overhead.scrPct) + ')', '', fmt(rom.scrCost)],
    ['Total Overhead', '', fmt(rom.totalOverhead)],
    [],
    ['GRAND TOTAL (LOADED)', '', fmt(rom.totalLoadedCost)],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  // Column widths
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 20 }, { wch: 18 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // ── 2. ENGINEERING DETAIL SHEET ─────────────────────────────────────
  const engHeader = [
    'Entity', 'Phase', 'Role', 'Task', 'Labor Cat',
    'Days', 'Hrs/Day', 'Total Hrs', 'Rate ($/hr)', 'Cost ($)',
  ]
  const engRows = rom.lineItems.map(l => {
    const entity = rom.ENTITIES.find(e => e.id === l.entity)
    const phase  = rom.LIFECYCLE_PHASES.find(p => p.id === l.phaseId)
    const role   = rom.ROLES.find(r => r.id === l.role)
    const cat    = rom.LABOR_CATS.find(c => c.id === l.laborCat)
    const hours  = rom.lineHours(l)
    const cost   = rom.lineCost(l)
    return [
      entity?.label ?? l.entity,
      phase?.label  ?? l.phaseId,
      role?.label   ?? l.role,
      l.taskId || '',
      cat?.label    ?? l.laborCat,
      l.days        ?? 0,
      l.hoursPerDay ?? 0,
      fmt(hours),
      fmt(l.rate || 0),
      fmt(cost),
    ]
  })
  // Totals row
  engRows.push([
    'TOTAL', '', '', '', '',
    '', '',
    fmt(rom.engineeringHours),
    '',
    fmt(rom.engineeringTotal),
  ])

  const wsEng = XLSX.utils.aoa_to_sheet([engHeader, ...engRows])
  wsEng['!cols'] = [
    { wch: 14 }, { wch: 26 }, { wch: 20 }, { wch: 28 }, { wch: 12 },
    { wch: 6  }, { wch: 8  }, { wch: 10 }, { wch: 12 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, wsEng, 'Engineering Detail')

  // ── 3. TRAVEL SHEET ─────────────────────────────────────────────────
  const travelHeader = [
    'Entity', 'Traveler / Role', 'Destination', 'State', 'Month',
    'Days', 'Persons', 'Travel Hrs/Person', 'Total Travel Hrs',
    'Lodging Rate', 'MIE Rate',
    'Hotel', 'Rental Car', 'Airfare', 'Baggage/Person', 'Other Fees',
    'Trip Total ($)',
  ]
  const travelRows = []
  rom.visibleEntities.forEach(entity => {
    const trips = rom.travel[entity.id] ?? []
    trips.forEach(t => {
      travelRows.push([
        entity.label,
        t.travelerName || '',
        t.destination  || '',
        t.state        || '',
        t.travelMonth  || '',
        t.days         || 0,
        t.persons      || 1,
        t.travelHours  || 0,
        fmt((t.travelHours || 0) * (t.persons || 1)),
        fmt(t.lodgingRate  || 0),
        fmt(t.mieRate      || 0),
        t.hotel     ? 'Yes' : 'No',
        t.rentalCar ? 'Yes' : 'No',
        t.airfare   ? 'Yes' : 'No',
        fmt(t.baggageFees  || 0),
        fmt(t.otherFees    || 0),
        fmt(rom.tripCost(t)),
      ])
    })
  })
  travelRows.push([
    'TOTAL', '', '', '', '', '', '', '', '', '', '',
    '', '', '', '', '',
    fmt(rom.travelTotal),
  ])
  const wsTravel = XLSX.utils.aoa_to_sheet([travelHeader, ...travelRows])
  wsTravel['!cols'] = [
    { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 7 }, { wch: 8 },
    { wch: 6  }, { wch: 8  }, { wch: 18 }, { wch: 16 },
    { wch: 13 }, { wch: 11 },
    { wch: 8  }, { wch: 10 }, { wch: 8  }, { wch: 15 }, { wch: 12 },
    { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsTravel, 'Travel')

  // ── 4. MATERIAL SHEET ───────────────────────────────────────────────
  const matHeader = ['Description', 'Qty', 'Unit Cost ($)', 'Extended ($)']
  const matRows = rom.material.items.map(i => [
    i.description || '',
    i.qty         || 0,
    fmt(i.unitCost || 0),
    fmt((i.qty || 0) * (i.unitCost || 0)),
  ])
  const hwSubtotal = rom.material.items.reduce((s, i) => s + (i.qty || 0) * (i.unitCost || 0), 0)
  const shippingAmt = hwSubtotal * (rom.material.shippingPct || 0)
  matRows.push(
    ['Hardware Subtotal', '', '', fmt(hwSubtotal)],
    [`Shipping (${pct(rom.material.shippingPct)})`, '', '', fmt(shippingAmt)],
    ['Material Total', '', '', fmt(rom.materialTotal)],
  )
  const wsMat = XLSX.utils.aoa_to_sheet([matHeader, ...matRows])
  wsMat['!cols'] = [{ wch: 40 }, { wch: 8 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsMat, 'Material')

  // ── Save ────────────────────────────────────────────────────────────
  const sponsor  = (rom.project.sponsor  || 'ROM').replace(/[^a-z0-9]/gi, '_')
  const room     = (rom.project.roomName || '').replace(/[^a-z0-9]/gi, '_')
  const datePart = (rom.project.date     || new Date().toISOString().split('T')[0]).replace(/-/g, '')
  const filename = `ROM_${sponsor}${room ? '_' + room : ''}_${datePart}.xlsx`

  XLSX.writeFile(wb, filename)
}
