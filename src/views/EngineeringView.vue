<template>
  <div class="eng-view">

    <!-- ── Summary strip ────────────────────────────────────────── -->
    <div class="summary-strip">
      <div class="summary-card">
        <div class="summary-label">Total hours</div>
        <div class="summary-value">{{ Math.round(rom.engineeringHours) }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Labor subtotal</div>
        <div class="summary-value">{{ fmt(rom.engineeringTotal) }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Travel + material</div>
        <div class="summary-value">{{ fmt(rom.travelTotal + rom.materialTotal) }}</div>
      </div>
      <div class="summary-card summary-card--accent">
        <div class="summary-label">Grand total (loaded)</div>
        <div class="summary-value">{{ fmt(rom.totalLoadedCost) }}</div>
      </div>
    </div>

    <!-- ── Entity cards ──────────────────────────────────────────── -->
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
              {{ Math.round(rom.entityHours(entity.id)) }} hrs &nbsp;·&nbsp; {{ fmt(rom.entityCost(entity.id)) }}
            </span>
          </div>
          <button
            v-if="!entity.alwaysVisible"
            class="entity-remove-btn"
            @click="rom.disableEntity(entity.id)"
            :title="`Remove ${entity.label}`"
          >
            <i class="ti ti-x" aria-hidden="true"></i> Remove {{ entity.label }}
          </button>
        </div>

        <!-- Role accordion sections -->
        <div class="roles-wrap">
          <RoleSection
            v-for="role in rom.ROLES"
            :key="role.id"
            :role="role"
            :entity-id="entity.id"
          />
        </div>
      </div>

      <!-- Add entity buttons -->
      <div class="add-entity-row">
        <button
          v-if="!rom.enabledEntities.includes('gov')"
          class="add-entity-btn add-entity-btn--gov"
          @click="rom.enableEntity('gov')"
        >
          <i class="ti ti-plus" aria-hidden="true"></i> Add Government
        </button>
        <button
          v-if="!rom.enabledEntities.includes('sub')"
          class="add-entity-btn add-entity-btn--sub"
          @click="rom.enableEntity('sub')"
        >
          <i class="ti ti-plus" aria-hidden="true"></i> Add Subcontractor
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { useRomStore } from '../stores/rom'
import RoleSection from '../components/RoleSection.vue'

const rom = useRomStore()

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString() }
</script>

<style scoped>
.eng-view { padding: 0 0 48px; }

/* ── Summary strip ───────────────────────────────────────────────── */
.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid var(--rom-border);
  background: var(--rom-surface);
}
.summary-card {
  padding: 12px 20px;
  border-right: 1px solid var(--rom-border);
}
.summary-card:last-child { border-right: none; }
.summary-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--rom-text-muted); margin-bottom: 3px; }
.summary-value { font-size: 20px; font-weight: 500; }
.summary-card--accent { background: var(--rom-accent-bg); }
.summary-card--accent .summary-label { color: var(--rom-accent-dark); opacity: .8; }
.summary-card--accent .summary-value { color: var(--rom-accent-dark); }

/* ── Entity cards ────────────────────────────────────────────────── */
.entities-wrap {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.entity-card {
  border-radius: var(--rom-radius-lg);
  border: 1px solid var(--rom-border);
  overflow: hidden;
  background: var(--rom-surface);
}
.entity-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
}
.entity-head-left { display: flex; align-items: center; gap: 10px; }

.entity--cronos .entity-head { background: #dce8fb; border-bottom: 2px solid #1a5fb4; }
.entity--gov    .entity-head { background: #d6e8f8; border-bottom: 2px solid #185fa5; }
.entity--sub    .entity-head { background: #faeeda; border-bottom: 2px solid #854f0b; }

.entity-pill {
  font-size: 11px; font-weight: 700; padding: 2px 10px;
  border-radius: 10px;
}
.entity--cronos .entity-pill { background: #1a5fb4; color: #fff; }
.entity--gov    .entity-pill { background: #185fa5; color: #fff; }
.entity--sub    .entity-pill { background: #854f0b; color: #fff; }

.entity-meta { font-size: 12px; font-weight: 500; color: var(--rom-text-muted); }

.entity-remove-btn {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; padding: 4px 10px;
  border: 1px solid var(--rom-border); border-radius: var(--rom-radius);
  background: transparent; color: var(--rom-text-muted); cursor: pointer;
}
.entity-remove-btn:hover { color: var(--rom-danger); border-color: var(--rom-danger); background: #fff0f0; }

.roles-wrap { border-top: 1px solid var(--rom-border); }

/* ── Add entity buttons ──────────────────────────────────────────── */
.add-entity-row { display: flex; gap: 10px; }
.add-entity-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; font-size: 13px;
  border-radius: var(--rom-radius); cursor: pointer;
  border: 1px dashed; background: transparent;
}
.add-entity-btn--gov { border-color: var(--rom-info); color: var(--rom-info); }
.add-entity-btn--gov:hover { background: var(--rom-info-bg); }
.add-entity-btn--sub { border-color: var(--rom-warn); color: var(--rom-warn); }
.add-entity-btn--sub:hover { background: var(--rom-warn-bg); }
</style>
