/**
 * ROM Tool — Word Export
 *
 * Builds a styled HTML document and serves it as application/msword. Word
 * opens HTML-as-doc files natively, picks up the styling, and saves to .docx
 * cleanly. Avoids a heavy docx-generation dependency.
 *
 * Layout mirrors the PDF: title bar, project info, hero loaded-total, then
 * a per-scope breakdown table plus labor / travel / material detail tables.
 */

function fmt(n)    { return Math.round(n || 0) }
function pct(v)    { return ((v || 0) * 100).toFixed(0) + '%' }
function dollar(n) { return '$' + Math.round(n || 0).toLocaleString() }
function esc(s)    {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function buildScopeHTML(rom, scope) {
  const t  = rom.coaTotals(scope.id)
  const oh = rom.overheadByCoa?.[scope.id] || {}

  const projInfo = `
    <table class="kv">
      <tr><td class="kv-l">Customer / Sponsor</td><td>${esc(rom.project.sponsor || '—')}</td>
          <td class="kv-l">Project / Room</td><td>${esc(rom.project.roomName || '—')}</td></tr>
      <tr><td class="kv-l">Project Lead</td><td>${esc(rom.project.projectEngineer || '—')}</td>
          <td class="kv-l">Date</td><td>${esc(rom.project.date || '—')}</td></tr>
      <tr><td class="kv-l">Scope</td><td>${esc(scope.name)}</td>
          <td class="kv-l">FY Funds</td><td>${dollar(rom.project.anticipatedFYFunds)}</td></tr>
    </table>`

  const hero = `
    <table class="hero"><tr>
      <td class="hero-label">LOADED TOTAL · ${esc(scope.name)}</td>
      <td class="hero-value">${dollar(t.totalLoaded)}</td>
    </tr><tr>
      <td colspan="2" class="hero-sub">
        Labor ${dollar(t.labor)} &nbsp;·&nbsp; Travel ${dollar(t.trips)} &nbsp;·&nbsp;
        Material ${dollar(t.mat)} &nbsp;·&nbsp; Overhead ${dollar(t.ohTotal + t.scr)}
      </td>
    </tr></table>`

  // Cost breakdown
  const roleRows = rom.ROLES.map(r => `
    <tr><td>${esc(r.label)}</td><td class="amt">${dollar(rom.roleCostForCoa(r.id, null, scope.id))}</td></tr>
  `).join('')
  const breakdown = `
    <table class="break">
      <tr class="break-head"><td>Description</td><td>Amount</td></tr>
      <tr class="break-section"><td colspan="2">Engineering Labor</td></tr>
      ${roleRows}
      <tr class="break-sub"><td>Engineering Subtotal</td><td class="amt">${dollar(t.labor)}</td></tr>

      <tr class="break-section"><td colspan="2">Other Costs</td></tr>
      <tr><td>Travel</td><td class="amt">${dollar(t.trips)}</td></tr>
      <tr><td>Material &amp; Shipping</td><td class="amt">${dollar(t.mat)}</td></tr>
      <tr class="break-sub"><td>Unloaded Total</td><td class="amt">${dollar(t.unloaded)}</td></tr>

      <tr class="break-section"><td colspan="2">Overhead &amp; Rates</td></tr>
      <tr><td>${esc(oh.scpLabel || 'SCP')}</td><td class="amt">${dollar(t.scp)}</td></tr>
      ${(oh.globalPct ?? 0) > 0 ? `<tr><td>${esc(oh.globalLabel || 'Global')}</td><td class="amt">${dollar(t.glob)}</td></tr>` : ''}
      <tr><td>${esc(oh.govLaborLabel || 'Gov Labor')}</td><td class="amt">${dollar(t.govLab)}</td></tr>
      <tr><td>Management Reserve</td><td class="amt">${dollar(t.mgmtRsv)}</td></tr>
      <tr><td>Support Cost Rate (${pct(oh.scrPct)})</td><td class="amt">${dollar(t.scr)}</td></tr>
      <tr class="break-sub"><td>Total Overhead</td><td class="amt">${dollar(t.ohTotal + t.scr)}</td></tr>

      <tr class="break-grand"><td>LOADED TOTAL</td><td class="amt">${dollar(t.totalLoaded)}</td></tr>
    </table>`

  // Labor detail
  const laborLines = rom.lineItems.filter(l => l.coaId === scope.id).map(l => {
    const entity = rom.ENTITIES.find(e => e.id === l.entity)
    const phase  = rom.LIFECYCLE_PHASES.find(p => p.id === l.phaseId)
    const role   = rom.ROLES.find(r => r.id === l.role)
    const cat    = rom.LABOR_CATS.find(c => c.id === l.laborCat)
    return `<tr>
      <td>${esc(entity?.label ?? l.entity)}</td>
      <td>${esc(phase?.label  ?? l.phaseId)}</td>
      <td>${esc(role?.label   ?? l.role)}</td>
      <td>${esc(l.taskId || '')}</td>
      <td>${esc(cat?.label    ?? l.laborCat)}</td>
      <td class="amt">${l.days ?? 0}</td>
      <td class="amt">${l.hoursPerDay ?? 0}</td>
      <td class="amt">${fmt(rom.lineHours(l))}</td>
      <td class="amt">${dollar(l.rate || 0)}</td>
      <td class="amt">${dollar(rom.lineCost(l))}</td>
    </tr>`
  }).join('')
  const laborDetail = `
    <h3>Labor Detail</h3>
    <table class="detail">
      <tr class="detail-head">
        <td>Entity</td><td>Phase</td><td>Role</td><td>Task</td><td>Labor Cat</td>
        <td class="amt">Days</td><td class="amt">Hrs/Day</td><td class="amt">Total Hrs</td>
        <td class="amt">Rate</td><td class="amt">Cost</td>
      </tr>
      ${laborLines || '<tr><td colspan="10" class="muted">(no labor lines)</td></tr>'}
      <tr class="detail-foot">
        <td colspan="7">Total</td>
        <td class="amt">${fmt(rom.laborHoursFor(scope.id))}</td>
        <td></td>
        <td class="amt">${dollar(t.labor)}</td>
      </tr>
    </table>`

  // Travel detail
  const travelLines = []
  rom.ENTITIES.forEach(e => {
    (rom.travel[e.id] ?? []).filter(trip => trip.coaId === scope.id).forEach(trip => {
      const trs = trip.travelers ?? []
      if (trs.length === 0) {
        travelLines.push(`<tr>
          <td>${esc(trip.tripName || trip.destination || '(trip)')}</td>
          <td>${esc(e.label)}</td>
          <td>${esc(trip.destination || '')}</td>
          <td>${esc(trip.state || '')}</td>
          <td class="amt">${dollar((trip.lodgingRate || 0) + (trip.mieRate || 0))}</td>
          <td colspan="9" class="muted">(no travelers)</td>
          <td class="amt">${dollar(0)}</td>
        </tr>`)
        return
      }
      trs.forEach(tr => {
        const cat = rom.LABOR_CATS.find(c => c.id === tr.laborCat)
        travelLines.push(`<tr>
          <td>${esc(trip.tripName || trip.destination || '(trip)')}</td>
          <td>${esc(e.label)}</td>
          <td>${esc(trip.destination || '')}</td>
          <td>${esc(trip.state || '')}</td>
          <td class="amt">${dollar((trip.lodgingRate || 0) + (trip.mieRate || 0))}</td>
          <td>${esc(tr.name || '')}</td>
          <td>${esc(cat?.label || '')}</td>
          <td class="amt">${tr.qty || 1}</td>
          <td class="amt">${tr.days || 0}</td>
          <td class="amt">${tr.travelHours || 0}</td>
          <td>${tr.hotel   ? 'Y' : ''}</td>
          <td>${tr.car     ? 'Y' : ''}</td>
          <td>${tr.airfare ? 'Y' : ''}</td>
          <td>${tr.misc    ? 'Y' : ''}</td>
          <td class="amt">${dollar(rom.travelerCost(trip, tr) + rom.travelLaborCost(tr))}</td>
        </tr>`)
      })
    })
  })
  const travelDetail = `
    <h3>Travel Detail</h3>
    <table class="detail">
      <tr class="detail-head">
        <td>Trip</td><td>Entity</td><td>Destination</td><td>State</td><td class="amt">Per Diem</td>
        <td>Traveler</td><td>Pay Cat</td>
        <td class="amt">Qty</td><td class="amt">Days</td><td class="amt">Travel Hrs</td>
        <td>Htl</td><td>Car</td><td>Air</td><td>Msc</td>
        <td class="amt">Cost</td>
      </tr>
      ${travelLines.join('') || '<tr><td colspan="15" class="muted">(no travel rows)</td></tr>'}
      <tr class="detail-foot">
        <td colspan="14">Travel Total</td>
        <td class="amt">${dollar(t.trips)}</td>
      </tr>
    </table>`

  // Material detail
  const matLines = rom.material.items.filter(i => i.coaId === scope.id).map(i => `
    <tr>
      <td>${esc(i.description || '')}</td>
      <td class="amt">${i.qty || 0}</td>
      <td class="amt">${dollar(i.unitCost || 0)}</td>
      <td class="amt">${dollar((i.qty || 0) * (i.unitCost || 0))}</td>
    </tr>
  `).join('')
  const matDetail = `
    <h3>Material Detail</h3>
    <table class="detail">
      <tr class="detail-head">
        <td>Description</td><td class="amt">Qty</td><td class="amt">Unit Cost</td><td class="amt">Extended</td>
      </tr>
      ${matLines || '<tr><td colspan="4" class="muted">(no material items)</td></tr>'}
      <tr class="detail-foot"><td colspan="3">Hardware Subtotal</td><td class="amt">${dollar(rom.materialUnloadedFor(scope.id))}</td></tr>
      <tr><td colspan="3">Shipping (${pct(rom.material.shippingPct)})</td><td class="amt">${dollar(rom.materialUnloadedFor(scope.id) * (rom.material.shippingPct || 0))}</td></tr>
      <tr class="detail-foot"><td colspan="3">Material Total</td><td class="amt">${dollar(t.mat)}</td></tr>
    </table>`

  return `
    <h1>${esc(scope.name)}</h1>
    <h2>Rough Order of Magnitude — Cost Estimate</h2>
    ${projInfo}
    ${hero}
    ${breakdown}
    ${laborDetail}
    ${travelDetail}
    ${matDetail}
  `
}

export async function generateWord(rom) {
  const included = rom.coas.filter(c => c.includeInQuote)
  if (included.length === 0) {
    throw new Error('No scopes are ticked "include in quote". Open the Scopes dropdown and tick at least one.')
  }

  const styles = `
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a2133; margin: 24pt; }
      h1   { font-size: 20pt; color: #1A3560; margin: 0 0 4pt; }
      h2   { font-size: 12pt; color: #4A5A78; font-weight: normal; margin: 0 0 12pt; }
      h3   { font-size: 13pt; color: #1A3560; margin: 18pt 0 6pt; border-bottom: 1pt solid #1A3560; padding-bottom: 2pt; }
      table { border-collapse: collapse; width: 100%; margin: 6pt 0 12pt; }
      td   { padding: 4pt 6pt; vertical-align: top; }
      .kv     { border: 1pt solid #c4cede; }
      .kv-l   { font-weight: bold; color: #4A5A78; background: #F5F7FB; width: 18%; }
      .hero   { background: #E8F0FE; border: 1pt solid #1A5FB4; margin: 0 0 12pt; }
      .hero-label { font-size: 10pt; font-weight: bold; color: #1A3560; padding: 8pt 12pt 2pt; }
      .hero-value { font-size: 22pt; font-weight: bold; color: #1A5FB4; text-align: right; padding: 8pt 12pt 2pt; }
      .hero-sub   { font-size: 9pt; color: #4A5A78; padding: 0 12pt 8pt; }

      .break { border: 1pt solid #c4cede; }
      .break .break-head td { background: #1A3560; color: #fff; font-weight: bold; }
      .break .break-section td { background: #1A3560; color: #fff; font-weight: bold; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5pt; }
      .break .break-sub td { background: #E8F0FE; color: #1A3560; font-weight: bold; }
      .break .break-grand td { background: #1A3560; color: #fff; font-weight: bold; font-size: 13pt; }
      .break td { border-top: 0.5pt solid #c4cede; }

      .detail { border: 1pt solid #c4cede; font-size: 9pt; }
      .detail .detail-head td { background: #1A3560; color: #fff; font-weight: bold; }
      .detail .detail-foot td { background: #F5F7FB; font-weight: bold; border-top: 1pt solid #1A3560; }
      .detail td { border-top: 0.5pt solid #c4cede; }
      .amt { text-align: right; }
      .muted { color: #888780; font-style: italic; }
      .page-break { page-break-before: always; }
    </style>
  `

  // Document title page (a tiny summary) — then one section per scope.
  const summary = `
    <h1>Rough Order of Magnitude — Quote Summary</h1>
    <p>Generated ${new Date().toLocaleDateString()}</p>
    <table class="kv">
      <tr><td class="kv-l">Customer / Sponsor</td><td>${esc(rom.project.sponsor || '—')}</td>
          <td class="kv-l">Project / Room</td><td>${esc(rom.project.roomName || '—')}</td></tr>
      <tr><td class="kv-l">Project Lead</td><td>${esc(rom.project.projectEngineer || '—')}</td>
          <td class="kv-l">Date</td><td>${esc(rom.project.date || '—')}</td></tr>
      <tr><td class="kv-l">Scopes included</td><td>${included.length} of ${rom.coas.length}</td>
          <td class="kv-l">FY Funds</td><td>${dollar(rom.project.anticipatedFYFunds)}</td></tr>
    </table>
    <table class="hero"><tr>
      <td class="hero-label">QUOTE GRAND TOTAL (LOADED)</td>
      <td class="hero-value">${dollar(rom.totalLoadedForQuote)}</td>
    </tr></table>

    <h3>Scope Rollup</h3>
    <table class="detail">
      <tr class="detail-head">
        <td>Scope</td><td class="amt">Labor</td><td class="amt">Travel</td>
        <td class="amt">Material</td><td class="amt">Overhead + SCR</td><td class="amt">Loaded Total</td>
      </tr>
      ${included.map(c => {
        const t = rom.coaTotals(c.id)
        return `<tr>
          <td>${esc(c.name)}</td>
          <td class="amt">${dollar(t.labor)}</td>
          <td class="amt">${dollar(t.trips)}</td>
          <td class="amt">${dollar(t.mat)}</td>
          <td class="amt">${dollar(t.ohTotal + t.scr)}</td>
          <td class="amt">${dollar(t.totalLoaded)}</td>
        </tr>`
      }).join('')}
      <tr class="detail-foot">
        <td>QUOTE GRAND TOTAL</td>
        <td class="amt">${dollar(included.reduce((s, c) => s + rom.coaTotals(c.id).labor, 0))}</td>
        <td class="amt">${dollar(included.reduce((s, c) => s + rom.coaTotals(c.id).trips, 0))}</td>
        <td class="amt">${dollar(included.reduce((s, c) => s + rom.coaTotals(c.id).mat, 0))}</td>
        <td class="amt">${dollar(included.reduce((s, c) => s + (rom.coaTotals(c.id).ohTotal + rom.coaTotals(c.id).scr), 0))}</td>
        <td class="amt">${dollar(rom.totalLoadedForQuote)}</td>
      </tr>
    </table>
  `

  const scopeSections = included.map((s, i) =>
    `<div class="${i === 0 ? '' : 'page-break'}">${buildScopeHTML(rom, s)}</div>`
  ).join('')

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>ROM Tool — Cost Estimate</title>
${styles}
</head>
<body>
${summary}
<div class="page-break"></div>
${scopeSections}
</body>
</html>`

  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  const sponsor = (rom.project.sponsor || 'Quote').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40)
  const dateStr = new Date().toISOString().slice(0, 10)
  a.download = `ROM_${sponsor}_${dateStr}.doc`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 0)
}
