<template>
  <div class="summary-view">

    <!-- Grand total hero -->
    <div class="hero-strip">
      <div class="hero-left">
        <div class="hero-label">Grand Total (Loaded)</div>
        <div class="hero-value">{{ fmt(rom.totalLoadedCost) }}</div>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <div class="hero-stat-label">Engineering hrs</div>
          <div class="hero-stat-value">{{ Math.round(rom.engineeringHours) }}</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-label">Labor subtotal</div>
          <div class="hero-stat-value">{{ fmt(rom.engineeringTotal) }}</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-label">Overhead + SCR</div>
          <div class="hero-stat-value">{{ fmt(rom.totalOverhead) }}</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-label">Travel + Material</div>
          <div class="hero-stat-value">{{ fmt(rom.travelTotal + rom.materialTotal) }}</div>
        </div>
      </div>
    </div>

    <div class="sum-body">

      <!-- Cost breakdown table -->
      <div class="sum-card">
        <div class="sum-card-head">Full Cost Breakdown</div>
        <table class="break-table">
          <tbody>
            <tr class="break-section-row"><td colspan="2">Engineering Labor</td></tr>
            <tr v-for="role in rom.ROLES" :key="role.id" class="break-detail-row">
              <td><i class="ti" :class="role.icon"></i> {{ role.label }}</td>
              <td class="amt">{{ fmt(rom.roleCost(role.id, null)) }}</td>
            </tr>
            <tr class="break-sub-row">
              <td>Engineering Subtotal</td>
              <td class="amt">{{ fmt(rom.engineeringTotal) }}</td>
            </tr>

            <tr class="break-section-row"><td colspan="2">Other Costs</td></tr>
            <tr class="break-detail-row">
              <td>Travel</td>
              <td class="amt">{{ fmt(rom.travelTotal) }}</td>
            </tr>
            <tr class="break-detail-row">
              <td>Material &amp; Shipping</td>
              <td class="amt">{{ fmt(rom.materialTotal) }}</td>
            </tr>
            <tr class="break-sub-row">
              <td>Unloaded Total</td>
              <td class="amt">{{ fmt(rom.unloadedProjectTotal) }}</td>
            </tr>

            <tr class="break-section-row"><td colspan="2">Overhead</td></tr>
            <tr class="break-detail-row">
              <td>{{ rom.overhead.scpLabel }}</td>
              <td class="amt">{{ fmt(rom.scpCost) }}</td>
            </tr>
            <tr class="break-detail-row" v-if="rom.overhead.globalPct > 0">
              <td>{{ rom.overhead.globalLabel }}</td>
              <td class="amt">{{ fmt(rom.globalCost) }}</td>
            </tr>
            <tr class="break-detail-row">
              <td>{{ rom.overhead.govLaborLabel }}</td>
              <td class="amt">{{ fmt(rom.govLaborCost) }}</td>
            </tr>
            <tr class="break-detail-row">
              <td>Management Reserve</td>
              <td class="amt">{{ fmt(rom.managementReserveCost) }}</td>
            </tr>
            <tr class="break-detail-row">
              <td>SCR ({{ pctLabel(rom.overhead.scrPct) }}%)</td>
              <td class="amt">{{ fmt(rom.scrCost) }}</td>
            </tr>
            <tr class="break-sub-row">
              <td>Total Overhead</td>
              <td class="amt">{{ fmt(rom.totalOverhead) }}</td>
            </tr>

            <tr class="break-grand-row">
              <td>Grand Total (Loaded)</td>
              <td class="amt">{{ fmt(rom.totalLoadedCost) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Engineering breakdown by entity -->
      <div class="sum-card" v-if="rom.visibleEntities.length > 0">
        <div class="sum-card-head">Engineering by Entity &amp; Role</div>
        <table class="break-table">
          <thead>
            <tr>
              <th>Role</th>
              <th v-for="entity in rom.visibleEntities" :key="entity.id" class="amt">{{ entity.label }}</th>
              <th class="amt">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="role in rom.ROLES" :key="role.id" class="break-detail-row">
              <td><i class="ti" :class="role.icon"></i> {{ role.label }}</td>
              <td v-for="entity in rom.visibleEntities" :key="entity.id" class="amt">
                {{ fmt(rom.roleCost(role.id, entity.id)) }}
              </td>
              <td class="amt font-bold">{{ fmt(rom.roleCost(role.id, null)) }}</td>
            </tr>
            <tr class="break-sub-row">
              <td>Total</td>
              <td v-for="entity in rom.visibleEntities" :key="entity.id" class="amt">
                {{ fmt(rom.entityCost(entity.id)) }}
              </td>
              <td class="amt">{{ fmt(rom.engineeringTotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Engineering breakdown by phase -->
      <div class="sum-card">
        <div class="sum-card-head">Engineering by Phase</div>
        <table class="break-table">
          <thead>
            <tr>
              <th>Phase</th>
              <th v-for="role in rom.ROLES" :key="role.id" class="amt">{{ roleShort(role.id) }}</th>
              <th class="amt">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="phase in rom.LIFECYCLE_PHASES" :key="phase.id" class="break-detail-row">
              <td>{{ phase.label }}</td>
              <td v-for="role in rom.ROLES" :key="role.id" class="amt">
                {{ fmt(rom.phaseCost(role.id, phase.id, null)) }}
              </td>
              <td class="amt font-bold">
                {{ fmt(rom.ROLES.reduce((s, r) => s + rom.phaseCost(r.id, phase.id, null), 0)) }}
              </td>
            </tr>
            <tr class="break-sub-row">
              <td>Total</td>
              <td v-for="role in rom.ROLES" :key="role.id" class="amt">{{ fmt(rom.roleCost(role.id, null)) }}</td>
              <td class="amt">{{ fmt(rom.engineeringTotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</template>

<script setup>
import { useRomStore } from '../stores/rom'
const rom = useRomStore()

function fmt(n) { return n ? '$' + Math.round(n).toLocaleString() : '—' }
function pctLabel(v) { return ((v || 0) * 100).toFixed(0) }
function roleShort(id) { return { engineering: 'Eng', pm: 'PM', technician: 'Tech' }[id] ?? id }
</script>

<style scoped>
.summary-view { padding: 0 0 48px; }

/* Hero strip */
.hero-strip {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px;
  background: var(--rom-header-bg);
  color: #fff;
  gap: 24px;
}
.hero-label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.6); margin-bottom: 4px; }
.hero-value { font-size: 32px; font-weight: 700; color: #7dd3fc; }
.hero-stats { display: flex; gap: 32px; flex-shrink: 0; }
.hero-stat { text-align: right; }
.hero-stat-label { font-size: 10px; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; }
.hero-stat-value { font-size: 15px; font-weight: 600; color: rgba(255,255,255,.9); }

/* Body */
.sum-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

/* Cards */
.sum-card {
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: var(--rom-radius-lg);
  overflow: hidden;
}
.sum-card-head {
  padding: 9px 16px;
  background: var(--rom-header-bg);
  color: #fff;
  font-size: 12px; font-weight: 600; letter-spacing: .04em;
}

/* Tables */
.break-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.break-table th {
  padding: 8px 14px;
  text-align: left;
  font-size: 11px; font-weight: 600;
  color: var(--rom-text-muted);
  background: var(--rom-surface-alt);
  border-bottom: 1px solid var(--rom-border);
}
.break-table th.amt { text-align: right; }

.break-section-row td {
  padding: 7px 14px 4px;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--rom-text-faint);
  background: var(--rom-bg);
  border-top: 1px solid var(--rom-border);
}
.break-detail-row td {
  padding: 7px 14px;
  border-bottom: 1px solid var(--rom-border);
  color: var(--rom-text-muted);
}
.break-detail-row td .ti { font-size: 12px; margin-right: 4px; opacity: .6; }
.break-detail-row:last-child td { border-bottom: none; }
.break-detail-row:hover td { background: var(--rom-surface-alt); }

.break-sub-row td {
  padding: 9px 14px;
  font-weight: 600; font-size: 13px;
  color: var(--rom-text);
  background: var(--rom-surface-alt);
  border-top: 2px solid var(--rom-border);
  border-bottom: none;
}
.break-grand-row td {
  padding: 12px 14px;
  font-weight: 700; font-size: 15px;
  color: var(--rom-accent-dark);
  background: var(--rom-accent-bg);
  border-top: 2px solid var(--rom-accent);
}

.amt { text-align: right; }
.font-bold { font-weight: 600; color: var(--rom-text); }
</style>
