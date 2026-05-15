<template>
  <div class="entity-section" :class="[`entity-${entity.id}`, { 'entity-collapsed': collapsed }]">
    <!-- Header bar -->
    <div class="entity-head" @click="collapsed = !collapsed">
      <div class="entity-head-left">
        <i class="ti ti-chevron-down chev"></i>
        <i class="ti" :class="entity.icon || iconFor(entity.id)"></i>
        <span class="entity-label">{{ entity.label }}</span>
        <span class="entity-meta">{{ lines.length }} {{ lines.length === 1 ? 'line' : 'lines' }} · {{ totalHours }} hrs</span>
      </div>
      <div class="entity-head-right">
        <span class="entity-total">{{ fmt(entityTotal) }}</span>
        <button
          v-if="canRemove"
          class="entity-remove"
          @click.stop="$emit('remove')"
          :aria-label="`Remove ${entity.label} from this phase`"
          title="Remove from this phase"
        >
          <i class="ti ti-x"></i>
        </button>
      </div>
    </div>

    <!-- Body: line items table -->
    <div v-show="!collapsed" class="entity-body">
      <div class="line-header">
        <div>Role</div>
        <div>Persons</div>
        <div>Days</div>
        <div>Hrs/Day</div>
        <div>Total Hrs</div>
        <div>Rate</div>
        <div>Cost</div>
        <div></div>
      </div>

      <div v-for="line in lines" :key="line.id" class="line-row">
        <select
          :value="line.role"
          @change="rom.updateLine(phaseId, entity.id, line.id, { role: $event.target.value })"
        >
          <option v-for="opt in roleOptions" :key="opt.role" :value="opt.role">{{ opt.role }}</option>
        </select>
        <input
          type="number" min="0" step="1"
          :value="line.persons"
          @input="rom.updateLine(phaseId, entity.id, line.id, { persons: +$event.target.value })"
        />
        <input
          type="number" min="0" step="1"
          :value="line.days"
          @input="rom.updateLine(phaseId, entity.id, line.id, { days: +$event.target.value })"
        />
        <input
          type="number" min="0" step="1"
          :value="line.hoursPerDay"
          @input="rom.updateLine(phaseId, entity.id, line.id, { hoursPerDay: +$event.target.value })"
        />
        <input
          type="number"
          :value="rom.lineHours(line)"
          readonly tabindex="-1" class="readonly"
        />
        <input
          type="number" min="0" step="1"
          :value="line.rate"
          @input="rom.updateLine(phaseId, entity.id, line.id, { rate: +$event.target.value })"
        />
        <span class="line-cost">{{ fmt(rom.lineCost(line)) }}</span>
        <button
          class="line-remove"
          @click="rom.removeLine(phaseId, entity.id, line.id)"
          :aria-label="`Remove ${line.role} line`"
          title="Remove this line"
        >
          <i class="ti ti-x"></i>
        </button>
      </div>

      <button class="add-line" @click="rom.addLine(phaseId, entity.id)">
        <i class="ti ti-plus"></i> Add {{ entity.label }} role
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRomStore } from '../stores/rom'

const props = defineProps({
  entity: { type: Object, required: true },   // { id, label, color, ... }
  phaseId: { type: String, required: true },
  startCollapsed: { type: Boolean, default: false },
  canRemove: { type: Boolean, default: false },
})

defineEmits(['remove'])

const rom = useRomStore()
const collapsed = ref(props.startCollapsed)

const lines = computed(() => rom.engineering[props.phaseId]?.[props.entity.id] ?? [])
const entityTotal = computed(() => rom.entityPhaseCost(props.phaseId, props.entity.id))
const totalHours = computed(() => rom.entityPhaseHours(props.phaseId, props.entity.id))
const roleOptions = computed(() => rom.roleRates[props.entity.id] ?? [])

function fmt(n) {
  return '$' + Math.round(n || 0).toLocaleString()
}

function iconFor(id) {
  switch (id) {
    case 'cronos': return 'ti-target'
    case 'gov':    return 'ti-building-bank'
    case 'sub':    return 'ti-briefcase'
    default:       return 'ti-circle'
  }
}
</script>

<style scoped>
.entity-section {
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
}
.entity-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  border-radius: 8px;
}
.entity-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
}
.entity-head-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
}
.chev {
  display: inline-block;
  transition: transform 120ms ease;
  font-size: 14px;
}
.entity-collapsed .chev { transform: rotate(-90deg); }
.entity-meta {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.75;
}
.entity-total { font-variant-numeric: tabular-nums; }
.entity-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  color: inherit;
  opacity: 0.6;
}
.entity-remove:hover { opacity: 1; background: rgba(0,0,0,0.06); }

/* Color variants */
.entity-cronos .entity-head { background: #e1f5ee; color: #085041; }
.entity-gov    .entity-head { background: #e6f1fb; color: #0c447c; }
.entity-sub    .entity-head { background: #faeeda; color: #633806; }

@media (prefers-color-scheme: dark) {
  .entity-cronos .entity-head { background: #085041; color: #9fe1cb; }
  .entity-gov    .entity-head { background: #0c447c; color: #b5d4f4; }
  .entity-sub    .entity-head { background: #633806; color: #fac775; }
}

/* Body */
.entity-body {
  border: 0.5px solid var(--rom-border, #d8d6cd);
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 10px 12px;
  margin-top: -2px;
  background: var(--rom-surface, #fff);
}

.line-header,
.line-row {
  display: grid;
  grid-template-columns: minmax(180px, 2fr) 70px 70px 70px 80px 80px 90px 28px;
  gap: 8px;
  align-items: center;
  padding: 5px 4px;
}
.line-header {
  font-size: 11px;
  color: var(--rom-text-muted, #6f6f6a);
  border-bottom: 0.5px solid var(--rom-border, #d8d6cd);
  margin-bottom: 4px;
}
.line-row select,
.line-row input {
  height: 30px;
  font-size: 12px;
  padding: 0 8px;
  border: 0.5px solid var(--rom-border, #d8d6cd);
  border-radius: 6px;
  background: var(--rom-surface, #fff);
  color: var(--rom-text, #1a1a1a);
  font-family: inherit;
}
.line-row input.readonly {
  background: var(--rom-readonly, #f3f2ec);
  color: var(--rom-text-muted, #6f6f6a);
}
.line-row select:focus,
.line-row input:focus {
  outline: 2px solid #1d9e75;
  outline-offset: -1px;
}
.line-cost {
  font-size: 12px;
  font-weight: 500;
  text-align: right;
  font-variant-numeric: tabular-nums;
  padding-right: 4px;
}
.line-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--rom-text-muted, #6f6f6a);
  display: flex;
  align-items: center;
  justify-content: center;
}
.line-remove:hover { color: #c44a4a; background: rgba(196,74,74,0.08); }

.add-line {
  font-size: 12px;
  padding: 6px 12px;
  margin-top: 8px;
  background: transparent;
  border: 0.5px solid var(--rom-border, #d8d6cd);
  border-radius: 6px;
  cursor: pointer;
  color: var(--rom-text, #1a1a1a);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.add-line:hover { background: var(--rom-readonly, #f3f2ec); }
</style>
