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
      <span>GSA Per Diem FY{{ gsaFiscalYear() }} — rates load from local database when you pick a city</span>
      <a href="https://www.gsa.gov/travel/plan-book/per-diem-rates" target="_blank" rel="noopener noreferrer" class="gsa-info-link">
        <i class="ti ti-external-link"></i> GSA Per Diem Rates
      </a>
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
                  :value="trip.tripName ?? trip.travelerName ?? ''"
                  placeholder="Site location"
                  class="trip-name-input"
                  @input="rom.updateTrip(entity.id, trip.id, { tripName: $event.target.value })"
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
                  <SearchSelect
                    :model-value="trip.state"
                    :options="US_STATES.map(s => ({ value: s.code, label: s.code + ' — ' + s.name }))"
                    placeholder="Search state…"
                    @update:model-value="onStateChange(entity.id, trip, $event)"
                  />
                </div>

                <!-- 2b. Country (OCONUS) -->
                <div v-else class="trip-field trip-field--state">
                  <label>Country</label>
                  <SearchSelect
                    :model-value="trip.country || ''"
                    :options="COUNTRIES"
                    placeholder="Search country…"
                    @update:model-value="onCountryChange(entity.id, trip, $event)"
                  />
                </div>

                <!-- 3a. City (CONUS) — reads from local conus.xlsx data -->
                <div v-if="(trip.region || 'conus') === 'conus'" class="trip-field trip-field--city">
                  <label>City</label>
                  <SearchSelect v-if="citiesForState(trip.state).length"
                    :model-value="trip.destination"
                    :options="citiesForState(trip.state).map(c => ({ value: c.city, label: c.city }))"
                    placeholder="Search city…"
                    @update:model-value="onCitySelect(entity.id, trip, $event)"
                  />
                  <input v-else-if="trip.state" type="text" class="loc-text"
                    :value="trip.destination"
                    placeholder="Type city name…"
                    @input="rom.updateTrip(entity.id, trip.id, { destination: $event.target.value })"
                  />
                  <div v-else class="city-placeholder">Select a state first</div>
                </div>

                <!-- 3b. Location (OCONUS) -->
                <div v-else class="trip-field trip-field--city">
                  <label>Location / City</label>
                  <SearchSelect v-if="trip.country && oconusLocations(trip.country).length"
                    :model-value="trip.destination"
                    :options="oconusLocations(trip.country).map(l => ({ value: l.location, label: l.location }))"
                    placeholder="Search location…"
                    @update:model-value="onOconusLocationSelect(entity.id, trip, $event)"
                  />
                  <input v-else type="text" class="loc-text"
                    :value="trip.destination"
                    placeholder="e.g. Tokyo"
                    @input="rom.updateTrip(entity.id, trip.id, { destination: $event.target.value })" />
                </div>

              </div>

              <!-- Row 2: Month + rates (CONUS auto-filled; OCONUS manual) -->
              <div class="trip-row">
                <div v-if="(trip.lodgingRate || 0) + (trip.mieRate || 0) > 0" class="trip-field">
                  <label>Per Diem (peak rate)</label>
                  <div class="per-diem-chip" :title="`Lodging $${trip.lodgingRate || 0}/night + M&IE $${trip.mieRate || 0}/day · uses ${trip.travelMonth || 'peak'} (most expensive month)`">
                    <i class="ti ti-coin" aria-hidden="true"></i>
                    ${{ (trip.lodgingRate || 0) + (trip.mieRate || 0) }}/day
                    <span class="per-diem-split">${{ trip.lodgingRate || 0 }} lodging + ${{ trip.mieRate || 0 }} M&amp;IE</span>
                    <span v-if="trip.travelMonth" class="per-diem-peak-tag">{{ trip.travelMonth }} ★</span>
                  </div>
                </div>
                <div class="trip-field trip-field--sm">
                  <label class="rate-label">Hotel/night ($)</label>
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
                  <a v-if="(trip.region || 'conus') === 'conus'"
                    href="https://www.gsa.gov/travel/plan-book/per-diem-rates" target="_blank" rel="noopener noreferrer"
                    class="state-dept-link" title="GSA Per Diem Rates">
                    <i class="ti ti-external-link"></i>
                  </a>
                  <a v-else href="https://allowances.state.gov/web920/per_diem.asp" target="_blank" rel="noopener noreferrer"
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

              <!-- Defaults bar — these values pre-fill any new traveler row and feed each toggle's cost -->
              <div class="defaults-bar">
                <span class="defaults-label">Defaults</span>

                <div class="default-field">
                  <i class="ti ti-clock" aria-hidden="true"></i>
                  <label>Travel hrs</label>
                  <input type="number" min="0" step="0.5"
                    :value="trip.defaultTravelHours ?? 4"
                    @change="rom.updateTrip(entity.id, trip.id, { defaultTravelHours: +$event.target.value })" />
                </div>

                <div class="default-field">
                  <i class="ti ti-bed" aria-hidden="true"></i>
                  <label>Hotel/night</label>
                  <input type="number" min="0" step="1"
                    :value="trip.lodgingRate || 0"
                    @input="rom.updateTrip(entity.id, trip.id, { lodgingRate: +$event.target.value })" />
                  <span class="default-tag">GSA</span>
                </div>

                <div class="default-field">
                  <i class="ti ti-utensils" aria-hidden="true"></i>
                  <label>M&amp;IE/day</label>
                  <input type="number" min="0" step="1"
                    :value="trip.mieRate || 0"
                    @input="rom.updateTrip(entity.id, trip.id, { mieRate: +$event.target.value })" />
                </div>

                <div class="default-field">
                  <i class="ti ti-car" aria-hidden="true"></i>
                  <label>Car/day</label>
                  <input type="number" min="0" step="5"
                    :value="trip.defaultCarRate ?? 75"
                    @change="rom.updateTrip(entity.id, trip.id, { defaultCarRate: +$event.target.value })" />
                </div>

                <div class="default-field">
                  <i class="ti ti-plane" aria-hidden="true"></i>
                  <label>Airfare</label>
                  <input type="number" min="0" step="25"
                    :value="trip.defaultAirfareRate ?? 600"
                    @change="rom.updateTrip(entity.id, trip.id, { defaultAirfareRate: +$event.target.value })" />
                </div>

                <div class="default-field">
                  <i class="ti ti-dots" aria-hidden="true"></i>
                  <label>Misc</label>
                  <input type="number" min="0" step="5"
                    :value="trip.defaultMiscRate ?? 50"
                    @change="rom.updateTrip(entity.id, trip.id, { defaultMiscRate: +$event.target.value })" />
                </div>
              </div>

              <!-- Travelers table -->
              <div v-if="(trip.travelers || []).length" class="travelers-wrap">
                <table class="travelers-table">
                  <thead>
                    <tr>
                      <th class="t-col-name">Traveler</th>
                      <th class="t-col-cat">Pay Cat</th>
                      <th class="t-col-qty">Travelers</th>
                      <th class="t-col-days">Days</th>
                      <th class="t-col-hrs">Travel hrs</th>
                      <th class="t-col-svc">Hotel/M&amp;IE</th>
                      <th class="t-col-svc">Car</th>
                      <th class="t-col-svc">Airfare</th>
                      <th class="t-col-svc">Misc</th>
                      <th class="t-col-total">Total</th>
                      <th class="t-col-del"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="tr in trip.travelers" :key="tr.id" class="traveler-row">
                      <td class="t-col-name">
                        <input type="text"
                          :value="tr.name"
                          placeholder="Traveler"
                          @input="rom.updateTraveler(entity.id, trip.id, tr.id, { name: $event.target.value })" />
                      </td>
                      <td class="t-col-cat">
                        <select
                          :value="tr.laborCat || ''"
                          class="cat-select"
                          @change="rom.updateTraveler(entity.id, trip.id, tr.id, { laborCat: $event.target.value })"
                          :title="rom.showRates && tr.laborCat ? `Travel labor: ${fmt(rom.travelLaborCost(tr))}` : 'Pick a pay category for this traveler'"
                        >
                          <option value="">— Pay cat —</option>
                          <option v-for="cat in rom.LABOR_CATS" :key="cat.id" :value="cat.id">
                            {{ rom.showRates ? `${cat.label} ($${cat.defaultRate}/hr)` : cat.label }}
                          </option>
                        </select>
                      </td>
                      <td class="t-col-qty">
                        <input type="number" min="1" step="1"
                          :value="tr.qty || 1"
                          @change="rom.updateTraveler(entity.id, trip.id, tr.id, { qty: Math.max(1, +$event.target.value || 1) })" />
                      </td>
                      <td class="t-col-days">
                        <input type="number" min="0" step="0.5"
                          :value="tr.days || 0"
                          @change="rom.updateTraveler(entity.id, trip.id, tr.id, { days: +$event.target.value || 0 })" />
                      </td>
                      <td class="t-col-hrs">
                        <input type="number" min="0" step="0.5"
                          :value="tr.travelHours ?? trip.defaultTravelHours ?? 4"
                          @change="rom.updateTraveler(entity.id, trip.id, tr.id, { travelHours: +$event.target.value || 0 })" />
                      </td>
                      <td class="t-col-svc">
                        <div class="svc-cell" :class="{ 'svc-cell--on': tr.hotel }">
                          <label class="svc-row">
                            <input type="checkbox" :checked="tr.hotel"
                              @change="rom.updateTraveler(entity.id, trip.id, tr.id, { hotel: $event.target.checked })" />
                            <span class="svc-cost">{{ tr.hotel ? fmt(hotelCost(trip, tr)) : '—' }}</span>
                            <button v-if="tr.hotel" class="breakdown-btn"
                              @click.stop.prevent="openBreakdown = { entityId: entity.id, trip, tr }"
                              title="View day-by-day breakdown">
                              <i class="ti ti-info-circle"></i>
                            </button>
                          </label>
                          <div v-if="tr.hotel" class="svc-rate-row">
                            <input type="number" min="0" step="1"
                              :value="effLodging(trip, tr)"
                              class="svc-rate-input"
                              :class="{ 'svc-rate-input--override': isOverride(tr, 'lodgingRate', 'lodgingRate', trip) }"
                              :title="`Lodging per night · trip default $${trip.lodgingRate || 0}`"
                              @change="rom.updateTraveler(entity.id, trip.id, tr.id, { lodgingRate: +$event.target.value })" />
                          </div>
                        </div>
                      </td>
                      <td class="t-col-svc">
                        <div class="svc-cell" :class="{ 'svc-cell--on': tr.car }">
                          <label class="svc-row">
                            <input type="checkbox" :checked="tr.car"
                              @change="rom.updateTraveler(entity.id, trip.id, tr.id, { car: $event.target.checked })" />
                            <span class="svc-cost">{{ tr.car ? fmt(carCost(trip, tr)) : '—' }}</span>
                          </label>
                          <div v-if="tr.car" class="svc-rate-row">
                            <input type="number" min="0" step="5"
                              :value="effCar(trip, tr)"
                              class="svc-rate-input"
                              :class="{ 'svc-rate-input--override': isOverride(tr, 'carRate', 'defaultCarRate', trip) }"
                              :title="`Rental car per day · trip default $${trip.defaultCarRate || 75}`"
                              @change="rom.updateTraveler(entity.id, trip.id, tr.id, { carRate: +$event.target.value })" />
                          </div>
                        </div>
                      </td>
                      <td class="t-col-svc">
                        <div class="svc-cell" :class="{ 'svc-cell--on': tr.airfare }">
                          <label class="svc-row">
                            <input type="checkbox" :checked="tr.airfare"
                              @change="rom.updateTraveler(entity.id, trip.id, tr.id, { airfare: $event.target.checked })" />
                            <span class="svc-cost">{{ tr.airfare ? fmt(airfareCost(trip, tr)) : '—' }}</span>
                          </label>
                          <div v-if="tr.airfare" class="svc-rate-row">
                            <input type="number" min="0" step="25"
                              :value="effAirfare(trip, tr)"
                              class="svc-rate-input"
                              :class="{ 'svc-rate-input--override': isOverride(tr, 'airfareRate', 'defaultAirfareRate', trip) }"
                              :title="`Airfare per ticket · trip default $${trip.defaultAirfareRate || 600}`"
                              @change="rom.updateTraveler(entity.id, trip.id, tr.id, { airfareRate: +$event.target.value })" />
                          </div>
                        </div>
                      </td>
                      <td class="t-col-svc">
                        <div class="svc-cell" :class="{ 'svc-cell--on': tr.misc }">
                          <label class="svc-row">
                            <input type="checkbox" :checked="tr.misc"
                              @change="rom.updateTraveler(entity.id, trip.id, tr.id, { misc: $event.target.checked })" />
                            <span class="svc-cost">{{ tr.misc ? fmt(miscCost(trip, tr)) : '—' }}</span>
                          </label>
                          <div v-if="tr.misc" class="svc-rate-row">
                            <input type="number" min="0" step="5"
                              :value="effMisc(trip, tr)"
                              class="svc-rate-input"
                              :class="{ 'svc-rate-input--override': isOverride(tr, 'miscRate', 'defaultMiscRate', trip) }"
                              :title="`Misc per person · trip default $${trip.defaultMiscRate || 50}`"
                              @change="rom.updateTraveler(entity.id, trip.id, tr.id, { miscRate: +$event.target.value })" />
                          </div>
                        </div>
                      </td>
                      <td class="t-col-total">{{ fmt(rom.travelerCost(trip, tr) + rom.travelLaborCost(tr)) }}</td>
                      <td class="t-col-del">
                        <button class="del-btn" @click="rom.removeTraveler(entity.id, trip.id, tr.id)" title="Remove traveler">
                          <i class="ti ti-trash" aria-hidden="true"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="trip-footer-bar">
                <button class="add-traveler-btn" @click="rom.addTraveler(entity.id, trip.id)">
                  <i class="ti ti-plus" aria-hidden="true"></i> Add traveler
                </button>
                <div class="trip-equation">
                  <template v-if="tripLaborTotal(trip) > 0">
                    <div class="trip-eq-block">
                      <span class="trip-eq-label">Travel Labor</span>
                      <span class="trip-eq-value">{{ fmt(tripLaborTotal(trip)) }}</span>
                    </div>
                    <span class="trip-eq-op">+</span>
                    <div class="trip-eq-block">
                      <span class="trip-eq-label">Travel</span>
                      <span class="trip-eq-value">{{ fmt(rom.tripCost(trip) - tripLaborTotal(trip)) }}</span>
                    </div>
                    <span class="trip-eq-op">=</span>
                  </template>
                  <div class="trip-eq-block trip-eq-block--total">
                    <span class="trip-total-label">Trip Total</span>
                    <span class="trip-total-value">{{ fmt(rom.tripCost(trip)) }}</span>
                  </div>
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

    <!-- Hotel / M&IE day-by-day breakdown popup -->
    <div v-if="openBreakdown" class="breakdown-overlay" @click.self="openBreakdown = null">
      <div class="breakdown-card">
        <div class="breakdown-header">
          <span class="breakdown-title">Hotel &amp; M&amp;IE Breakdown</span>
          <button class="breakdown-close" @click="openBreakdown = null">×</button>
        </div>

        <table class="breakdown-table">
          <thead>
            <tr>
              <th>Day</th>
              <th class="bd-num">M&amp;IE</th>
              <th class="bd-num">Lodging</th>
              <th class="bd-num">Daily Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in breakdownDays(openBreakdown.trip, openBreakdown.tr)" :key="row.day"
                :class="{ 'bd-row--part': row.partial }">
              <td class="bd-day">{{ row.label }}</td>
              <td class="bd-num">
                {{ fmt(row.mie) }}
                <span v-if="row.partial" class="bd-pct">75%</span>
              </td>
              <td class="bd-num">{{ row.lodging > 0 ? fmt(row.lodging) : '—' }}</td>
              <td class="bd-num bd-day-total">{{ fmt(row.mie + row.lodging) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="bd-subtotal">
              <td>Per traveler</td>
              <td class="bd-num" colspan="2"></td>
              <td class="bd-num">{{ fmt(breakdownDays(openBreakdown.trip, openBreakdown.tr).reduce((s,r) => s + r.mie + r.lodging, 0)) }}</td>
            </tr>
            <tr v-if="(openBreakdown.tr.qty || 1) > 1" class="bd-total">
              <td>Total (× {{ openBreakdown.tr.qty }} travelers)</td>
              <td class="bd-num" colspan="2"></td>
              <td class="bd-num">{{ fmt(hotelCost(openBreakdown.trip, openBreakdown.tr)) }}</td>
            </tr>
          </tfoot>
        </table>

        <label class="fld-checkbox">
          <input type="checkbox"
            :checked="openBreakdown.tr.firstLastDay ?? true"
            @change="rom.updateTraveler(openBreakdown.entityId, openBreakdown.trip.id, openBreakdown.tr.id, { firstLastDay: $event.target.checked })" />
          Apply first &amp; last day travel rule <span class="fld-hint">(75% M&amp;IE on travel days)</span>
        </label>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRomStore } from '../stores/rom'
import SearchSelect from '../components/SearchSelect.vue'

const rom = useRomStore()

const MONTHS       = ['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep']
const currentMonth = new Date().toLocaleString('en-US', { month: 'short' })

const gsaError      = reactive({})
const stateCities   = reactive({})
const openBreakdown = ref(null)   // { entityId, trip, tr } when popup is open

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

// Scope visible trips to the currently active COA (matches Labor view behavior)
const allTrips     = computed(() => rom.visibleEntities.flatMap(e => trips(e.id)))
const totalPersons = computed(() =>
  allTrips.value.reduce((s, t) => s + (t.travelers || []).reduce((a, tr) => a + (tr.qty || 1), 0), 0))
const totalHours   = computed(() =>
  allTrips.value.reduce((s, t) => s + (t.travelers || []).reduce(
    (a, tr) => a + (tr.travelHours ?? t.defaultTravelHours ?? 0) * (tr.qty || 1), 0), 0))

// Per-day M&IE + lodging breakdown for the popup
function breakdownDays(trip, tr) {
  const days    = Math.max(0, tr.days || 0)
  const mie     = effMie(trip, tr)
  const lodging = effLodging(trip, tr)
  const useFLD  = (tr.firstLastDay ?? true) && days > 0
  const rows    = []
  for (let i = 1; i <= days; i++) {
    const isFirst = i === 1
    const isLast  = i === days && days > 1
    const partial = useFLD && (isFirst || isLast)
    const mieAmt  = partial ? mie * 0.75 : mie
    const lodgingAmt = i < days ? lodging : 0
    let label = `Day ${i}`
    if (isFirst && days > 1) label += ' — First'
    if (isLast)              label += ' — Last'
    rows.push({ day: i, label, mie: mieAmt, lodging: lodgingAmt, partial })
  }
  return rows
}

function tripLaborTotal(trip) {
  return (trip.travelers || []).reduce((s, tr) => s + rom.travelLaborCost(tr), 0)
}

function trips(entityId) {
  const coaId = rom.activeCoaId
  return (rom.travel[entityId] ?? []).filter(t => (t.coaId ?? rom.coas[0]?.id) === coaId)
}
function entityTotal(entityId){ return trips(entityId).reduce((s, t) => s + rom.tripCost(t), 0) }
function fmt(n)               { return '$' + Math.round(n || 0).toLocaleString() }

// Effective rate getters — per-row override falls back to trip default
function effLodging(trip, tr) { return tr.lodgingRate != null ? tr.lodgingRate : (trip.lodgingRate || 0) }
function effMie(trip, tr)     { return tr.mieRate     != null ? tr.mieRate     : (trip.mieRate     || 0) }
function effCar(trip, tr)     { return tr.carRate     != null ? tr.carRate     : (trip.defaultCarRate     || 0) }
function effAirfare(trip, tr) { return tr.airfareRate != null ? tr.airfareRate : (trip.defaultAirfareRate || 0) }
function effMisc(trip, tr)    { return tr.miscRate    != null ? tr.miscRate    : (trip.defaultMiscRate    || 0) }

// Per-toggle cost helpers — match what travelerCost() computes in the store
function hotelCost(trip, tr) {
  const qty    = Math.max(1, tr.qty || 1)
  const days   = Math.max(0, tr.days || 0)
  const nights = Math.max(0, days - 1)
  return qty * (effLodging(trip, tr) * nights + effMie(trip, tr) * days)
}
function carCost(trip, tr) {
  const qty  = Math.max(1, tr.qty || 1)
  const days = Math.max(0, tr.days || 0)
  return qty * effCar(trip, tr) * days
}
function airfareCost(trip, tr) {
  return Math.max(1, tr.qty || 1) * effAirfare(trip, tr)
}
function miscCost(trip, tr) {
  return Math.max(1, tr.qty || 1) * effMisc(trip, tr)
}

// True when the row's rate differs from the trip default (drives a small visual cue)
function isOverride(tr, field, tripField, trip) {
  const r = tr?.[field]
  if (r == null) return false
  return r !== (trip?.[tripField] ?? 0)
}

// ── GSA Fiscal Year ──────────────────────────────────────────────────
function gsaFiscalYear() {
  const d = new Date()
  return d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear()
}

// ── Build city list for a state from local conus.xlsx data ──────────
function fetchCitiesForState(stateCode) {
  if (!stateCode || stateCode.length !== 2) return
  if (stateCities[stateCode]) return  // already built
  stateCities[stateCode] = citiesForState(stateCode)
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

// City list for a state — reads entirely from local conus.xlsx data
function citiesForState(stateCode) {
  if (!stateCode) return []
  const map = rom.gsaRateMap
  if (!map) return []
  const matches = []
  for (const [key, val] of Object.entries(map)) {
    if (!key.endsWith(`|${stateCode}`)) continue
    const cityRaw = key.slice(0, key.lastIndexOf('|'))
    const city    = cityRaw.replace(/\b\w/g, c => c.toUpperCase())
    matches.push({
      city,
      lodging:         val.lodging || 0,
      mie:             val.mie     || 0,
      gsaMonthlyRates: val.months  || null,
    })
  }
  return matches.sort((a, b) => a.city.localeCompare(b.city))
}


function onCitySelect(entityId, trip, cityName) {
  // Find the enriched city entry — check live cache first, then the pre-loaded rates file
  const cached = stateCities[trip.state]?.find(c => c.city === cityName)
    ?? citiesForState(trip.state).find(c => c.city === cityName)
  if (!cached) {
    rom.updateTrip(entityId, trip.id, { destination: cityName })
    return
  }

  // Always pick the peak (most expensive) month's lodging rate — no user month choice.
  const monthlyEntries = cached.gsaMonthlyRates
    ? Object.entries(cached.gsaMonthlyRates).sort((a, b) => b[1] - a[1])
    : []
  const [peakName, peakRate] = monthlyEntries[0] ?? [null, cached.lodging ?? 0]

  rom.updateTrip(entityId, trip.id, {
    destination:     cityName,
    lodgingRate:     peakRate || 0,
    mieRate:         cached.mie ?? 0,
    gsaMonthlyRates: cached.gsaMonthlyRates ?? null,
    travelMonth:     peakName,   // kept only as a label so we can show which month is peak
  })

  const peakNote = peakName ? ` · peak: ${peakName} ★` : ''
  gsaError[trip.id] = `✓ GSA FY${gsaFiscalYear()} · $${peakRate}/night · $${cached.mie ?? 0}/day${peakNote}`
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
.gsa-info-link {
  margin-left: auto; flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600;
  color: var(--rom-accent); text-decoration: none;
  opacity: 0.8;
  transition: opacity .15s;
}
.gsa-info-link:hover { opacity: 1; text-decoration: underline; }

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
  flex: 1; min-width: 0;
  font-size: 13px; font-weight: 600; color: var(--rom-text);
  padding: 5px 10px;
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: 5px;
  font-family: inherit;
}
.trip-name-input::placeholder { color: var(--rom-text-faint); font-weight: 400; }
.trip-name-input:hover { border-color: var(--rom-accent); }
.trip-name-input:focus {
  outline: 2px solid var(--rom-accent);
  outline-offset: -1px;
  border-color: var(--rom-accent);
}
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
.trip-field--sm { min-width: 120px; }
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
  width: 120px; padding: 6px 9px;
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

/* ─── Defaults bar ─────────────────────────────────────────────── */
.defaults-bar {
  display: flex; align-items: center; flex-wrap: wrap; gap: 14px;
  padding: 8px 14px;
  background: #fdf6e3;
  border-top: 1px solid #c4cede;
  border-bottom: 1px solid #c4cede;
}
.defaults-label {
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: #8a6508;
  padding-right: 6px;
}
.default-field {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px;
}
.default-field i { font-size: 13px; color: #8a6508; }
.default-field label { color: #5f5e5a; }
.default-field input {
  width: 110px; padding: 4px 8px;
  border: 1px solid #b8860b; border-radius: 3px;
  font-weight: 700; text-align: center;
  color: var(--rom-accent-dark, #1248a0);
  background: #fff;
}
.default-field input:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; }
.default-tag {
  font-size: 9px; padding: 1px 4px; border-radius: 3px;
  background: #fff; color: #8a6508; opacity: .75;
  border: 1px solid #b8860b;
}

:root[data-theme="dark"] .defaults-bar {
  background: rgba(255, 200, 80, 0.06);
  border-top-color: var(--rom-border);
  border-bottom-color: var(--rom-border);
}
:root[data-theme="dark"] .defaults-label { color: var(--rom-text-muted); }
:root[data-theme="dark"] .default-field i { color: var(--rom-text-muted); }
:root[data-theme="dark"] .default-field label { color: var(--rom-text-muted); }
:root[data-theme="dark"] .default-field input {
  background: var(--rom-surface-alt);
  border-color: var(--rom-border);
  color: var(--rom-text);
}
:root[data-theme="dark"] .default-tag {
  background: transparent;
  color: var(--rom-text-muted);
  border-color: var(--rom-border);
  opacity: 1;
}

/* ─── Travelers table ──────────────────────────────────────────── */
.travelers-wrap { padding: 10px 14px 0; overflow-x: auto; }
.travelers-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.travelers-table th {
  text-align: left; padding: 8px 10px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .05em; color: var(--rom-text-muted);
  border-bottom: 2px solid var(--rom-border);
  background: var(--rom-surface);
  white-space: nowrap;
}
.t-col-name  { width: 100px; }
.t-col-cat   { width: 145px; }
.t-col-qty   { width: 66px;  text-align: center !important; }
.t-col-days  { width: 66px;  text-align: center !important; }
.t-col-hrs   { width: 72px;  text-align: center !important; }
.t-col-svc   { width: 110px; }
.t-col-total { width: 82px;  text-align: right !important; }
.t-col-del   { width: 36px; }

.cat-select {
  width: 100%; padding: 5px 7px; font-size: 12px;
  border: 1px solid var(--rom-border); border-radius: 4px;
  background: var(--rom-surface); color: var(--rom-text);
}
.cat-select:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: var(--rom-accent); }

.traveler-row td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--rom-border);
  vertical-align: middle;
}
.traveler-row td input[type="text"],
.traveler-row td input[type="number"] {
  width: 100%; padding: 7px 9px; font-size: 13px;
  border: 1px solid var(--rom-border); border-radius: 4px;
  background: var(--rom-surface); color: var(--rom-text);
}
.traveler-row .t-col-qty input,
.traveler-row .t-col-days input,
.traveler-row .t-col-hrs input { text-align: center; }
.traveler-row .t-col-total { font-weight: 700; color: var(--rom-text); text-align: right; white-space: nowrap; }

/* Service cells */
.svc-cell {
  display: flex; flex-direction: column; gap: 6px;
  padding: 8px 10px; border-radius: 6px;
  background: var(--rom-surface-alt);
  border: 1px solid transparent;
  transition: background .12s, border-color .12s;
}
.svc-cell:hover { background: #dfe7f5; }
.svc-cell--on { background: var(--rom-accent-bg); border-color: var(--rom-accent); }

.svc-row {
  display: flex; align-items: center; gap: 7px; cursor: pointer;
}
.svc-row input[type="checkbox"] {
  margin: 0; width: 15px; height: 15px; cursor: pointer;
  accent-color: var(--rom-accent); flex-shrink: 0;
}
.svc-cost {
  font-size: 13px; font-weight: 700; color: var(--rom-text-faint);
  font-variant-numeric: tabular-nums;
}
.svc-cell--on .svc-cost { color: var(--rom-accent-dark); }

.svc-rate-row {
  display: flex; align-items: center; gap: 4px;
}
.svc-rate-input {
  flex: 1; min-width: 0; padding: 5px 7px; font-size: 12px; text-align: right;
  border: 1px solid var(--rom-border); border-radius: 4px;
  background: var(--rom-surface); color: var(--rom-text);
}
.svc-rate-input:focus { outline: 1px solid var(--rom-accent); outline-offset: -1px; }
.svc-rate-input--override { font-weight: 700; border-color: var(--rom-accent); }
.svc-unit { font-size: 10px; color: var(--rom-text-muted); white-space: nowrap; }

/* ─── Per-diem chip (always shows the peak-month rate) ────────── */
.per-diem-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: #fdf6e3;
  border: 1px solid #b8860b;
  border-radius: 10px;
  font-size: 12px; font-weight: 700;
  color: #8a6508;
  width: fit-content;
}
.per-diem-chip i { font-size: 13px; }
.per-diem-split {
  font-size: 10px; opacity: .75; font-weight: 500;
  margin-left: 2px;
}
.per-diem-peak-tag {
  font-size: 9px; font-weight: 700;
  padding: 1px 6px; border-radius: 3px;
  background: #b8860b; color: #fff;
  letter-spacing: .04em; margin-left: 4px;
}

:root[data-theme="dark"] .per-diem-chip {
  background: rgba(255, 200, 80, 0.08);
  border-color: rgba(255, 200, 80, 0.25);
  color: #e8c76a;
}
:root[data-theme="dark"] .per-diem-peak-tag {
  background: rgba(255, 200, 80, 0.2);
  color: #f5d87a;
  border: 1px solid rgba(255, 200, 80, 0.3);
}

/* ─── Trip footer (Add traveler + Trip total) ─────────────────── */
.trip-footer-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  background: var(--rom-surface-alt);
  border-top: 2px solid var(--rom-border);
}
.add-traveler-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px;
  font-size: 12px; font-weight: 600;
  border: 1px solid var(--rom-accent);
  border-radius: var(--rom-radius);
  background: var(--rom-accent); color: #fff;
  cursor: pointer;
}
.add-traveler-btn:hover { background: var(--rom-accent-dark); border-color: var(--rom-accent-dark); }
.add-traveler-btn .ti { font-size: 14px; }
.trip-equation {
  display: flex; align-items: center; gap: 10px;
}
.trip-eq-block {
  display: flex; flex-direction: column; align-items: flex-end; gap: 1px;
}
.trip-eq-label {
  font-size: 10px; font-weight: 600;
  color: var(--rom-text-muted);
  text-transform: uppercase; letter-spacing: .04em;
}
.trip-eq-value {
  font-size: 14px; font-weight: 700;
  color: var(--rom-text);
  font-variant-numeric: tabular-nums;
}
.trip-eq-op {
  font-size: 16px; font-weight: 400;
  color: var(--rom-text-muted);
  padding-top: 12px;
}
.trip-eq-block--total { margin-left: 2px; }
.trip-total-label {
  font-size: 11px; font-weight: 700;
  color: var(--rom-text-muted);
  text-transform: uppercase; letter-spacing: .04em;
}
.trip-total-value {
  font-size: 18px; font-weight: 800;
  color: var(--rom-accent-dark);
}

/* ─── Breakdown info button ────────────────────────────────────── */
.breakdown-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; margin-left: 4px;
  border: none; background: transparent; padding: 0;
  color: var(--rom-text-faint); cursor: pointer; font-size: 13px;
  border-radius: 3px; flex-shrink: 0;
  transition: color .12s;
}
.breakdown-btn:hover { color: var(--rom-accent); }

/* ─── Breakdown popup overlay & card ──────────────────────────── */
.breakdown-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.35);
  display: flex; align-items: center; justify-content: center;
}
.breakdown-card {
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,.18);
  padding: 20px 24px;
  min-width: 380px; max-width: 540px; width: 100%;
  display: flex; flex-direction: column; gap: 16px;
}
.breakdown-header {
  display: flex; align-items: center; justify-content: space-between;
}
.breakdown-title {
  font-size: 14px; font-weight: 700; color: var(--rom-text);
}
.breakdown-close {
  background: none; border: none; font-size: 18px; cursor: pointer;
  color: var(--rom-text-muted); line-height: 1; padding: 0 4px;
}
.breakdown-close:hover { color: var(--rom-danger); }

/* Day-by-day table */
.breakdown-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
}
.breakdown-table th {
  text-align: left; padding: 5px 8px;
  font-size: 10px; text-transform: uppercase; letter-spacing: .05em;
  color: var(--rom-text-muted); border-bottom: 2px solid var(--rom-border);
}
.breakdown-table td {
  padding: 6px 8px; border-bottom: 1px solid var(--rom-border);
  color: var(--rom-text);
}
.bd-num { text-align: right; font-variant-numeric: tabular-nums; }
.bd-day { color: var(--rom-text-muted); font-size: 12px; }
.bd-pct {
  font-size: 9px; font-weight: 700; margin-left: 4px;
  padding: 1px 4px; border-radius: 3px;
  background: var(--rom-accent-bg); color: var(--rom-accent-dark);
}
.bd-row--part .bd-day { font-style: italic; }
.bd-day-total { font-weight: 700; }
.bd-subtotal td { background: var(--rom-surface-alt); font-weight: 600; padding-top: 8px; }
.bd-total td {
  background: var(--rom-accent-bg); font-weight: 700;
  color: var(--rom-accent-dark); border-bottom: none;
}

/* First/last day checkbox */
.fld-checkbox {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 500; color: var(--rom-text);
  cursor: pointer;
  padding: 10px 12px;
  background: var(--rom-surface-alt);
  border: 1px solid var(--rom-border);
  border-radius: 6px;
}
.fld-checkbox input[type="checkbox"] { accent-color: var(--rom-accent); width: 15px; height: 15px; cursor: pointer; }
.fld-hint { font-size: 11px; color: var(--rom-text-muted); font-weight: 400; margin-left: 2px; }
</style>
