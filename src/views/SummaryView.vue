<template>
  <div class="summary-view">

    <!-- ── Hero strip — quote grand total across all INCLUDED scopes ── -->
    <div class="hero-strip">
      <div class="hero-left">
        <div class="hero-label">Quote Grand Total (loaded)</div>
        <div class="hero-value">{{ fmt(rom.totalLoadedForQuote) }}</div>
        <div class="hero-sub">
          {{ includedScopes.length }} of {{ rom.coas.length }} scope{{ rom.coas.length === 1 ? '' : 's' }} included
          <span v-if="excludedScopes.length" class="hero-excluded">
            · {{ excludedScopes.length }} excluded
          </span>
        </div>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <div class="hero-stat-label">Labor</div>
          <div class="hero-stat-value">{{ fmt(rom.engineeringTotalForQuote) }}</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-label">Travel</div>
          <div class="hero-stat-value">{{ fmt(rom.travelTotalForQuote) }}</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-label">Material</div>
          <div class="hero-stat-value">{{ fmt(rom.materialTotalForQuote) }}</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-label">Active scope</div>
          <div class="hero-stat-value">{{ fmt(rom.totalLoadedCost) }}</div>
        </div>
      </div>
    </div>

    <!-- ── Escalation callout — shown when escalation is configured ── -->
    <div v-if="rom.escalationFactor > 1" class="escalation-strip">
      <i class="ti ti-trending-up" aria-hidden="true"></i>
      <span>
        Labor escalated at
        <strong>{{ rom.project.escalationPct }}%/yr × {{ rom.project.escalationYears }} yrs</strong>
        — multiplier ×{{ rom.escalationFactor.toFixed(3) }}
      </span>
      <span class="esc-totals">
        Base labor: <strong>{{ fmt(rom.engineeringTotalForQuote) }}</strong>
        &nbsp;→&nbsp;
        Escalated: <strong class="esc-value">{{ fmt(rom.engineeringTotalForQuote * rom.escalationFactor) }}</strong>
      </span>
    </div>

    <!-- ── Empty state hint ─────────────────────────────────────────── -->
    <div v-if="!includedScopes.length" class="empty-banner">
      No scopes ticked for the quote. Open the Scopes dropdown and tick the ones you want.
    </div>

    <!-- ── Single scope: clean two-column breakdown ─────────────────── -->
    <div v-if="includedScopes.length === 1" class="sum-card">
      <div class="sum-card-head">{{ includedScopes[0].name }}</div>
      <table class="break-table">
        <tbody>
          <template v-for="c in includedScopes" :key="c.id">
            <tr class="break-section-row"><td colspan="3">Labor</td></tr>
            <tr v-for="role in rom.ROLES" :key="`r-${role.id}`" class="break-detail-row">
              <td class="col-label-cell"><i class="ti" :class="role.icon"></i> {{ role.label }}</td>
              <td class="amt">{{ fmt(coaLaborByRole(c.id, role.id)) }}</td>
              <td class="amt col-pct">{{ pct(coaLaborByRole(c.id, role.id)) }}</td>
            </tr>
            <template v-for="role in rom.ROLES" :key="`tl-${role.id}`">
              <tr v-if="rom.travelLaborByRole(role.id, c.id) > 0" class="break-detail-row break-detail-row--travel-labor">
                <td class="col-label-cell travel-labor-sub"><i class="ti ti-car"></i> {{ role.label }} — travel time</td>
                <td class="amt">{{ fmt(rom.travelLaborByRole(role.id, c.id)) }}</td>
                <td class="amt col-pct">{{ pct(rom.travelLaborByRole(role.id, c.id)) }}</td>
              </tr>
            </template>
            <tr class="break-sub-row">
              <td>Labor subtotal</td>
              <td class="amt">{{ fmt(rom.laborTotalFor(c.id)) }}</td>
              <td class="amt col-pct">{{ pct(rom.laborTotalFor(c.id)) }}</td>
            </tr>

            <tr class="break-section-row"><td colspan="3">Travel Expenses</td></tr>
            <tr class="break-detail-row">
              <td class="col-label-cell"><i class="ti ti-plane"></i> Hotel, car, airfare &amp; misc</td>
              <td class="amt">{{ fmt(rom.travelTotalFor(c.id)) }}</td>
              <td class="amt col-pct">{{ pct(rom.travelTotalFor(c.id)) }}</td>
            </tr>

            <tr class="break-section-row"><td colspan="3">Material</td></tr>
            <tr class="break-detail-row">
              <td class="col-label-cell"><i class="ti ti-package"></i> Equipment (unloaded)</td>
              <td class="amt">{{ fmt(rom.materialUnloadedFor(c.id)) }}</td>
              <td class="amt col-pct">{{ pct(rom.materialUnloadedFor(c.id)) }}</td>
            </tr>
            <tr class="break-detail-row">
              <td class="col-label-cell">Shipping ({{ (rom.material.shippingPct * 100).toFixed(1) }}%)</td>
              <td class="amt">{{ fmt(rom.materialUnloadedFor(c.id) * rom.material.shippingPct) }}</td>
              <td class="amt col-pct">{{ pct(rom.materialUnloadedFor(c.id) * rom.material.shippingPct) }}</td>
            </tr>
            <tr class="break-sub-row">
              <td>Material subtotal</td>
              <td class="amt">{{ fmt(rom.materialTotalFor(c.id)) }}</td>
              <td class="amt col-pct">{{ pct(rom.materialTotalFor(c.id)) }}</td>
            </tr>

            <tr class="break-sub-row break-sub-row--strong">
              <td>Unloaded subtotal</td>
              <td class="amt">{{ fmt(rom.coaTotals(c.id).unloaded) }}</td>
              <td class="amt col-pct">{{ pct(rom.coaTotals(c.id).unloaded) }}</td>
            </tr>

            <tr class="break-section-row"><td colspan="3">Overhead</td></tr>
            <tr class="break-detail-row">
              <td class="col-label-cell">Project overhead (SCP + Global + Gov + Mgmt rsv)</td>
              <td class="amt">{{ fmt(rom.coaTotals(c.id).ohTotal) }}</td>
              <td class="amt col-pct">{{ pct(rom.coaTotals(c.id).ohTotal) }}</td>
            </tr>
            <tr class="break-detail-row">
              <td class="col-label-cell">SCR loading</td>
              <td class="amt">{{ fmt(rom.coaTotals(c.id).scr) }}</td>
              <td class="amt col-pct">{{ pct(rom.coaTotals(c.id).scr) }}</td>
            </tr>

            <tr class="break-grand-row">
              <td>Loaded total</td>
              <td class="amt col-total">{{ fmt(rom.coaTotals(c.id).totalLoaded) }}</td>
              <td class="amt col-pct col-pct--grand">{{ pct(rom.coaTotals(c.id).totalLoaded) }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- ── Multiple scopes: side-by-side columns ──────────────────────── -->
    <div v-if="includedScopes.length > 1" class="sum-card sum-card--scroll">
      <div class="sum-card-head">Full breakdown — side-by-side</div>
      <table class="break-table break-table--cols">
        <thead>
          <tr>
            <th class="col-label">Line item</th>
            <th v-for="c in includedScopes" :key="c.id" class="amt col-scope" :class="{ 'col-scope--zero': rom.coaTotals(c.id).totalLoaded === 0 }">
              <div>{{ c.name.split(' — ')[0] || c.name }}</div>
              <div class="th-sub" v-if="c.name.includes(' — ')">{{ c.name.split(' — ').slice(1).join(' — ') }}</div>
              <div v-if="rom.coaTotals(c.id).totalLoaded === 0" class="th-zero-badge">$0 — empty</div>
            </th>
            <th class="amt col-total">Total</th>
            <th class="amt col-pct">% loaded</th>
          </tr>
        </thead>
        <tbody>

          <!-- Labor section -->
          <tr class="break-section-row"><td :colspan="cols">Labor</td></tr>
          <tr v-for="role in rom.ROLES" :key="`r-${role.id}`" class="break-detail-row">
            <td class="col-label-cell"><i class="ti" :class="role.icon"></i> {{ role.label }}</td>
            <td v-for="c in includedScopes" :key="c.id" class="amt">
              {{ fmt(coaLaborByRole(c.id, role.id)) }}
            </td>
            <td class="amt col-total">{{ fmt(rolledLabor(role.id)) }}</td>
            <td class="amt col-pct">{{ pct(rolledLabor(role.id)) }}</td>
          </tr>
          <template v-for="role in rom.ROLES" :key="`tl-${role.id}`">
            <tr v-if="includedScopes.some(c => rom.travelLaborByRole(role.id, c.id) > 0)"
                class="break-detail-row break-detail-row--travel-labor">
              <td class="col-label-cell travel-labor-sub"><i class="ti ti-car" aria-hidden="true"></i> {{ role.label }} — travel time</td>
              <td v-for="c in includedScopes" :key="c.id" class="amt">
                {{ fmt(rom.travelLaborByRole(role.id, c.id)) }}
              </td>
              <td class="amt col-total">{{ fmt(sum(includedScopes, c => rom.travelLaborByRole(role.id, c.id))) }}</td>
              <td class="amt col-pct">{{ pct(sum(includedScopes, c => rom.travelLaborByRole(role.id, c.id))) }}</td>
            </tr>
          </template>
          <tr class="break-sub-row">
            <td>Labor subtotal</td>
            <td v-for="c in includedScopes" :key="c.id" class="amt">{{ fmt(rom.laborTotalFor(c.id)) }}</td>
            <td class="amt col-total">{{ fmt(sum(includedScopes, c => rom.laborTotalFor(c.id))) }}</td>
            <td class="amt col-pct">{{ pct(sum(includedScopes, c => rom.laborTotalFor(c.id))) }}</td>
          </tr>

          <!-- Travel section -->
          <tr class="break-section-row"><td :colspan="cols">Travel Expenses</td></tr>
          <tr class="break-detail-row">
            <td class="col-label-cell"><i class="ti ti-plane" aria-hidden="true"></i> Hotel, car, airfare &amp; misc</td>
            <td v-for="c in includedScopes" :key="c.id" class="amt">{{ fmt(rom.travelTotalFor(c.id)) }}</td>
            <td class="amt col-total">{{ fmt(sum(includedScopes, c => rom.travelTotalFor(c.id))) }}</td>
            <td class="amt col-pct">{{ pct(sum(includedScopes, c => rom.travelTotalFor(c.id))) }}</td>
          </tr>

          <!-- Material section -->
          <tr class="break-section-row"><td :colspan="cols">Material</td></tr>
          <tr class="break-detail-row">
            <td class="col-label-cell"><i class="ti ti-package" aria-hidden="true"></i> Equipment (unloaded)</td>
            <td v-for="c in includedScopes" :key="c.id" class="amt">{{ fmt(rom.materialUnloadedFor(c.id)) }}</td>
            <td class="amt col-total">{{ fmt(sum(includedScopes, c => rom.materialUnloadedFor(c.id))) }}</td>
            <td class="amt col-pct">{{ pct(sum(includedScopes, c => rom.materialUnloadedFor(c.id))) }}</td>
          </tr>
          <tr class="break-detail-row">
            <td class="col-label-cell">Shipping ({{ (rom.material.shippingPct * 100).toFixed(1) }}%)</td>
            <td v-for="c in includedScopes" :key="c.id" class="amt">
              {{ fmt(rom.materialUnloadedFor(c.id) * rom.material.shippingPct) }}
            </td>
            <td class="amt col-total">
              {{ fmt(sum(includedScopes, c => rom.materialUnloadedFor(c.id) * rom.material.shippingPct)) }}
            </td>
            <td class="amt col-pct">{{ pct(sum(includedScopes, c => rom.materialUnloadedFor(c.id) * rom.material.shippingPct)) }}</td>
          </tr>
          <tr class="break-sub-row">
            <td>Material subtotal</td>
            <td v-for="c in includedScopes" :key="c.id" class="amt">{{ fmt(rom.materialTotalFor(c.id)) }}</td>
            <td class="amt col-total">{{ fmt(sum(includedScopes, c => rom.materialTotalFor(c.id))) }}</td>
            <td class="amt col-pct">{{ pct(sum(includedScopes, c => rom.materialTotalFor(c.id))) }}</td>
          </tr>

          <!-- Unloaded sub -->
          <tr class="break-sub-row break-sub-row--strong">
            <td>Unloaded subtotal</td>
            <td v-for="c in includedScopes" :key="c.id" class="amt">{{ fmt(rom.coaTotals(c.id).unloaded) }}</td>
            <td class="amt col-total">{{ fmt(sum(includedScopes, c => rom.coaTotals(c.id).unloaded)) }}</td>
            <td class="amt col-pct">{{ pct(sum(includedScopes, c => rom.coaTotals(c.id).unloaded)) }}</td>
          </tr>

          <!-- Overhead section -->
          <tr class="break-section-row"><td :colspan="cols">Overhead</td></tr>
          <tr class="break-detail-row">
            <td class="col-label-cell">Project overhead (SCP + Global + Gov + Mgmt rsv)</td>
            <td v-for="c in includedScopes" :key="c.id" class="amt">{{ fmt(rom.coaTotals(c.id).ohTotal) }}</td>
            <td class="amt col-total">{{ fmt(sum(includedScopes, c => rom.coaTotals(c.id).ohTotal)) }}</td>
            <td class="amt col-pct">{{ pct(sum(includedScopes, c => rom.coaTotals(c.id).ohTotal)) }}</td>
          </tr>
          <tr class="break-detail-row">
            <td class="col-label-cell">SCR loading</td>
            <td v-for="c in includedScopes" :key="c.id" class="amt">{{ fmt(rom.coaTotals(c.id).scr) }}</td>
            <td class="amt col-total">{{ fmt(sum(includedScopes, c => rom.coaTotals(c.id).scr)) }}</td>
            <td class="amt col-pct">{{ pct(sum(includedScopes, c => rom.coaTotals(c.id).scr)) }}</td>
          </tr>

          <!-- Grand row -->
          <tr class="break-grand-row">
            <td>Loaded total</td>
            <td v-for="c in includedScopes" :key="c.id" class="amt" :class="{ 'col-scope--zero': rom.coaTotals(c.id).totalLoaded === 0 }">{{ fmt(rom.coaTotals(c.id).totalLoaded) }}</td>
            <td class="amt col-total">{{ fmt(rom.totalLoadedForQuote) }}</td>
            <td class="amt col-pct col-pct--grand">{{ pct(rom.totalLoadedForQuote) }}</td>
          </tr>

        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRomStore } from '../stores/rom'

const rom = useRomStore()

const includedScopes = computed(() => rom.coas.filter(c => c.includeInQuote))
const excludedScopes = computed(() => rom.coas.filter(c => !c.includeInQuote))
const cols           = computed(() => includedScopes.value.length + 3)
const grandTotal     = computed(() => rom.totalLoadedForQuote)
function pct(n) { return grandTotal.value ? (n / grandTotal.value * 100).toFixed(1) + '%' : '—' }

// Regular line-item labor for one scope + role (excludes travel labor)
function coaLaborByRole(coaId, roleId) {
  return rom.lineItems
    .filter(l => l.coaId === coaId && l.role === roleId)
    .reduce((s, l) => s + rom.lineCost(l), 0)
}
function rolledLabor(roleId) {
  return includedScopes.value.reduce((s, c) => s + coaLaborByRole(c.id, roleId), 0)
}
function sum(arr, fn) { return arr.reduce((s, x) => s + fn(x), 0) }

function fmt(n) { return n ? '$' + Math.round(n).toLocaleString() : '—' }
</script>

<style scoped>
.summary-view { padding: 0 0 48px; }

/* Hero */
.hero-strip {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px;
  background: var(--rom-header-bg);
  color: #fff;
  gap: 24px;
}
.hero-label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.6); margin-bottom: 4px; }
.hero-value { font-size: 32px; font-weight: 700; color: #7dd3fc; line-height: 1.1; }
.hero-sub { font-size: 12px; color: rgba(255,255,255,.7); margin-top: 4px; }
.hero-excluded { color: rgba(255,255,255,.5); font-style: italic; }
.hero-stats { display: flex; gap: 20px; flex-wrap: wrap; }
.hero-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.55); margin-bottom: 2px; }
.hero-stat-value { font-size: 16px; font-weight: 600; color: #fff; }

/* Escalation callout */
.escalation-strip {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 24px;
  background: #fef9ec; border-bottom: 1px solid #fcd34d;
  font-size: 12px; color: #78350f;
}
.escalation-strip .ti { font-size: 14px; color: #d97706; }
.esc-totals { margin-left: auto; font-size: 12px; }
.esc-value { color: #d97706; }
:root[data-theme="dark"] .escalation-strip { background: #3a2d12; border-color: #a16207; color: #fcd34d; }
:root[data-theme="dark"] .esc-value { color: #fcd34d; }

/* Empty state */
.empty-banner {
  margin: 16px 24px;
  padding: 12px 16px;
  background: #fff8e1;
  border: 1px solid #f5c97a;
  border-radius: 6px;
  font-size: 13px; color: #92400e;
}

/* Cards */
.sum-card {
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: 8px;
  margin: 16px 24px;
  overflow: hidden;
}
.sum-card-head {
  padding: 10px 16px;
  font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--rom-text-muted);
  background: var(--rom-surface-alt);
  border-bottom: 1px solid var(--rom-border);
  display: flex; align-items: center; justify-content: space-between;
}
.sum-card-head--scope { color: var(--rom-accent-dark); text-transform: none; font-size: 14px; }
.head-total { font-size: 16px; font-weight: 700; color: var(--rom-accent-dark); }
.sum-card--scroll { overflow-x: auto; }

.break-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.break-table--cols th, .break-table--cols td { min-width: 100px; }
.break-table th, .break-table td { padding: 8px 14px; border-bottom: 1px solid var(--rom-border); }
.break-table th {
  text-align: left; background: var(--rom-surface-alt);
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .04em;
  color: var(--rom-text-muted);
  white-space: nowrap;
}
.break-table .col-label { min-width: 260px; }
.break-table .col-scope { text-align: right; min-width: 120px; }
.break-table .col-scope .th-sub { font-size: 10px; font-weight: 500; color: var(--rom-text-faint); text-transform: none; letter-spacing: 0; margin-top: 2px; }
.break-table .col-total { background: var(--rom-accent-bg); color: var(--rom-accent-dark); text-align: right; min-width: 120px; }
.break-table .col-label-cell { padding-left: 28px; color: var(--rom-text-muted); }
.amt { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }

.break-section-row td {
  padding: 6px 14px;
  background: var(--rom-surface-alt);
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--rom-accent-dark);
  border-bottom: 1px solid var(--rom-border);
}

.break-detail-row td { color: var(--rom-text); }
.break-detail-row td.amt { color: var(--rom-text); }
.break-detail-row:hover td { background: var(--rom-surface-alt); }

/* Travel labor sub-rows under Labor section */
.break-detail-row--travel-labor td { color: var(--rom-text-muted); font-style: italic; }
.break-detail-row--travel-labor .travel-labor-sub { padding-left: 44px; font-size: 12px; }
.break-detail-row--travel-labor:hover td { background: var(--rom-surface-alt); }

.break-sub-row td {
  font-weight: 700;
  background: #fafafb;
  border-top: 1px solid var(--rom-border);
}
.break-sub-row--strong td { background: #f0f4fb; }

.break-grand-row td {
  background: var(--rom-header-bg);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
}
.break-grand-row td.col-total { background: var(--rom-accent-dark); color: #fff; font-size: 16px; }

.col-pct {
  text-align: right; white-space: nowrap;
  color: var(--rom-text-muted); font-size: 12px;
  min-width: 70px;
}
.col-pct--grand { color: #fff; font-weight: 700; font-size: 14px; }

/* Empty ($0) scope column — muted/italic to signal it has no data */
.col-scope--zero { opacity: 0.55; font-style: italic; }
.th-zero-badge {
  margin-top: 3px;
  font-size: 9px; font-weight: 600;
  color: var(--rom-text-faint);
  text-transform: uppercase; letter-spacing: .04em;
  font-style: normal;
}

</style>
