/**
 * ROM Tool — Per Diem Rates Loader
 *
 * Fetches /rates/conus.xlsx and /rates/oconus.xlsx from the public folder,
 * parses them, and returns structured rate maps.
 *
 * CONUS map  : { "San Diego|CA": { lodging: 199, mie: 86, months: { Jan:199, ... } } }
 * OCONUS map : { "Japan|Tokyo": { lodging: 182, mie: 122 } }
 *              Country list: [ "Japan", "Germany", ... ]
 *              Locations by country: { "Japan": ["Tokyo","Okinawa",...], ... }
 */

const MONTH_SHORTS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_LONGS  = ['january','february','march','april','may','june','july','august','september','october','november','december']

// ── Helpers ─────────────────────────────────────────────────────────────────

function findCol(keys, ...patterns) {
  for (const p of patterns) {
    const re = typeof p === 'string' ? new RegExp(p, 'i') : p
    const k = keys.find(k => re.test(k.trim()))
    if (k) return k
  }
  return null
}

function numVal(row, key) {
  if (!key) return 0
  const v = parseFloat(String(row[key] ?? '').replace(/[$,\s]/g, ''))
  return isNaN(v) ? 0 : v
}

async function fetchExcel(path) {
  const XLSX = await import('xlsx')
  const res  = await fetch(path + '?v=' + Date.now())
  if (!res.ok) throw new Error(`${path} not found (${res.status})`)
  const buf  = await res.arrayBuffer()
  const wb   = XLSX.read(buf, { type: 'array' })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

// ── CONUS parser ─────────────────────────────────────────────────────────────
// Handles GSA FY ZipCode Excel: Name, State, Oct–Sep, Meals columns

export async function loadCONUS() {
  const rows = await fetchExcel('/rates/conus.xlsx')
  if (!rows.length) throw new Error('conus.xlsx is empty')

  const keys      = Object.keys(rows[0])
  const cityKey   = findCol(keys, '^name$', '^city$', '^destination$', '^location$')
  const stateKey  = findCol(keys, '^state$', '^st$', '^state_code$')
  const mieKey    = findCol(keys, '^meals$', /m.*ie/i, '^incidental', '^per.?diem.?meal')

  if (!cityKey || !stateKey) throw new Error('conus.xlsx: cannot find city/state columns')

  // Detect month columns — try short names first, then long
  const monthKeys = {}
  MONTH_SHORTS.forEach(m => {
    const k = findCol(keys, new RegExp('^' + m + '$', 'i'))
    if (k) monthKeys[m] = k
  })
  // Fallback: try long names
  if (!Object.keys(monthKeys).length) {
    MONTH_LONGS.forEach((long, i) => {
      const k = findCol(keys, new RegExp('^' + long + '$', 'i'))
      if (k) monthKeys[MONTH_SHORTS[i]] = k
    })
  }
  const hasMonths = Object.keys(monthKeys).length > 0

  // Single lodging column fallback (when no month columns)
  const lodgingKey = hasMonths ? null : findCol(keys, '^lodging$', '^rate$', '^standard', /per.?diem/i)

  const map  = {}   // "city|STATE" → { lodging, mie, months }
  const seen = new Set()

  rows.forEach(row => {
    const city  = String(row[cityKey] ?? '').trim()
    const state = String(row[stateKey] ?? '').trim().toUpperCase()
    if (!city || !state || city.toLowerCase() === 'name') return

    const key = `${city.toLowerCase()}|${state}`
    if (seen.has(key)) return     // deduplicate zip rows
    seen.add(key)

    const months = {}
    if (hasMonths) {
      Object.entries(monthKeys).forEach(([m, k]) => {
        const v = numVal(row, k)
        if (v > 0) months[m] = v
      })
    }

    const curMonth = new Date().toLocaleString('en-US', { month: 'short' })
    const lodging  = hasMonths
      ? (months[curMonth] ?? months['Jan'] ?? Object.values(months)[0] ?? 0)
      : numVal(row, lodgingKey)

    const mie = numVal(row, mieKey)
    if (!lodging && !mie) return

    map[`${city.toLowerCase()}|${state}`] = { lodging, mie, months: hasMonths ? months : null }
  })

  return map
}

// ── OCONUS parser ────────────────────────────────────────────────────────────
// Handles State Dept foreign per diem Excel.
// Common columns: Country, Location / Post, Season Begin, Season End,
//                 Maximum Lodging Rate, M&IE, Effective Date
// Returns:
//   map      : { "Country|Location": { lodging, mie } }
//   countries: sorted string[]
//   byCountry: { "Country": [{ location, lodging, mie }] }

export async function loadOCONUS() {
  const rows = await fetchExcel('/rates/oconus.xlsx')
  if (!rows.length) throw new Error('oconus.xlsx is empty')

  const keys = Object.keys(rows[0])

  const countryKey  = findCol(keys, '^country$', '^nation$', '^country.?name$')
  const locationKey = findCol(keys, '^location$', '^post$', '^city$', '^place$', '^locality$', '^destination$')
  const lodgingKey  = findCol(keys, /max.*lodg/i, /lodg.*rate/i, '^lodging$', '^lodg$', '^hotel$', /per.?diem.*lodg/i)
  const mieKey      = findCol(keys, /^m.*ie/i, /meals.*incid/i, '^meals$', '^per.?diem.?meal', /m&ie/i)

  if (!countryKey) throw new Error(`oconus.xlsx: cannot find country column. Columns found: ${keys.join(', ')}`)
  if (!locationKey) throw new Error(`oconus.xlsx: cannot find location/post column. Columns found: ${keys.join(', ')}`)

  const map       = {}
  const byCountry = {}
  const countries = new Set()

  // State Dept files often have multiple rows per location (seasonal rates).
  // We keep the first non-zero rate per country+location pair.
  const seen = new Set()

  rows.forEach(row => {
    const country  = String(row[countryKey]  ?? '').trim()
    const location = String(row[locationKey] ?? '').trim()
    if (!country || !location) return

    const pairKey = `${country}|${location}`
    if (seen.has(pairKey)) return
    seen.add(pairKey)

    const lodging = numVal(row, lodgingKey)
    const mie     = numVal(row, mieKey)
    if (!lodging && !mie) return

    countries.add(country)
    map[pairKey] = { lodging, mie }

    if (!byCountry[country]) byCountry[country] = []
    byCountry[country].push({ location, lodging, mie })
  })

  // Sort locations within each country
  Object.values(byCountry).forEach(locs => locs.sort((a, b) => a.location.localeCompare(b.location)))

  return {
    map,
    countries: [...countries].sort(),
    byCountry,
  }
}

// ── Top-level loader ─────────────────────────────────────────────────────────

export async function loadAllRates() {
  const result = { conus: null, oconus: null, errors: [] }

  await Promise.allSettled([
    loadCONUS().then(m   => { result.conus   = m }).catch(e => result.errors.push('CONUS: '  + e.message)),
    loadOCONUS().then(r  => { result.oconus  = r }).catch(e => result.errors.push('OCONUS: ' + e.message)),
  ])

  return result
}
