/**
 * ROM Tool — Word Export
 *
 * Builds an HTML document with Office-friendly markup, served as
 * application/msword. Layout deliberately mirrors the PDF: logo + title +
 * navy rule header, project-info table, hero loaded-total, cost breakdown,
 * engineering detail (by entity × role + by phase × role), then labor /
 * travel / material detail tables.
 *
 * No external library required — Word opens HTML-as-doc natively.
 */

import { SUMMARY_LABOR_GROUPS } from './exportConstants.js'

function entityTravelLaborForScope(rom, entityId, scopeId) {
  let t = 0
  ;(rom.travel[entityId] ?? []).forEach(trip => {
    if ((trip.coaId ?? rom.coas[0].id) !== scopeId) return
    ;(trip.travelers ?? []).forEach(tr => { t += rom.travelLaborCost(trip, tr) })
  })
  return t
}

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
function pct(v)    { return ((v || 0) * 100).toFixed(0) + '%' }
function dollar(n) { return n ? '$' + Math.round(n).toLocaleString() : '$0' }
// Build the overhead rows for the Word breakdown table. Collapses to a
// single "Contract Fee" row when oh.showLineItems is false.
function buildOverheadRowsHTML(oh, t) {
  if (oh?.showLineItems === false) {
    return `<tr><td>Contract Fee</td><td class="amt">${dollar(t.ohTotal + t.scr)}</td></tr>`
  }
  const items = Array.isArray(oh?.items) ? oh.items : []
  return items
    .filter(it => it.enabled)
    .map(it => {
      const base = it.base === 'withOverhead' ? t.withOh
                 : it.base === 'labor'        ? t.labor
                 : it.base === 'travel'       ? t.trips
                 : it.base === 'material'     ? t.mat
                 :                             t.unloaded
      const cost = base * (it.pct || 0)
      const label = it.label || 'Overhead item'
      const suffix = (it.pct || 0) > 0 ? ` (${pct(it.pct)})` : ''
      return `<tr><td>${esc(label + suffix)}</td><td class="amt">${dollar(cost)}</td></tr>`
    }).join('')
}

function includeProjectField(project, key) {
  return project?.includeFields?.[key] !== false
}
function projInfoRowsHTML(rom, scope) {
  // Returns rows of <tr> for the kv table, only including ticked fields
  const candidates = [
    ['sponsor',         'Customer / Sponsor'],
    ['roomName',        'Project / Room'],
    ['building',        'Building'],
    ['cityBase',        'City / Base'],
    ['projectEngineer', 'Cronos Project Lead'],
    ['govLead',         'Government Project Lead'],
    ['pmSupportLead',   'PM Support Lead'],
    ['date',            'Date'],
  ].filter(([k]) => includeProjectField(rom.project, k))
   .map(([k, label]) => [label, esc(rom.project?.[k] || '—')])
  if (scope?.name) candidates.push(['Scope', esc(scope.name)])
  // Two pairs per row
  const rows = []
  for (let i = 0; i < candidates.length; i += 2) {
    const a = candidates[i]
    const b = candidates[i + 1] ?? ['', '']
    rows.push(`<tr>
      <td class="kv-l">${a[0]}</td><td class="kv-v">${a[1]}</td>
      <td class="kv-l">${b[0]}</td><td class="kv-v">${b[1]}</td>
    </tr>`)
  }
  return rows.join('')
}

function esc(s)    {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Read /logo.png and return a base64 data URI so the image embeds in the doc.
async function loadLogoDataUri() {
  try {
    const res = await fetch('/logo.png')
    if (!res.ok) return ''
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const r = new FileReader()
      r.onload  = () => resolve(r.result)
      r.onerror = () => resolve('')
      r.readAsDataURL(blob)
    })
  } catch { return '' }
}

// ── Header band (logo + title + navy rule) ─────────────────────────────
function headerBand(logo, leftTitle, rightTitle) {
  return `
  <table class="hdr" cellspacing="0" cellpadding="0">
    <tr>
      <td class="hdr-left">
        ${logo ? `<img src="${logo}" width="120" alt="Cronos">` : ''}
      </td>
      <td class="hdr-right">
        <div class="hdr-title">${esc(leftTitle)}</div>
        <div class="hdr-sub">${esc(rightTitle)}</div>
      </td>
    </tr>
  </table>
  <div class="hdr-rule"></div>`
}

// ── Project-info 4-column table ─────────────────────────────────────────
function projectInfoTable(rom, scope) {
  return `<table class="kv" cellspacing="0" cellpadding="0">${projInfoRowsHTML(rom, scope)}</table>`
}

// ── Hero loaded-total panel ────────────────────────────────────────────
function heroBox(scopeName, t) {
  return `
  <table class="hero" cellspacing="0" cellpadding="0">
    <tr>
      <td class="hero-label">LOADED TOTAL · ${esc(scopeName.toUpperCase())}</td>
      <td class="hero-value">${dollar(t.totalLoaded)}</td>
    </tr>
    <tr>
      <td colspan="2" class="hero-sub">
        Labor ${dollar(t.labor)} &nbsp;·&nbsp; Travel ${dollar(t.trips)} &nbsp;·&nbsp;
        Material ${dollar(t.mat)} &nbsp;·&nbsp; Overhead ${dollar(t.ohTotal + t.scr)}
      </td>
    </tr>
  </table>`
}

// ── Full cost breakdown (mirrors PDF) ──────────────────────────────────
function breakdownTable(rom, scope, t, oh) {
  const roleRows = rom.ROLES.map(r =>
    `<tr><td>${esc(r.label)}</td><td class="amt">${dollar(rom.roleCostForCoa(r.id, null, scope.id))}</td></tr>`
  ).join('')
  const travelLaborAmt = rom.travelLaborFor(scope.id)
  return `
  <table class="break" cellspacing="0" cellpadding="0">
    <tr class="break-head"><td>Description</td><td>Amount</td></tr>
    <tr class="break-section"><td colspan="2">Engineering Labor</td></tr>
    ${roleRows}
    ${travelLaborAmt > 0 ? `<tr><td>Travel Labor (travel hours)</td><td class="amt">${dollar(travelLaborAmt)}</td></tr>` : ''}
    <tr class="break-sub"><td>Engineering Subtotal</td><td class="amt">${dollar(t.labor)}</td></tr>

    <tr class="break-section"><td colspan="2">Other Costs</td></tr>
    <tr><td>Travel</td><td class="amt">${dollar(t.trips)}</td></tr>
    <tr><td>Material &amp; Shipping</td><td class="amt">${dollar(t.mat)}</td></tr>
    <tr class="break-sub"><td>Unloaded Total</td><td class="amt">${dollar(t.unloaded)}</td></tr>

    <tr class="break-section"><td colspan="2">Overhead &amp; Rates</td></tr>
    ${buildOverheadRowsHTML(oh, t)}
    <tr class="break-sub"><td>Total Overhead</td><td class="amt">${dollar(t.ohTotal + t.scr)}</td></tr>

    <tr class="break-grand"><td>LOADED TOTAL</td><td class="amt">${dollar(t.totalLoaded)}</td></tr>
  </table>`
}

// ── Engineering by Entity × Role (page-2 style table) ──────────────────
function entityRoleTable(rom, scope, t) {
  if (rom.visibleEntities.length === 0) return ''
  const head = `<tr class="erh"><td>Role</td>${rom.visibleEntities.map(e => `<td class="amt">${esc(e.label)}</td>`).join('')}<td class="amt">Total</td></tr>`
  const rows = rom.ROLES.map(r => `
    <tr>
      <td>${esc(r.label)}</td>
      ${rom.visibleEntities.map(e => `<td class="amt">${dollar(rom.roleCostForCoa(r.id, e.id, scope.id))}</td>`).join('')}
      <td class="amt grand">${dollar(rom.roleCostForCoa(r.id, null, scope.id))}</td>
    </tr>`).join('')
  const foot = `
    <tr class="erf">
      <td>Total</td>
      ${rom.visibleEntities.map(e => `<td class="amt">${dollar(rom.entityCostForCoa(e.id, scope.id) + entityTravelLaborForScope(rom, e.id, scope.id))}</td>`).join('')}
      <td class="amt">${dollar(t.labor)}</td>
    </tr>`
  return `<table class="er" cellspacing="0" cellpadding="0">${head}${rows}${foot}</table>`
}

// ── Engineering by Phase × Role ────────────────────────────────────────
function phaseRoleTable(rom, scope, t) {
  const phaseRows = rom.LIFECYCLE_PHASES.map(ph => {
    const tot = rom.ROLES.reduce((s, r) => s + rom.phaseCostForCoa(r.id, ph.id, null, scope.id), 0)
    if (!tot) return null
    return `<tr>
      <td>${esc(ph.label)}</td>
      ${rom.ROLES.map(r => `<td class="amt">${dollar(rom.phaseCostForCoa(r.id, ph.id, null, scope.id))}</td>`).join('')}
      <td class="amt grand">${dollar(tot)}</td>
    </tr>`
  }).filter(Boolean).join('')
  if (!phaseRows) return ''
  const head = `<tr class="erh"><td>Phase</td>${rom.ROLES.map(r => `<td class="amt">${esc(r.label.split(' ')[0])}</td>`).join('')}<td class="amt">Total</td></tr>`
  const foot = `<tr class="erf">
    <td>Total</td>
    ${rom.ROLES.map(r => `<td class="amt">${dollar(rom.roleCostForCoa(r.id, null, scope.id) + rom.travelLaborByRole(r.id, scope.id))}</td>`).join('')}
    <td class="amt">${dollar(t.labor)}</td>
  </tr>`
  return `<table class="er" cellspacing="0" cellpadding="0">${head}${phaseRows}${foot}</table>`
}

// ── Labor / Travel / Material detail tables ────────────────────────────
function laborDetailTable(rom, scope, t) {
  const lines = rom.lineItems.filter(l => l.coaId === scope.id && rom.enabledEntities.includes(l.entity)).map(l => {
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
  return `
    <table class="detail" cellspacing="0" cellpadding="0">
      <tr class="detail-head">
        <td>Entity</td><td>Phase</td><td>Role</td><td>Task</td><td>Labor Cat</td>
        <td class="amt">Days</td><td class="amt">Hrs/Day</td><td class="amt">Total Hrs</td>
        <td class="amt">Rate</td><td class="amt">Cost</td>
      </tr>
      ${lines || '<tr><td colspan="10" class="muted">(no labor lines)</td></tr>'}
      <tr class="detail-foot">
        <td colspan="7">Total</td>
        <td class="amt">${fmt(rom.laborHoursFor(scope.id))}</td>
        <td></td>
        <td class="amt">${dollar(t.labor)}</td>
      </tr>
    </table>`
}

function travelDetailTable(rom, scope, t) {
  const rows = []
  rom.visibleEntities.forEach(e => {
    (rom.travel[e.id] ?? []).filter(trip => trip.coaId === scope.id).forEach(trip => {
      const trs = trip.travelers ?? []
      if (trs.length === 0) return
      trs.forEach(tr => {
        const cat = rom.LABOR_CATS.find(c => c.id === tr.laborCat)
        rows.push(`<tr>
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
          <td class="amt">${dollar(rom.travelerCost(trip, tr) + rom.travelLaborCost(trip, tr))}</td>
        </tr>`)
      })
    })
  })
  return `
    <table class="detail" cellspacing="0" cellpadding="0">
      <tr class="detail-head">
        <td>Trip</td><td>Entity</td><td>Destination</td><td>State</td><td class="amt">Per Diem</td>
        <td>Traveler</td><td>Pay Cat</td>
        <td class="amt">Qty</td><td class="amt">Days</td><td class="amt">Travel Hrs</td>
        <td class="amt">Cost</td>
      </tr>
      ${rows.join('') || '<tr><td colspan="11" class="muted">(no travel rows)</td></tr>'}
      <tr class="detail-foot"><td colspan="10">Travel Total</td><td class="amt">${dollar(t.trips)}</td></tr>
    </table>`
}

function materialDetailTable(rom, scope, t) {
  const items = rom.material.items.filter(i => i.coaId === scope.id).map(i => `
    <tr>
      <td>${esc(i.description || '')}</td>
      <td class="amt">${i.qty || 0}</td>
      <td class="amt">${dollar(rom.bundleUnitCost(i))}</td>
      <td class="amt">${dollar((i.qty || 0) * rom.bundleUnitCost(i))}</td>
    </tr>
  `).join('')
  return `
    <table class="detail" cellspacing="0" cellpadding="0">
      <tr class="detail-head"><td>Description</td><td class="amt">Qty</td><td class="amt">Unit Cost</td><td class="amt">Extended</td></tr>
      ${items || '<tr><td colspan="4" class="muted">(no material items)</td></tr>'}
      <tr class="detail-foot"><td colspan="3">Hardware Subtotal</td><td class="amt">${dollar(rom.materialUnloadedFor(scope.id))}</td></tr>
      <tr><td colspan="3">Shipping (${pct(rom.material.shippingPct)})</td><td class="amt">${dollar(rom.materialUnloadedFor(scope.id) * (rom.material.shippingPct || 0))}</td></tr>
      <tr class="detail-foot"><td colspan="3">Material Total</td><td class="amt">${dollar(t.mat)}</td></tr>
    </table>`
}

// ── One scope's section (page 1 + page 2 styled like the PDF) ─────────
function buildScopeHTML(rom, scope, logo) {
  const t  = rom.coaTotals(scope.id)
  const oh = rom.overheadByCoa?.[scope.id] || {}

  return `
    ${headerBand(logo, 'COST ESTIMATE', scope.name)}
    ${projectInfoTable(rom, scope)}
    ${heroBox(scope.name, t)}
    ${breakdownTable(rom, scope, t, oh)}

    <div class="page-break"></div>
    ${headerBand(logo, scope.name, 'Engineering Detail')}
    <h3>By Entity &amp; Role</h3>
    ${entityRoleTable(rom, scope, t)}
    <h3>By Phase &amp; Role</h3>
    ${phaseRoleTable(rom, scope, t)}

    <h3>Labor Detail</h3>
    ${laborDetailTable(rom, scope, t)}
    <h3>Travel Detail</h3>
    ${travelDetailTable(rom, scope, t)}
    <h3>Material Detail</h3>
    ${materialDetailTable(rom, scope, t)}
  `
}

// ── Title page — quote summary across all included scopes ─────────────
function buildSummaryHTML(rom, included, logo) {
  const grand = (fn) => included.reduce((s, c) => s + fn(rom.coaTotals(c.id)), 0)
  const rows = included.map(c => {
    const t = rom.coaTotals(c.id)
    return `<tr>
      <td>${esc(c.name)}</td>
      <td class="amt">${dollar(t.labor)}</td>
      <td class="amt">${dollar(t.trips)}</td>
      <td class="amt">${dollar(t.mat)}</td>
      <td class="amt">${dollar(t.ohTotal + t.scr)}</td>
      <td class="amt grand">${dollar(t.totalLoaded)}</td>
    </tr>`
  }).join('')

  return `
    ${headerBand(logo, 'COST ESTIMATE', 'Quote Summary')}
    <table class="kv" cellspacing="0" cellpadding="0">
      ${projInfoRowsHTML(rom, null)}
      <tr>
        <td class="kv-l">Scopes included</td><td class="kv-v" colspan="3">${included.length} of ${rom.coas.length}</td>
      </tr>
    </table>

    <table class="hero" cellspacing="0" cellpadding="0">
      <tr>
        <td class="hero-label">QUOTE GRAND TOTAL (LOADED)</td>
        <td class="hero-value">${dollar(rom.totalLoadedForQuote)}</td>
      </tr>
    </table>

    <h3>Scope Rollup</h3>
    <table class="er" cellspacing="0" cellpadding="0">
      <tr class="erh">
        <td>Scope</td>
        <td class="amt">Labor</td><td class="amt">Travel</td><td class="amt">Material</td>
        <td class="amt">Overhead + SCR</td><td class="amt">Loaded Total</td>
      </tr>
      ${rows}
      <tr class="erf">
        <td>QUOTE GRAND TOTAL</td>
        <td class="amt">${dollar(grand(t => t.labor))}</td>
        <td class="amt">${dollar(grand(t => t.trips))}</td>
        <td class="amt">${dollar(grand(t => t.mat))}</td>
        <td class="amt">${dollar(grand(t => t.ohTotal + t.scr))}</td>
        <td class="amt">${dollar(rom.totalLoadedForQuote)}</td>
      </tr>
    </table>
  `
}

export async function generateWord(rom) {
  const included = rom.coas.filter(c => c.includeInQuote)
  if (included.length === 0) {
    throw new Error('No scopes are ticked "include in quote". Open the Scopes dropdown and tick at least one.')
  }

  const logo = await loadLogoDataUri()

  const styles = `
    <style>
      @page { margin: 0.6in 0.6in; }
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; color: #1A2133; }
      h3   { font-size: 12pt; color: #1A3560; margin: 14pt 0 4pt; padding-bottom: 2pt; border-bottom: 1pt solid #1A3560; font-weight: bold; }

      /* Header band: logo left, title right, navy rule below */
      .hdr        { width: 100%; margin: 0 0 6pt; }
      .hdr-left   { width: 30%; vertical-align: top; padding: 0; }
      .hdr-right  { width: 70%; vertical-align: top; text-align: right; padding: 0; }
      .hdr-title  { font-size: 18pt; font-weight: bold; color: #1A3560; line-height: 1.1; }
      .hdr-sub    { font-size: 10pt; color: #4A5A78; margin-top: 2pt; }
      .hdr-rule   { width: 100%; height: 2pt; background: #1A3560; margin: 0 0 12pt; line-height: 0; font-size: 0; }

      /* Project info 4-col table */
      .kv   { width: 100%; margin: 0 0 10pt; border-top: 0.5pt solid #c4cede; border-bottom: 0.5pt solid #c4cede; }
      .kv-l { font-size: 9pt; font-weight: bold; color: #4A5A78; padding: 4pt 6pt; width: 18%; background: #F5F7FB; }
      .kv-v { font-size: 10pt; color: #1A2133; padding: 4pt 6pt; width: 32%; border-left: 0.5pt solid #c4cede; }

      /* Hero loaded-total box */
      .hero        { width: 100%; margin: 0 0 14pt; background: #E8F0FE; border: 1.5pt solid #1A5FB4; }
      .hero-label  { font-size: 10pt; font-weight: bold; color: #1A3560; padding: 8pt 12pt 0; }
      .hero-value  { font-size: 22pt; font-weight: bold; color: #1A5FB4; text-align: right; padding: 8pt 12pt 0; }
      .hero-sub    { font-size: 9pt; color: #4A5A78; padding: 2pt 12pt 8pt; }

      /* Cost breakdown table */
      .break              { width: 100%; margin: 0 0 14pt; border: 0.5pt solid #c4cede; }
      .break td           { padding: 5pt 8pt; border-top: 0.5pt solid #c4cede; font-size: 10pt; }
      .break .break-head td { background: #1A3560; color: #ffffff; font-weight: bold; font-size: 10pt; }
      .break .break-section td { background: #1A3560; color: #ffffff; font-weight: bold; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5pt; padding: 4pt 8pt; }
      .break .break-sub td { background: #E8F0FE; color: #1A3560; font-weight: bold; }
      .break .break-grand td { background: #1A3560; color: #ffffff; font-weight: bold; font-size: 12pt; }

      /* Entity-role + phase-role tables (also used for scope rollup) */
      .er       { width: 100%; margin: 0 0 14pt; border: 0.5pt solid #c4cede; }
      .er td    { padding: 5pt 8pt; border-top: 0.5pt solid #c4cede; font-size: 10pt; }
      .er .erh td { background: #1A3560; color: #ffffff; font-weight: bold; font-size: 9pt; }
      .er .erf td { background: #F5F7FB; font-weight: bold; border-top: 1pt solid #1A3560; }
      .er .grand { color: #1A5FB4; font-weight: bold; }

      /* Detail tables (labor / travel / material) — denser font */
      .detail   { width: 100%; margin: 0 0 14pt; border: 0.5pt solid #c4cede; font-size: 9pt; }
      .detail td { padding: 3pt 6pt; border-top: 0.5pt solid #c4cede; }
      .detail .detail-head td { background: #1A3560; color: #ffffff; font-weight: bold; }
      .detail .detail-foot td { background: #F5F7FB; font-weight: bold; border-top: 1pt solid #1A3560; }

      .amt   { text-align: right; }
      .muted { color: #888780; font-style: italic; }
      .page-break { page-break-before: always; mso-special-character: line-break; }
    </style>
  `

  const summary = buildSummaryHTML(rom, included, logo)
  const scopeSections = included.map((s, i) =>
    `<div${i === 0 ? '' : ' class="page-break"'}>${buildScopeHTML(rom, s, logo)}</div>`
  ).join('')

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Cost Estimate</title>
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

function buildScopeSummaryHTML(rom, scope, logo) {
  const t   = rom.coaTotals(scope.id)

  // Project info — two columns, matching PDF layout
  // Left: Date, Cronos Lead, Gov Lead, PM Lead  |  Right: Sponsor, Building, Room, City
  const leftFields  = [
    ['date',            'Date'],
    ['projectEngineer', 'Cronos Project Lead'],
    ['govLead',         'Government Project Lead'],
    ['pmSupportLead',   'PM Support Lead'],
  ].filter(([k]) => includeProjectField(rom.project, k))
   .map(([k, label]) => [label, esc(rom.project?.[k] || '')])

  const rightFields = [
    ['sponsor',  'Sponsor'],
    ['building', 'Building'],
    ['roomName', 'Room'],
    ['cityBase', 'City / Base'],
  ].filter(([k]) => includeProjectField(rom.project, k))
   .map(([k, label]) => [label, esc(rom.project?.[k] || '')])

  const maxRows = Math.max(leftFields.length, rightFields.length)
  const piRows = Array.from({ length: maxRows }, (_, i) => {
    const l = leftFields[i]  || ['', '']
    const r = rightFields[i] || ['', '']
    return `<tr>
      <td class="pi-label">${esc(l[0])}</td><td class="pi-value">${l[1]}</td>
      <td class="pi-gap"></td>
      <td class="pi-label">${esc(r[0])}</td><td class="pi-value">${r[1]}</td>
    </tr>`
  }).join('')

  // Labor hours by title group
  const lines = rom.lineItems.filter(l => l.coaId === scope.id && rom.enabledEntities.includes(l.entity))
  const hoursByCat = {}
  lines.forEach(l => { hoursByCat[l.laborCat] = (hoursByCat[l.laborCat] || 0) + (l.days || 0) * (l.hoursPerDay || 0) })
  const trvHrs = travelHrsByCat(rom, scope.id)
  Object.entries(trvHrs).forEach(([cat, hrs]) => { hoursByCat[cat] = (hoursByCat[cat] || 0) + hrs })
  const groupRows = SUMMARY_LABOR_GROUPS.map(g => {
    const hrs = g.catIds.reduce((s, id) => s + (hoursByCat[id] || 0), 0)
    return `<tr class="body-row"><td>${esc(g.title)}</td><td class="r">${Math.round(hrs)}</td></tr>`
  }).join('')
  const totalHrs = SUMMARY_LABOR_GROUPS.reduce((s, g) =>
    s + g.catIds.reduce((ss, id) => ss + (hoursByCat[id] || 0), 0), 0)

  const matUnloaded  = rom.materialUnloadedFor(scope.id)
  const isFirstScope = rom.quoteCoaIds[0] === scope.id
  const shipping     = matUnloaded * (rom.material.shippingPct || 0) + (isFirstScope ? (rom.material.shipperCost || 0) : 0)
  const odcTotal     = t.trips + matUnloaded + shipping

  return `
    <table class="hdr" cellspacing="0" cellpadding="0"><tr>
      <td class="hdr-left">${logo ? `<img src="${logo}" width="110" alt="Cronos">` : ''}</td>
      <td class="hdr-right"><div class="hdr-title">Cost Estimate</div><div class="hdr-sub">${esc(scope.name)}</div></td>
    </tr></table>
    <div class="hdr-rule"></div>

    <table class="pi-tbl" cellspacing="0" cellpadding="0">${piRows}</table>

    <div class="sec-label">Labor</div>
    <table class="half-tbl" cellspacing="0" cellpadding="0">
      <tr class="col-hdr"><td>Title</td><td class="r">Hours</td></tr>
      ${groupRows}
      <tr class="rule-row"><td>Total Hours</td><td class="r">${Math.round(totalHrs)}</td></tr>
      <tr class="rule-row"><td>Labor Subtotal</td><td class="r">${dollar(t.labor)}</td></tr>
    </table>

    <div class="sec-label">ODC</div>
    <table class="half-tbl" cellspacing="0" cellpadding="0">
      <tr class="body-row"><td class="b">Travel Subtotal</td><td class="r">${dollar(t.trips)}</td></tr>
      <tr class="body-row"><td class="b">Material Subtotal</td><td class="r">${dollar(matUnloaded)}</td></tr>
      <tr class="body-row"><td class="b">Shipping</td><td class="r">${dollar(shipping)}</td></tr>
      <tr class="rule-row"><td>Total ODC</td><td class="r">${dollar(odcTotal)}</td></tr>
    </table>

    <div style="height:10pt;"></div>
    <table class="half-tbl" cellspacing="0" cellpadding="0">
      <tr class="rule-row"><td>Total Estimate</td><td class="r">${dollar(t.unloaded)}</td></tr>
      <tr class="rule-row"><td>Contract Fee</td><td class="r">${dollar(t.ohTotal + t.scr)}</td></tr>
      <tr class="grand-row"><td>Grand Total</td><td class="r">${dollar(t.totalLoaded)}</td></tr>
    </table>
  `
}

export async function generateWordSummary(rom) {
  const included = rom.coas.filter(c => c.includeInQuote)
  if (included.length === 0) {
    throw new Error('No scopes are ticked "include in quote". Open the Scopes dropdown and tick at least one.')
  }

  const logo = await loadLogoDataUri()

  const styles = `
    <style>
      @page { margin: 0.6in 0.6in; }
      body  { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; color: #1A2133; }

      /* Header band */
      .hdr       { width: 100%; margin: 0 0 4pt; }
      .hdr-left  { width: 35%; vertical-align: middle; padding: 0; }
      .hdr-right { width: 65%; vertical-align: bottom; text-align: left; padding: 0 0 2pt; }
      .hdr-title { font-size: 22pt; font-weight: bold; color: #1A2133; line-height: 1; }
      .hdr-sub   { font-size: 10pt; color: #4A5A78; margin-top: 2pt; }
      .hdr-rule  { width: 100%; height: 2pt; background: #1A3560; margin: 0 0 10pt; line-height: 0; font-size: 0; }

      /* Two-column project info table */
      .pi-tbl        { width: 100%; border-collapse: collapse; margin: 0 0 14pt; }
      .pi-tbl td     { padding: 3pt 6pt; font-size: 10pt; border-bottom: 0.5pt solid #1A3560; }
      .pi-label      { font-weight: bold; color: #1A2133; width: 22%; }
      .pi-value      { color: #1A2133; width: 26%; }
      .pi-gap        { width: 4%; border-bottom: none !important; }

      /* Section header — bold label above the table */
      .sec-label { font-size: 12pt; font-weight: bold; color: #1A2133; margin: 12pt 0 3pt; }

      /* Half-page table (matches PDF colR = half the page width) */
      .half-tbl          { width: 52%; border-collapse: collapse; margin: 0; }
      .half-tbl td       { padding: 3pt 8pt; font-size: 10pt; color: #1A2133; border-bottom: 0.5pt solid #c4cede; }

      /* Column header row */
      .col-hdr td        { font-weight: bold; font-size: 9pt; border-bottom: 1pt solid #1A2133; }

      /* Subtotal rows — bold + thick top rule, like PDF rowWithRule */
      .rule-row td       { font-weight: bold; border-top: 1pt solid #1A2133; border-bottom: none; padding-top: 5pt; }

      /* Grand total — accent border box, no fill */
      .grand-row td      { font-weight: bold; font-size: 12pt; color: #1A5FB4;
                           border: 1.5pt solid #1A5FB4; border-top: 1.5pt solid #1A5FB4;
                           padding: 4pt 8pt; }

      /* Utilities */
      .r  { text-align: right; }
      .b  { font-weight: bold; }
      .page-break { page-break-before: always; mso-special-character: line-break; }
    </style>
  `

  const sections = included.map((s, i) =>
    `<div${i === 0 ? '' : ' class="page-break"'}>${buildScopeSummaryHTML(rom, s, logo)}</div>`
  ).join('')

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Cost Estimate</title>${styles}</head>
<body>${sections}</body>
</html>`

  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  const sponsor = (rom.project.sponsor || 'Quote').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40)
  const dateStr = new Date().toISOString().slice(0, 10)
  a.download = `ROM_${sponsor}_CostSummary_${dateStr}.doc`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 0)
}
