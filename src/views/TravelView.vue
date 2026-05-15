<template>
  <div class="travel-view">

    <!-- Summary strip -->
    <div class="summary-strip">
      <div class="summary-card">
        <div class="summary-label">Total Trips</div>
        <div class="summary-value">{{ allTrips.length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Travelers</div>
        <div class="summary-value">{{ totalPersons }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Travel Hours</div>
        <div class="summary-value">{{ totalHours }}</div>
      </div>
      <div class="summary-card summary-card--accent">
        <div class="summary-label">Travel Total</div>
        <div class="summary-value">{{ fmt(rom.travelTotal) }}</div>
      </div>
    </div>

    <!-- GSA API info bar -->
    <div class="gsa-info-bar">
      <i class="ti ti-building-bank"></i>
      <span>GSA Per Diem FY{{ gsaFiscalYear() }} — rates auto-fill when you enter a city and state</span>
    </div>

    <!-- Entity sections -->
    <div class="entities-wrap">
      <div
        v-for="entity in rom.visibleEntities"
        :key="entity.id"
        class="entity-card"
        :class="`entity--${entity.id}`"
      >
        <!-- Entity header -->
        <div class="entity-head">
          <div class="entity-head-left">
            <span class="entity-pill">{{ entity.label }}</span>
            <span class="entity-meta">
              {{ trips(entity.id).length }} trip{{ trips(entity.id).length !== 1 ? 's' : '' }}
              &nbsp;·&nbsp;
              {{ fmt(entityTotal(entity.id)) }}
            </span>
          </div>
        </div>

        <!-- Trip cards -->
        <div class="trips-wrap">
          <div
            v-for="trip in trips(entity.id)"
            :key="trip.id"
            class="trip-card"
          >
            <!-- Trip header bar -->
            <div class="trip-head">
              <div class="trip-head-left">
                <i class="ti ti-map-pin" aria-hidden="true"></i>
                <input
                  type="text"
                  :value="trip.travelerName"
                  placeholder="Traveler / role (e.g. Systems Engineer)"
                  class="trip-name-input"
                  @input="rom.updateTrip(entity.id, trip.id, { travelerName: $event.target.value })"
                />
              </div>
              <div class="trip-head-right">
                <span class="trip-total">{{ fmt(rom.tripCost(trip)) }}</span>
                <button class="del-btn" @click="rom.removeTrip(entity.id, trip.id)" title="Remove trip">
                  <i class="ti ti-trash" aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <!-- Trip body -->
            <div class="trip-body">

              <!-- Row 1: Location (3 dropdowns) -->
              <div class="trip-row">

                <!-- 1. Region -->
                <div class="trip-field trip-field--region">
                  <label>Region</label>
                  <select :value="trip.region || 'conus'"
                    class="loc-select"
                    @change="onRegionChange(entity.id, trip, $event.target.value)">
                    <option value="conus">CONUS</option>
                    <option value="oconus">OCONUS</option>
                  </select>
                </div>

                <!-- 2a. State (CONUS) -->
                <div v-if="(trip.region || 'conus') === 'conus'" class="trip-field trip-field--state">
                  <label>State</label>
                  <select :value="trip.state" class="loc-select"
                    @change="onStateChange(entity.id, trip, $event.target.value)">
                    <option value="">— State —</option>
                    <option v-for="s in US_STATES" :key="s.code" :value="s.code">{{ s.code }} — {{ s.name }}</option>
                  </select>
                </div>

                <!-- 2b. Country (OCONUS) -->
                <div v-else class="trip-field trip-field--state">
                  <label>Country</label>
                  <select :value="trip.country || ''" class="loc-select"
                    @change="onCountryChange(entity.id, trip, $event.target.value)">
                    <option value="">— Country —</option>
                    <option v-for="c in COUNTRIES" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>

                <!-- 3a. City dropdown (CONUS) -->
                <div v-if="(trip.region || 'conus') === 'conus'" class="trip-field trip-field--city">
                  <label>
                    City
                    <span v-if="citiesLoading[trip.state]" class="spin-inline">⟳</span>
                  </label>
                  <select v-if="stateCities[trip.state]"
                    :value="trip.destination" class="loc-select city-select"
                    @change="onCitySelect(entity.id, trip, $event.target.value)">
                    <option value="">— Select city —</option>
                    <option v-for="c in stateCities[trip.state]" :key="c.city" :value="c.city">{{ c.city }}</option>
                  </select>
                  <div v-else-if="citiesLoading[trip.state]" class="city-placeholder">Loading…</div>
                  <div v-else class="city-placeholder">{{ trip.state ? 'Loading…' : 'Select a state first' }}</div>
                </div>

                <!-- 3b. Location dropdown/text (OCONUS) -->
                <div v-else class="trip-field trip-field--city">
                  <label>Location / City</label>
                  <!-- Dropdown when we have loaded file data for this country -->
                  <select v-if="trip.country && oconusLocations(trip.country).length"
                    :value="trip.destination" class="loc-select city-select"
                    @change="onOconusLocationSelect(entity.id, trip, $event.target.value)">
                    <option value="">— Select location —</option>
                    <option v-for="loc in oconusLocations(trip.country)" :key="loc.location" :value="loc.location">
                      {{ loc.location }}
                    </option>
                  </select>
                  <!-- Fallback text input when no file data -->
                  <input v-else type="text" class="loc-text"
                    :value="trip.destination"
                    placeholder="e.g. Tokyo"
                    @input="rom.updateTrip(entity.id, trip.id, { destination: $event.target.value })" />
                </div>

              </div>

              <!-- Row 2: Month + rates (CONUS auto-filled; OCONUS manual) -->
              <div class="trip-row">
                <div class="trip-field">
                  <label>Travel Month</label>
                  <select
                    :value="trip.travelMonth || currentMonth"
                    :class="['month-select', { 'month-select--rich': !!trip.gsaMonthlyRates }]"
                    @change="onMonthChange(entity.id, trip, $event.target.value)"
                  >
                    <option v-for="m in MONTHS" :key="m" :value="m">{{ monthLabel(trip, m) }}</option>
                  </select>
                </div>
                <div class="trip-field trip-field--sm">
                  <label class="rate-label">
                    Hotel/night ($)
                    <span v-if="gsaLoading[trip.id]" class="spin-inline">⟳</span>
                  </label>
                  <input type="number" min="0" step="1"
                    :value="trip.lodgingRate || 0" placeholder="0"
                    @input="rom.updateTrip(entity.id, trip.id, { lodgingRate: +$event.target.value })"
                    :class="['gsa-rate-input', { 'rate-filled': (trip.lodgingRate || 0) > 0 }]" />
                </div>
                <div class="trip-field trip-field--sm">
                  <label>M&amp;IE/day ($)</label>
                  <input type="number" min="0" step="1"
                    :value="trip.mieRate || 0" placeholder="0"
                    @input="rom.updateTrip(entity.id, trip.id, { mieRate: +$event.target.value })"
                    :class="['gsa-rate-input', { 'rate-filled': (trip.mieRate || 0) > 0 }]" />
                </div>
                <!-- Refresh (CONUS only) / State Dept link (OCONUS) -->
                <div class="trip-field trip-field--action">
                  <label>&nbsp;</label>
                  <button v-if="(trip.region || 'conus') === 'conus'"
                    class="gsa-refresh-btn"
                    :class="{ loading: gsaLoading[trip.id] }"
                    :disabled="!trip.destination || !trip.state || gsaLoading[trip.id]"
                    title="Re-fetch GSA rates"
                    @click="lookupGSA(entity.id, trip)">
                    <i :class="gsaLoading[trip.id] ? 'ti ti-loader spin' : 'ti ti-refresh'"></i>
                  </button>
                  <a v-else href="https://allowances.state.gov/web920/per_diem.asp" target="_blank"
                    class="state-dept-link" title="Look up State Dept rates">
                    <i class="ti ti-external-link"></i>
                  </a>
                </div>
              </div>

              <!-- GSA / OCONUS status -->
              <div v-if="gsaError[trip.id] || (trip.region || 'conus') === 'oconus'" class="trip-row trip-row--status">
                <div v-if="gsaError[trip.id]" :class="gsaError[trip.id].startsWith('✓') ? 'gsa-match' : 'gsa-error'">
                  {{ gsaError[trip.id] }}
                </div>
                <div v-else-if="(trip.region || 'conus') === 'oconus'" class="oconus-hint">
                  Enter per diem rates manually ·
                  <a href="https://allowances.state.gov/web920/per_diem.asp" target="_blank">State Dept rates ↗</a>
                </div>
              </div>

              <!-- Row 2: Trip details -->
              <div class="trip-row">
                <div class="trip-field trip-field--sm">
                  <label>Days</label>
                  <input type="number" min="1" step="1"
                    :value="trip.days"
                    @input="rom.updateTrip(entity.id, trip.id, { days: +$event.target.value })" />
                </div>
                <div class="trip-field trip-field--sm">
                  <label>Persons</label>
                  <input type="number" min="1" step="1"
                    :value="trip.persons"
                    @input="rom.updateTrip(entity.id, trip.id, { persons: +$event.target.value })" />
                </div>
                <div class="trip-field trip-field--sm">
                  <label>Travel hrs/person</label>
                  <input type="number" min="0" step="0.5"
                    :value="trip.travelHours"
                    @input="rom.updateTrip(entity.id, trip.id, { travelHours: +$event.target.value })" />
                </div>
                <div class="trip-field trip-field--sm">
                  <label>Total travel hrs</label>
                  <div class="computed-field">{{ Math.round((trip.travelHours || 0) * (trip.persons || 1)) }}</div>
                </div>
              </div>

              <!-- Row 3: Services -->
              <div class="trip-row trip-row--services">
                <div class="service-block" :class="{ 'service-block--active': trip.hotel }">
                  <label class="service-check">
                    <input type="checkbox" :checked="trip.hotel"
                      @change="rom.updateTrip(entity.id, trip.id, { hotel: $event.target.checked })" />
                    <i class="ti ti-bed"></i> Hotel
                  </label>
                  <div v-if="trip.hotel" class="service-detail">
                    {{ Math.max(0, (trip.days||1) - 1) }} nights × {{ fmt(trip.lodgingRate || 0) }}/night × {{ trip.persons || 1 }} persons
                    = <strong>{{ fmt(Math.max(0,(trip.days||1)-1) * (trip.lodgingRate||0) * (trip.persons||1)) }}</strong>
                  </div>
                </div>

                <div class="service-block service-block--mie">
                  <div class="service-label"><i class="ti ti-utensils"></i> M&amp;IE</div>
                  <div class="service-detail">
                    {{ trip.days || 1 }} days × {{ fmt(trip.mieRate || 0) }}/day × {{ trip.persons || 1 }} persons
                    = <strong>{{ fmt((trip.days||1) * (trip.mieRate||0) * (trip.persons||1)) }}</strong>
                  </div>
                </div>

                <div class="service-block" :class="{ 'service-block--active': trip.rentalCar }">
                  <label class="service-check">
                    <input type="checkbox" :checked="trip.rentalCar"
                      @change="rom.updateTrip(entity.id, trip.id, { rentalCar: $event.target.checked })" />
                    <i class="ti ti-car"></i> Rental Car
                  </label>
                  <div v-if="trip.rentalCar" class="service-detail service-with-input">
                    <span>{{ trip.days || 1 }} days ×</span>
                    <input type="number" min="0" step="5"
                      :value="trip.rentalCarRate"
                      @input="rom.updateTrip(entity.id, trip.id, { rentalCarRate: +$event.target.value })"
                      class="inline-num" />
                    <span>/day = <strong>{{ fmt((trip.days||1) * (trip.rentalCarRate||75)) }}</strong></span>
                  </div>
                </div>

                <div class="service-block" :class="{ 'service-block--active': trip.airfare }">
                  <label class="service-check">
                    <input type="checkbox" :checked="trip.airfare"
                      @change="rom.updateTrip(entity.id, trip.id, { airfare: $event.target.checked })" />
                    <i class="ti ti-plane"></i> Airfare
                  </label>
                  <div v-if="trip.airfare" class="service-detail service-with-input">
                    <span>{{ trip.persons || 1 }} persons ×</span>
                    <input type="number" min="0" step="50"
                      :value="trip.airfareRate"
                      @input="rom.updateTrip(entity.id, trip.id, { airfareRate: +$event.target.value })"
                      class="inline-num" />
                    <span>/ticket = <strong>{{ fmt((trip.persons||1) * (trip.airfareRate||600)) }}</strong></span>
                  </div>
                </div>
              </div>

              <!-- Row 4: Extra fees -->
              <div class="trip-row">
                <div class="trip-field trip-field--sm">
                  <label>Baggage/person ($)</label>
                  <input type="number" min="0" step="5"
                    :value="trip.baggageFees"
                    @input="rom.updateTrip(entity.id, trip.id, { baggageFees: +$event.target.value })" />
                </div>
                <div class="trip-field trip-field--sm">
                  <label>Other fees ($)</label>
                  <input type="number" min="0" step="10"
                    :value="trip.otherFees"
                    @input="rom.updateTrip(entity.id, trip.id, { otherFees: +$event.target.value })" />
                </div>
                <div class="trip-field trip-total-field">
                  <label>Trip Total</label>
                  <div class="trip-grand-total">{{ fmt(rom.tripCost(trip)) }}</div>
                </div>
              </div>

            </div>
          </div>

          <!-- Empty state -->
          <div v-if="!trips(entity.id).length" class="trips-empty">
            No trips added yet for {{ entity.label }}.
          </div>

          <!-- Add trip -->
          <div class="trips-add-row">
            <button class="add-trip-btn" @click="rom.addTrip(entity.id)">
              <i class="ti ti-plus" aria-hidden="true"></i> Add Trip
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, onMounted } from 'vue'
import { useRomStore } from '../stores/rom'

const rom = useRomStore()

const MONTHS       = ['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep']
const currentMonth = new Date().toLocaleString('en-US', { month: 'short' })

const gsaError     = reactive({})
const gsaLoading   = reactive({})
const stateCities  = reactive({})   // { "CA": [{ city, lodging, mie, gsaMonthlyRates }] }
const citiesLoading = reactive({})  // { "CA": true/false }

// ── US States list ───────────────────────────────────────────────────
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'Dist. of Columbia' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
]

// ── OCONUS countries: prefer loaded file, fall back to static list ───
const COUNTRIES = computed(() => {
  if (rom.oconusCountries?.length) return rom.oconusCountries
  // Static fallback — top ~60 countries travelers commonly visit
  return [
    'Afghanistan','Albania','Australia','Austria','Bahrain','Belgium','Bosnia and Herzegovina',
    'Brazil','Bulgaria','Canada','Chile','China','Colombia','Croatia','Cuba','Cyprus','Czech Republic',
    'Denmark','Egypt','Estonia','Finland','France','Germany','Greece','Hungary','Iceland','India',
    'Indonesia','Iraq','Ireland','Israel','Italy','Japan','Jordan','Kosovo','Kuwait','Latvia',
    'Lithuania','Luxembourg','Mexico','Montenegro','Morocco','Netherlands','New Zealand','North Macedonia',
    'Norway','Oman','Pakistan','Philippines','Poland','Portugal','Qatar','Romania','Saudi Arabia',
    'Serbia','Singapore','Slovakia','Slovenia','South Korea','Spain','Sweden','Switzerland','Thailand',
    'Turkey','Ukraine','United Arab Emirates','United Kingdom','Uzbekistan',
  ].sort()
})

// Locations for selected country in OCONUS dropdown
function oconusLocations(country) {
  if (!country) return []
  return rom.oconusByCountry?.[country] ?? []
}

const allTrips     = computed(() => rom.visibleEntities.flatMap(e => rom.travel[e.id] ?? []))
const totalPersons = computed(() => allTrips.value.reduce((s, t) => s + (t.persons || 1), 0))
const totalHours   = computed(() => allTrips.value.reduce((s, t) => s + (t.travelHours || 0) * (t.persons || 1), 0))

function trips(entityId)      { return rom.travel[entityId] ?? [] }
function entityTotal(entityId){ return trips(entityId).reduce((s, t) => s + rom.tripCost(t), 0) }
function fmt(n)               { return '$' + Math.round(n || 0).toLocaleString() }

// ── GSA Fiscal Year ──────────────────────────────────────────────────
function gsaFiscalYear() {
  const d = new Date()
  return d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear()
}

// ── Fetch all cities for a state (cached) ────────────────────────────
// Trick: querying a dummy city returns ALL cities in the state from GSA API
async function fetchCitiesForState(stateCode) {
  if (!stateCode || stateCode.length !== 2) return
  if (stateCities[stateCode] || citiesLoading[stateCode]) return  // already have or loading

  citiesLoading[stateCode] = true
  try {
    const year = gsaFiscalYear()
    const url  = `https://api.gsa.gov/travel/perdiem/v2/rates/city/zzz/state/${stateCode}/year/${year}?api_key=DEMO_KEY`
    const res  = await fetch(url)
    if (!res.ok) throw new Error(`GSA ${res.status}`)
    const data = await res.json()

    const entries = data?.rates?.[0]?.rate ?? []
    if (!entries.length) { stateCities[stateCode] = []; return }

    // Build enriched city list
    const cities = entries
      .filter(e => e.city && e.city !== 'Undefined')
      .map(e => {
        const monthlyArr = e.months?.month ?? []
        const gsaMonthlyRates = monthlyArr.length
          ? Object.fromEntries(monthlyArr.map(m => [m.short, m.value]))
          : null
        const lodging = gsaMonthlyRates
          ? (gsaMonthlyRates[currentMonth] ?? Object.values(gsaMonthlyRates)[0] ?? 0)
          : 0
        return { city: e.city, lodging, mie: e.meals ?? 0, gsaMonthlyRates, standardRate: e.standardRate }
      })
      .sort((a, b) => {
        // Standard Rate last, then alphabetical
        if (a.standardRate === 'true') return 1
        if (b.standardRate === 'true') return -1
        return a.city.localeCompare(b.city)
      })

    stateCities[stateCode] = cities
  } catch {
    stateCities[stateCode] = []
  } finally {
    citiesLoading[stateCode] = false
  }
}

// ── Region / State / Country / City handlers ─────────────────────────

function onRegionChange(entityId, trip, region) {
  rom.updateTrip(entityId, trip.id, {
    region,
    state: '',
    country: '',
    destination: '',
    lodgingRate: 0,
    mieRate: 0,
    gsaMonthlyRates: null,
  })
  gsaError[trip.id] = ''
}

function onStateChange(entityId, trip, stateCode) {
  rom.updateTrip(entityId, trip.id, {
    state: stateCode,
    destination: '',
    lodgingRate: 0,
    mieRate: 0,
    gsaMonthlyRates: null,
  })
  gsaError[trip.id] = ''
  if (stateCode) fetchCitiesForState(stateCode)
}

function onCountryChange(entityId, trip, country) {
  rom.updateTrip(entityId, trip.id, {
    country,
    destination: '',
    lodgingRate: 0,
    mieRate: 0,
    gsaMonthlyRates: null,
  })
  gsaError[trip.id] = ''
}

function onCitySelect(entityId, trip, cityName) {
  // Find the enriched city entry in cache
  const cached = stateCities[trip.state]?.find(c => c.city === cityName)
  if (!cached) {
    rom.updateTrip(entityId, trip.id, { destination: cityName })
    return
  }

  const month  = trip.travelMonth || currentMonth
  const lodging = cached.gsaMonthlyRates?.[month] ?? cached.lodging ?? 0
  const update = {
    destination:     cityName,
    lodgingRate:     lodging,
    mieRate:         cached.mie ?? 0,
    gsaMonthlyRates: cached.gsaMonthlyRates ?? null,
  }
  rom.updateTrip(entityId, trip.id, update)

  const peak     = cached.gsaMonthlyRates
    ? Object.entries(cached.gsaMonthlyRates).sort((a,b)=>b[1]-a[1])[0]?.[0]
    : null
  const peakNote = peak && peak !== month ? ` · peak: ${peak} $${cached.gsaMonthlyRates[peak]}` : peak === month ? ' ★ peak month' : ''
  gsaError[trip.id] = `✓ GSA FY${gsaFiscalYear()} · $${lodging}/night · $${cached.mie ?? 0}/day${peakNote}`
}

function onOconusLocationSelect(entityId, trip, location) {
  const locData = rom.oconusByCountry?.[trip.country]?.find(l => l.location === location)
  if (locData) {
    rom.updateTrip(entityId, trip.id, {
      destination: location,
      lodgingRate: locData.lodging ?? 0,
      mieRate:     locData.mie ?? 0,
      gsaMonthlyRates: null,
    })
    gsaError[trip.id] = `✓ State Dept · $${locData.lodging}/night · $${locData.mie}/day`
  } else {
    rom.updateTrip(entityId, trip.id, { destination: location })
  }
}

// ── Live GSA API lookup (refresh button) ────────────────────────────
async function lookupGSA(entityId, trip) {
  if (!trip.destination?.trim() || trip.state?.trim().length !== 2) return

  // If city cache is populated, read from it
  const cached = stateCities[trip.state]?.find(c => c.city === trip.destination)
  if (cached) {
    onCitySelect(entityId, trip, trip.destination)
    return
  }

  // Hit the GSA public API directly
  gsaLoading[trip.id] = true
  gsaError[trip.id] = ''
  try {
    const year    = gsaFiscalYear()
    const cityEnc = encodeURIComponent(trip.destination.trim())
    const state   = trip.state.trim().toUpperCase()
    const url     = `https://api.gsa.gov/travel/perdiem/v2/rates/city/${cityEnc}/state/${state}/year/${year}?api_key=DEMO_KEY`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`GSA API returned ${res.status}`)
    const data = await res.json()

    const entries = data?.rates?.[0]?.rate ?? []
    if (!entries.length) throw new Error(`No GSA data for ${state} FY${year}`)

    const entry = findBestMatch(trip.destination, entries)
    if (!entry) throw new Error(`No rate found for "${trip.destination}"`)

    const monthlyArr = entry.months?.month ?? []
    const gsaMonthlyRates = monthlyArr.length
      ? Object.fromEntries(monthlyArr.map(m => [m.short, m.value]))
      : null

    const monthShort = trip.travelMonth || currentMonth
    const monthEntry = monthlyArr.find(m => m.short === monthShort) ?? monthlyArr[0]
    const lodging    = monthEntry?.value ?? 0
    const mie        = entry.meals ?? 0

    rom.updateTrip(entityId, trip.id, { lodgingRate: lodging, mieRate: mie, gsaMonthlyRates })

    const matched  = entry.city?.trim() ?? ''
    const queried  = trip.destination.trim()
    const peak     = gsaMonthlyRates ? Object.entries(gsaMonthlyRates).sort((a,b)=>b[1]-a[1])[0]?.[0] : null
    const peakNote = peak && peak !== monthShort ? ` · peak: ${peak} $${gsaMonthlyRates[peak]}` : peak === monthShort ? ' ★ peak month' : ''
    gsaError[trip.id] = matched.toLowerCase() !== queried.toLowerCase()
      ? `✓ Matched: ${matched} · $${lodging}/night · $${mie}/day${peakNote}`
      : `✓ GSA FY${year} · $${lodging}/night · $${mie}/day${peakNote}`
  } catch (err) {
    gsaError[trip.id] = err.message
  } finally {
    gsaLoading[trip.id] = false
  }
}

// ── Fuzzy city match ─────────────────────────────────────────────────
function findBestMatch(query, entries) {
  const needle = query.trim().toLowerCase()
  let hit = entries.find(e => e.city?.trim().toLowerCase() === needle)
  if (hit) return hit
  hit = entries.find(e => e.city?.toLowerCase().includes(needle))
  if (hit) return hit
  const words = needle.split(/[\s/,]+/).filter(w => w.length > 3)
  hit = entries.find(e => {
    const ec = e.city?.toLowerCase() ?? ''
    return words.some(w => ec.includes(w))
  })
  if (hit) return hit
  return entries.find(e => e.standardRate === 'true' || e.city === 'Standard Rate') ?? null
}

// ── Month change ─────────────────────────────────────────────────────
function onMonthChange(entityId, trip, newMonth) {
  if (trip.gsaMonthlyRates?.[newMonth] !== undefined) {
    const lodging = trip.gsaMonthlyRates[newMonth]
    rom.updateTrip(entityId, trip.id, { travelMonth: newMonth, lodgingRate: lodging })
    const peak = peakMonth(trip)
    gsaError[trip.id] = `✓ $${lodging}/night · $${trip.mieRate ?? 0}/day${peak === newMonth ? ' ★ peak month' : ''}`
  } else {
    rom.updateTrip(entityId, trip.id, { travelMonth: newMonth })
    if (trip.destination?.trim() && trip.state?.trim().length === 2) {
      lookupGSA(entityId, { ...trip, travelMonth: newMonth })
    }
  }
}

// Returns the month abbreviation with the highest lodging rate
function peakMonth(trip) {
  if (!trip.gsaMonthlyRates) return null
  return Object.entries(trip.gsaMonthlyRates).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

// Option label: "Jun  $237 ★" or just "Jun"
function monthLabel(trip, m) {
  if (!trip.gsaMonthlyRates) return m
  const rate = trip.gsaMonthlyRates[m]
  if (rate === undefined) return m
  const peak = peakMonth(trip)
  return `${m}  $${rate}${m === peak ? ' ★' : ''}`
}

// ── On mount: pre-fetch city lists for states already on trips ────────
onMounted(() => {
  const statesToFetch = new Set()
  rom.visibleEntities.forEach(e => {
    ;(rom.travel[e.id] ?? []).forEach(t => {
      if ((t.region || 'conus') === 'conus' && t.state?.length === 2) {
        statesToFetch.add(t.state)
      }
    })
  })
  statesToFetch.forEach(s => fetchCitiesForState(s))
})
</script>

<style scoped>
.travel-view { padding: 0 0 48px; }

/* Summary strip */
.summary-strip {
  display: grid; grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid var(--rom-border);
  background: var(--rom-surface);
}
.summary-card { padding: 12px 20px; border-right: 1px solid var(--rom-border); }
.summary-card:last-child { border-right: none; }
.summary-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--rom-text-muted); margin-bottom: 3px; }
.summary-value { font-size: 20px; font-weight: 500; }
.summary-card--accent { background: var(--rom-accent-bg); }
.summary-card--accent .summary-label { color: var(--rom-accent-dark); opacity: .8; }
.summary-card--accent .summary-value { color: var(--rom-accent-dark); }

/* GSA info bar */
.gsa-info-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 20px;
  background: var(--rom-accent-bg);
  border-bottom: 1px solid var(--rom-border);
  font-size: 12px; color: var(--rom-accent-dark);
}
.gsa-info-bar .ti { font-size: 13px; flex-shrink: 0; }

/* Entities */
.entities-wrap { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.entity-card { border-radius: var(--rom-radius-lg); border: 1px solid var(--rom-border); overflow: hidden; background: var(--rom-surface); }
.entity-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; }
.entity-head-left { display: flex; align-items: center; gap: 10px; }
.entity--cronos .entity-head { background: #dce8fb; border-bottom: 2px solid #1a5fb4; }
.entity--gov    .entity-head { background: #d6e8f8; border-bottom: 2px solid #185fa5; }
.entity--sub    .entity-head { background: #faeeda; border-bottom: 2px solid #854f0b; }
.entity-pill { font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 10px; }
.entity--cronos .entity-pill { background: #1a5fb4; color: #fff; }
.entity--gov    .entity-pill { background: #185fa5; color: #fff; }
.entity--sub    .entity-pill { background: #854f0b; color: #fff; }
.entity-meta { font-size: 12px; font-weight: 500; color: var(--rom-text-muted); }

/* Trip cards */
.trips-wrap { padding: 12px 16px; display: flex; flex-direction: column; gap: 12px; }

.trip-card {
  border: 1px solid var(--rom-border);
  border-radius: var(--rom-radius);
  overflow: hidden;
}

.trip-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px;
  background: var(--rom-surface-alt);
  border-bottom: 1px solid var(--rom-border);
  gap: 12px;
}
.trip-head-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.trip-head-left .ti { color: var(--rom-accent); font-size: 14px; flex-shrink: 0; }
.trip-name-input {
  flex: 1; border: none; background: transparent;
  font-size: 13px; font-weight: 600; color: var(--rom-text);
  padding: 0; min-width: 0;
}
.trip-name-input::placeholder { color: var(--rom-text-faint); font-weight: 400; }
.trip-name-input:focus { outline: none; border-bottom: 1px solid var(--rom-accent); }
.trip-head-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.trip-total { font-size: 14px; font-weight: 700; color: var(--rom-accent); }
.del-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border: none; border-radius: 4px;
  background: transparent; color: var(--rom-text-faint); cursor: pointer; font-size: 13px;
}
.del-btn:hover { background: #fff0f0; color: var(--rom-danger); }

.trip-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 12px; }

/* Trip rows */
.trip-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

.trip-field { display: flex; flex-direction: column; gap: 4px; }
.trip-field label { font-size: 10px; font-weight: 600; color: var(--rom-text-muted); text-transform: uppercase; letter-spacing: .04em; }
.trip-field--sm { min-width: 100px; }
.trip-field--wide { flex: 1; min-width: 180px; }
.trip-field--action { }

.trip-field input[type="text"],
.trip-field input[type="number"] {
  padding: 5px 8px; border: 1px solid var(--rom-border); border-radius: 5px;
  background: var(--rom-surface); color: var(--rom-text); font-size: 13px;
  width: 100%;
}
.trip-field input:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: transparent; }

.computed-field {
  padding: 5px 8px; border: 1px solid transparent; border-radius: 5px;
  background: var(--rom-readonly); color: var(--rom-text-muted);
  font-size: 13px; font-weight: 600;
}

/* Location dropdowns */
.trip-field--region { min-width: 100px; }
.trip-field--state  { min-width: 160px; flex: 1; }
.trip-field--city   { min-width: 160px; flex: 2; }

.loc-select, .loc-text {
  padding: 5px 8px; border: 1px solid var(--rom-border); border-radius: 5px;
  background: var(--rom-surface); color: var(--rom-text); font-size: 13px;
  width: 100%; cursor: pointer;
}
.loc-select:focus, .loc-text:focus {
  outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: transparent;
}
.city-select { min-width: 140px; }
.city-placeholder {
  padding: 5px 8px; font-size: 12px; color: var(--rom-text-faint); font-style: italic;
  border: 1px dashed var(--rom-border); border-radius: 5px;
}
.oconus-hint { font-size: 11px; color: var(--rom-text-muted); font-style: italic; }
.oconus-hint a { color: var(--rom-accent); }
.state-dept-link {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border: 1px solid var(--rom-border); border-radius: 5px;
  background: var(--rom-surface); color: var(--rom-accent); cursor: pointer;
  font-size: 14px; text-decoration: none;
}
.state-dept-link:hover { background: var(--rom-accent-bg); border-color: var(--rom-accent); }

/* Month select */
.month-select {
  padding: 5px 8px; border: 1px solid var(--rom-border); border-radius: 5px;
  background: var(--rom-surface); color: var(--rom-text); font-size: 13px;
  cursor: pointer; min-width: 72px;
}
.month-select--rich { min-width: 120px; font-variant-numeric: tabular-nums; }
.month-select:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: transparent; }

/* GSA refresh button */
.gsa-refresh-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border: 1px solid var(--rom-border); border-radius: 5px;
  background: var(--rom-surface); color: var(--rom-accent); cursor: pointer;
  font-size: 14px; transition: background .15s, border-color .15s;
}
.gsa-refresh-btn:hover:not(:disabled) { background: var(--rom-accent-bg); border-color: var(--rom-accent); }
.gsa-refresh-btn:disabled { opacity: .4; cursor: default; }
.gsa-refresh-btn.loading { border-color: var(--rom-accent); background: var(--rom-accent-bg); }

/* Rate label + inline spinner */
.rate-label { display: flex; align-items: center; gap: 5px; }
.spin-inline {
  display: inline-block; font-size: 12px; color: var(--rom-accent);
  animation: spin 0.8s linear infinite;
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Status row */
.trip-row--status { margin-top: -4px; }

.gsa-rate-input {
  width: 80px; padding: 5px 8px;
  border: 1px solid var(--rom-border); border-radius: 5px;
  background: var(--rom-surface); color: var(--rom-text);
  font-size: 13px; font-weight: 600; text-align: right;
  transition: border-color .15s, background .15s;
}
.gsa-rate-input.rate-filled {
  border-color: var(--rom-accent);
  background: var(--rom-accent-bg);
  color: var(--rom-accent-dark);
}
.gsa-rate-input:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: transparent; }
.gsa-error { font-size: 11px; color: var(--rom-danger); align-self: flex-end; }
.gsa-match { font-size: 11px; color: var(--rom-accent-dark); align-self: flex-end; font-style: italic; }

/* Services row */
.trip-row--services { align-items: stretch; gap: 10px; }
.service-block {
  flex: 1; min-width: 160px;
  border: 1px solid var(--rom-border); border-radius: 6px;
  padding: 8px 10px;
  background: var(--rom-bg);
  display: flex; flex-direction: column; gap: 5px;
}
.service-block--active { border-color: var(--rom-accent); background: var(--rom-accent-bg); }
.service-block--mie { border-color: var(--rom-border); background: var(--rom-surface-alt); }
.service-check {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: var(--rom-text); cursor: pointer;
}
.service-check input[type="checkbox"] { accent-color: var(--rom-accent); width: 14px; height: 14px; }
.service-check .ti { font-size: 13px; color: var(--rom-text-muted); }
.service-label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--rom-text-muted); }
.service-label .ti { font-size: 13px; }
.service-detail { font-size: 11px; color: var(--rom-text-muted); line-height: 1.5; }
.service-detail strong { color: var(--rom-accent-dark); }
.service-with-input { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.inline-num {
  width: 64px; padding: 2px 5px; text-align: right;
  border: 1px solid var(--rom-border); border-radius: 4px;
  background: var(--rom-surface); color: var(--rom-text); font-size: 11px;
}
.inline-num:focus { outline: 1px solid var(--rom-accent); }

/* Trip total */
.trip-total-field { margin-left: auto; }
.trip-grand-total {
  font-size: 18px; font-weight: 700; color: var(--rom-accent-dark);
  padding: 4px 0;
}

/* Empty + add */
.trips-empty { padding: 12px 0; font-size: 13px; color: var(--rom-text-faint); font-style: italic; }
.trips-add-row { padding-top: 4px; }
.add-trip-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; font-size: 12px;
  border: 1px dashed var(--rom-border); border-radius: var(--rom-radius);
  background: transparent; color: var(--rom-text-muted); cursor: pointer;
}
.add-trip-btn:hover { border-color: var(--rom-accent); color: var(--rom-accent); background: var(--rom-accent-bg); }
</style>
