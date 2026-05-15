<template>
  <div class="eng-view">

    <!-- ── Summary strip ────────────────────────────────────────── -->
    <div class="summary-strip">
      <div class="summary-card">
        <div class="summary-label">Total Hours</div>
        <div class="summary-value">{{ Math.round(rom.engineeringHours) }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Labor Subtotal</div>
        <div class="summary-value">{{ fmt(rom.engineeringTotal) }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Travel + Material</div>
        <div class="summary-value">{{ fmt(rom.travelTotal + rom.materialTotal) }}</div>
      </div>
      <div class="summary-card summary-card--accent">
        <div class="summary-label">Grand Total (Loaded)</div>
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
              {{ Math.round(entityHours(entity.id)) }} hrs &nbsp;·&nbsp; {{ fmt(entityCost(entity.id)) }}
            </span>
          </div>
          <div class="entity-head-right">
            <button class="expand-btn" @click="openAllPhases(entity.id)" title="Open all phases">
              <i class="ti ti-chevrons-down"></i> Open all
            </button>
            <button class="expand-btn" @click="closeAllPhases(entity.id)" title="Close all phases">
              <i class="ti ti-chevrons-up"></i> Close all
            </button>
            <button
              v-if="!entity.alwaysVisible"
              class="entity-remove-btn"
              @click="rom.disableEntity(entity.id)"
              :title="`Remove ${entity.label}`"
            >
              <i class="ti ti-x" aria-hidden="true"></i> Remove {{ entity.label }}
            </button>
          </div>
        </div>

        <!-- Phase accordions -->
        <div class="phases-wrap">
          <div
            v-for="phase in rom.LIFECYCLE_PHASES"
            :key="phase.id"
            class="phase-section"
            :class="{ 'phase-section--has-lines': phaseHours(entity.id, phase.id) > 0 }"
          >
            <!-- Phase header -->
            <div class="phase-head" @click="togglePhase(entity.id, phase.id)">
              <div class="phase-head-left">
                <i class="ti phase-chevron"
                  :class="isPhaseOpen(entity.id, phase.id) ? 'ti-chevron-down' : 'ti-chevron-right'"
                  aria-hidden="true"></i>
                <span class="phase-label">{{ phase.label }}</span>
              </div>
              <div class="phase-head-right">
                <div v-if="phaseHours(entity.id, phase.id) > 0" class="phase-stats">
                  <span class="phase-stat">{{ Math.round(phaseHours(entity.id, phase.id)) }} hrs</span>
                  <span class="phase-stat phase-stat--cost">{{ fmt(phaseCost(entity.id, phase.id)) }}</span>
                </div>
                <span v-else class="phase-empty-hint">No tasks yet</span>
              </div>
            </div>

            <!-- Phase body -->
            <div v-if="isPhaseOpen(entity.id, phase.id)" class="phase-body">

              <!-- Role filter chips -->
              <div class="role-filter-bar">
                <span class="role-filter-label">Filter:</span>
                <button
                  v-for="rf in ROLE_FILTERS"
                  :key="rf.id"
                  class="role-chip"
                  :class="[`role-chip--${rf.id}`, { active: getActiveRole(entity.id, phase.id) === rf.id }]"
                  @click="setActiveRole(entity.id, phase.id, rf.id)"
                >
                  {{ rf.label }}
                </button>
              </div>

              <!-- Lines table -->
              <div v-if="visibleLines(entity.id, phase.id).length" class="lines-wrap">
                <table class="lines-table">
                  <thead>
                    <tr>
                      <th class="col-move"></th>
                      <th class="col-role">Role</th>
                      <th class="col-cat">Labor Category</th>
                      <th class="col-task">Task</th>
                      <th class="col-days">Days</th>
                      <th class="col-hpd">Hrs/Day</th>
                      <th class="col-hrs">Total Hrs</th>
                      <th class="col-rate">Rate ($/hr)</th>
                      <th class="col-total">Total</th>
                      <th class="col-del"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="line in visibleLines(entity.id, phase.id)"
                      :key="line.id"
                      class="line-row"
                      :class="{
                        'line-row--dragging':  dragState.dragId  === line.id,
                        'line-row--drag-over': dragState.overId  === line.id && dragState.dragId !== line.id
                      }"
                      draggable="true"
                      @dragstart="dragState.dragId = line.id"
                      @dragend="dragState.dragId = null; dragState.overId = null"
                      @dragover.prevent="dragState.overId = line.id"
                      @dragleave="dragState.overId = null"
                      @drop.prevent="rom.reorderLine(dragState.dragId, line.id); dragState.dragId = null; dragState.overId = null"
                    >
                      <!-- Drag handle -->
                      <td class="col-move">
                        <span class="drag-handle" title="Drag to reorder">⠿</span>
                      </td>

                      <!-- Role badge -->
                      <td class="col-role">
                        <span class="role-badge" :class="`role-badge--${line.role}`">
                          {{ roleShort(line.role) }}
                        </span>
                      </td>

                      <!-- Labor Category — always filtered to this row's role -->
                      <td class="col-cat">
                        <select
                          :value="line.laborCat"
                          class="cell-select"
                          @change="onLaborCatChange(line.id, $event.target.value)"
                        >
                          <option
                            v-for="cat in rom.LABOR_CATS.filter(c => c.role === line.role)"
                            :key="cat.id"
                            :value="cat.id"
                          >{{ cat.label }}</option>
                        </select>
                      </td>

                      <!-- Task -->
                      <td class="col-task">
                        <!-- Custom text input mode -->
                        <div v-if="customTaskMode[line.id]" class="custom-task-wrap">
                          <input
                            type="text"
                            class="cell-input cell-input--task"
                            :value="line.taskId"
                            placeholder="Enter custom task…"
                            @input="rom.updateLine(line.id, { taskId: $event.target.value })"
                            autofocus
                          />
                          <button class="custom-task-back" title="Back to list" @click="customTaskMode[line.id] = false">
                            <i class="ti ti-list"></i>
                          </button>
                        </div>
                        <!-- Dropdown mode -->
                        <select v-else
                          :value="line.taskId"
                          class="cell-select cell-select--task"
                          @change="onTaskChange(line, $event.target.value)"
                        >
                          <option value="">— Select task —</option>
                          <option
                            v-for="task in tasksForLine(line, phase.id)"
                            :key="task.id"
                            :value="task.id"
                          >{{ task.label }}</option>
                          <option value="__custom__">✏ Custom…</option>
                        </select>
                      </td>

                      <!-- Days -->
                      <td class="col-days">
                        <input
                          type="number" min="0" step="0.5"
                          :value="line.days"
                          class="cell-num"
                          @input="rom.updateLine(line.id, { days: +$event.target.value })"
                        />
                      </td>

                      <!-- Hrs/Day -->
                      <td class="col-hpd">
                        <input
                          type="number" min="0" step="0.5"
                          :value="line.hoursPerDay"
                          class="cell-num"
                          @input="rom.updateLine(line.id, { hoursPerDay: +$event.target.value })"
                        />
                      </td>

                      <!-- Total Hrs (bidirectional: editing updates Days) -->
                      <td class="col-hrs">
                        <input
                          type="number" min="0" step="0.5"
                          :value="Math.round(((line.days || 0) * (line.hoursPerDay || 0)) * 2) / 2"
                          class="cell-num cell-num--hrs"
                          @change="onTotalHrsChange(line, +$event.target.value)"
                        />
                      </td>

                      <!-- Rate -->
                      <td class="col-rate">
                        <input
                          type="number" min="0" step="5"
                          :value="line.rate"
                          class="cell-num"
                          @input="rom.updateLine(line.id, { rate: +$event.target.value })"
                        />
                      </td>

                      <!-- Total Cost -->
                      <td class="col-total">
                        {{ fmt((line.days || 0) * (line.hoursPerDay || 0) * (line.rate || 0)) }}
                      </td>

                      <!-- Delete -->
                      <td class="col-del">
                        <button class="del-btn" @click="rom.removeLine(line.id)" title="Remove row">
                          <i class="ti ti-trash" aria-hidden="true"></i>
                        </button>
                      </td>
                    </tr>
                    <!-- Drop zone at the end of the list -->
                    <tr
                      v-if="dragState.dragId"
                      class="drop-zone-end"
                      :class="{ 'drop-zone-end--active': dragState.overId === `${entity.id}::${phase.id}::end` }"
                      @dragover.prevent="dragState.overId = `${entity.id}::${phase.id}::end`"
                      @dragleave="dragState.overId = null"
                      @drop.prevent="dropAtEnd(entity.id, phase.id)"
                    >
                      <td colspan="10" class="drop-zone-cell">Drop here to move to end</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="phase-total-row">
                      <!-- Add row inline -->
                      <td colspan="6" class="phase-add-inline">
                        <template v-if="getActiveRole(entity.id, phase.id) === 'all'">
                          <template v-if="showingPicker(entity.id, phase.id)">
                            <div class="role-picker role-picker--inline">
                              <span class="role-picker-label">Add:</span>
                              <button
                                v-for="rf in ROLE_FILTERS.filter(r => r.id !== 'all')"
                                :key="rf.id"
                                class="role-pick-btn"
                                :class="`role-pick-btn--${rf.id}`"
                                @click="pickRole(entity.id, phase.id, rf.id)"
                              >
                                <i class="ti" :class="roleIcon(rf.id)"></i>
                                {{ rf.label }}
                              </button>
                              <button class="role-pick-cancel" @click="hidePicker(entity.id, phase.id)">Cancel</button>
                            </div>
                          </template>
                          <button v-else class="add-line-btn add-line-btn--inline" @click="showPicker(entity.id, phase.id)">
                            <i class="ti ti-plus" aria-hidden="true"></i> Add row
                          </button>
                        </template>
                        <button v-else class="add-line-btn add-line-btn--inline" @click="pickRole(entity.id, phase.id, getActiveRole(entity.id, phase.id))">
                          <i class="ti ti-plus" aria-hidden="true"></i>
                          Add {{ ROLE_FILTERS.find(r => r.id === getActiveRole(entity.id, phase.id))?.label }} row
                        </button>
                      </td>
                      <td class="phase-total-label">Phase Total</td>
                      <td class="phase-total-value">{{ fmt(phaseCost(entity.id, phase.id)) }}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- Add row (shown when no visible lines — table not rendered) -->
              <div v-if="!visibleLines(entity.id, phase.id).length" class="phase-add-row">
                <template v-if="getActiveRole(entity.id, phase.id) === 'all'">
                  <template v-if="showingPicker(entity.id, phase.id)">
                    <div class="role-picker">
                      <span class="role-picker-label">Add row for:</span>
                      <button
                        v-for="rf in ROLE_FILTERS.filter(r => r.id !== 'all')"
                        :key="rf.id"
                        class="role-pick-btn"
                        :class="`role-pick-btn--${rf.id}`"
                        @click="pickRole(entity.id, phase.id, rf.id)"
                      >
                        <i class="ti" :class="roleIcon(rf.id)"></i>
                        {{ rf.label }}
                      </button>
                      <button class="role-pick-cancel" @click="hidePicker(entity.id, phase.id)">Cancel</button>
                    </div>
                  </template>
                  <button v-else class="add-line-btn" @click="showPicker(entity.id, phase.id)">
                    <i class="ti ti-plus" aria-hidden="true"></i> Add row
                  </button>
                </template>
                <button v-else class="add-line-btn" @click="pickRole(entity.id, phase.id, getActiveRole(entity.id, phase.id))">
                  <i class="ti ti-plus" aria-hidden="true"></i>
                  Add {{ ROLE_FILTERS.find(r => r.id === getActiveRole(entity.id, phase.id))?.label }} row
                </button>
              </div>

              <!-- Hidden rows hint (below add button) -->
              <div
                v-if="getActiveRole(entity.id, phase.id) !== 'all' && linesForPhase(entity.id, phase.id).length > visibleLines(entity.id, phase.id).length"
                class="hidden-rows-hint"
              >
                {{ linesForPhase(entity.id, phase.id).length - visibleLines(entity.id, phase.id).length }}
                row(s) hidden by filter — switch to <strong>All</strong> to see them
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { reactive, watch, onMounted } from 'vue'
import { useRomStore } from '../stores/rom'

const rom = useRomStore()

const PHASE_STATE_KEY  = 'rom-phase-open-state'
const ROLE_STATE_KEY   = 'rom-phase-role-state'

// ── Role filter options ──────────────────────────────────────────────
const ROLE_FILTERS = [
  { id: 'all',         label: 'All' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'pm',          label: 'PM' },
  { id: 'technician',  label: 'Technician' },
]

const ROLE_SHORT = { engineering: 'ENG', pm: 'PM', technician: 'TECH' }
function roleShort(role) { return ROLE_SHORT[role] ?? role.toUpperCase() }

// ── Phase open/close state ───────────────────────────────────────────
const phaseOpenState  = reactive(loadSaved(PHASE_STATE_KEY))
const activeRoleState = reactive(loadSaved(ROLE_STATE_KEY))
const pickerState     = reactive({})
const customTaskMode  = reactive({})
const dragState       = reactive({ dragId: null, overId: null })

function loadSaved(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}') } catch { return {} }
}

function phaseKey(eid, pid)    { return `${eid}::${pid}` }
function isPhaseOpen(eid, pid) { return !!phaseOpenState[phaseKey(eid, pid)] }
function togglePhase(eid, pid) {
  const k = phaseKey(eid, pid)
  phaseOpenState[k] = !phaseOpenState[k]
}
function openAllPhases(eid) {
  rom.LIFECYCLE_PHASES.forEach(p => { phaseOpenState[phaseKey(eid, p.id)] = true })
}
function closeAllPhases(eid) {
  rom.LIFECYCLE_PHASES.forEach(p => { phaseOpenState[phaseKey(eid, p.id)] = false })
}
function getActiveRole(eid, pid) { return activeRoleState[phaseKey(eid, pid)] ?? 'all' }
function setActiveRole(eid, pid, role) { activeRoleState[phaseKey(eid, pid)] = role }

// ── Lines for a phase — sorted by sortOrder ──────────────────────────
function linesForPhase(eid, pid) {
  return rom.lineItems
    .filter(l => l.entity === eid && l.phaseId === pid)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

// ── Visible lines — respects the active role filter ──────────────────
function visibleLines(eid, pid) {
  const active = getActiveRole(eid, pid)
  const all = linesForPhase(eid, pid)
  if (active === 'all') return all
  return all.filter(l => l.role === active)
}


// ── Phase hours/cost (sum across all roles) ──────────────────────────
function phaseHours(eid, pid) {
  return linesForPhase(eid, pid).reduce((s, l) => s + (l.days || 0) * (l.hoursPerDay || 0), 0)
}
function phaseCost(eid, pid) {
  return linesForPhase(eid, pid).reduce((s, l) => s + (l.days || 0) * (l.hoursPerDay || 0) * (l.rate || 0), 0)
}
function entityHours(eid) {
  return rom.LIFECYCLE_PHASES.reduce((s, p) => s + phaseHours(eid, p.id), 0)
}
function entityCost(eid) {
  return rom.LIFECYCLE_PHASES.reduce((s, p) => s + phaseCost(eid, p.id), 0)
}

// ── Tasks for a line row ─────────────────────────────────────────────
function tasksForLine(line, phaseId) {
  return rom.wbs[line.role]?.[phaseId] ?? []
}

// ── Role picker ──────────────────────────────────────────────────────
function showingPicker(eid, pid) { return !!pickerState[phaseKey(eid, pid)] }
function showPicker(eid, pid)    { pickerState[phaseKey(eid, pid)] = true }
function hidePicker(eid, pid)    { pickerState[phaseKey(eid, pid)] = false }

function pickRole(eid, pid, role) {
  rom.addLine(role, pid, '', { entity: eid })
  phaseOpenState[phaseKey(eid, pid)] = true
  pickerState[phaseKey(eid, pid)] = false
}

function roleIcon(role) {
  return { engineering: 'ti-cpu', pm: 'ti-clipboard-list', technician: 'ti-tool' }[role] ?? ''
}

// ── Task change — handle "Custom…" sentinel ──────────────────────────
function onTaskChange(line, value) {
  if (value === '__custom__') {
    customTaskMode[line.id] = true
    rom.updateLine(line.id, { taskId: '' })
  } else {
    rom.updateLine(line.id, { taskId: value })
  }
}

// On mount, put any lines with non-WBS taskIds into custom mode
onMounted(() => {
  watch(phaseOpenState,  v => localStorage.setItem(PHASE_STATE_KEY,  JSON.stringify(v)), { deep: true })
  watch(activeRoleState, v => localStorage.setItem(ROLE_STATE_KEY,   JSON.stringify(v)), { deep: true })

  const allWbsIds = new Set(
    Object.values(rom.wbs).flatMap(phases => Object.values(phases).flat().map(t => t.id))
  )
  rom.lineItems.forEach(l => {
    if (l.taskId && !allWbsIds.has(l.taskId)) customTaskMode[l.id] = true
  })
})
function onLaborCatChange(lineId, catId) {
  const cat = rom.LABOR_CATS.find(c => c.id === catId)
  rom.updateLine(lineId, {
    laborCat: catId,
    role:     cat?.role ?? 'engineering',
  })
}

// ── Total Hours bidirectional ────────────────────────────────────────
// Editing Total Hrs → back-calculates Days (Hrs/Day stays fixed)
function onTotalHrsChange(line, totalHrs) {
  const snapped = Math.round(totalHrs * 2) / 2          // snap input to nearest 0.5
  const hpd = line.hoursPerDay || 8
  const newDays = hpd > 0 ? Math.round((snapped / hpd) * 2) / 2 : 0  // snap days to nearest 0.5
  rom.updateLine(line.id, { days: newDays })
}

function dropAtEnd(eid, pid) {
  const visible = visibleLines(eid, pid)
  const lastLine = visible[visible.length - 1]
  if (lastLine && dragState.dragId !== lastLine.id) {
    rom.reorderLine(dragState.dragId, lastLine.id, true)
  }
  dragState.dragId = null
  dragState.overId = null
}

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString() }
</script>

<style scoped>
.eng-view { padding: 0 0 48px; }

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

/* Entity cards */
.entities-wrap { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.entity-card {
  border-radius: var(--rom-radius-lg); border: 1px solid var(--rom-border);
  overflow: hidden; background: var(--rom-surface);
}
.entity-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
}
.entity-head-left { display: flex; align-items: center; gap: 10px; }
.entity--cronos .entity-head { background: #dce8fb; border-bottom: 2px solid #1a5fb4; }
.entity--gov    .entity-head { background: #d6e8f8; border-bottom: 2px solid #185fa5; }
.entity--sub    .entity-head { background: #faeeda; border-bottom: 2px solid #854f0b; }
.entity-pill { font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 10px; }
.entity--cronos .entity-pill { background: #1a5fb4; color: #fff; }
.entity--gov    .entity-pill { background: #185fa5; color: #fff; }
.entity--sub    .entity-pill { background: #854f0b; color: #fff; }
.entity-meta { font-size: 12px; font-weight: 500; color: var(--rom-text-muted); }
.entity-head-right { display: flex; align-items: center; gap: 6px; }
.expand-btn {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--rom-text-muted);
  background: none; border: 1px solid var(--rom-border); border-radius: 4px;
  padding: 3px 8px; cursor: pointer;
}
.expand-btn:hover { color: var(--rom-accent); border-color: var(--rom-accent); background: var(--rom-accent-bg); }
.entity-remove-btn {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--rom-text-faint);
  background: none; border: 1px solid var(--rom-border); border-radius: 4px;
  padding: 3px 8px; cursor: pointer;
}
.entity-remove-btn:hover { color: var(--rom-danger); border-color: var(--rom-danger); }

/* Phase sections */
.phases-wrap { display: flex; flex-direction: column; }

.phase-section { border-bottom: 1px solid var(--rom-border); }
.phase-section:last-child { border-bottom: none; }
.phase-section--has-lines > .phase-head { background: var(--rom-accent-bg); }

.phase-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; cursor: pointer; user-select: none;
  transition: background .12s;
}
.phase-head:hover { background: var(--rom-surface-alt); }
.phase-section--has-lines > .phase-head:hover { background: #dce8fb; }

.phase-head-left { display: flex; align-items: center; gap: 8px; }
.phase-chevron { font-size: 13px; color: var(--rom-text-muted); flex-shrink: 0; }
.phase-label { font-size: 13px; font-weight: 600; color: var(--rom-text); }

.phase-head-right { display: flex; align-items: center; gap: 8px; }
.phase-stats { display: flex; align-items: center; gap: 6px; }
.phase-stat { font-size: 12px; font-weight: 500; color: var(--rom-text-muted); }
.phase-stat--cost { color: var(--rom-accent-dark); font-weight: 700; }
.phase-empty-hint { font-size: 11px; color: var(--rom-text-faint); font-style: italic; }

/* Phase body */
.phase-body { background: var(--rom-bg); border-top: 1px solid var(--rom-border); }

/* Role filter bar */
.role-filter-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--rom-border);
  background: var(--rom-surface);
}
.role-filter-label {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .05em; color: var(--rom-text-faint); margin-right: 2px;
}
.role-chip {
  padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;
  border: 1px solid var(--rom-border); background: var(--rom-surface);
  color: var(--rom-text-muted); cursor: pointer; transition: all .12s;
}
.role-chip:hover { border-color: var(--rom-accent); color: var(--rom-accent); }
.role-chip--all.active         { background: var(--rom-header-bg); border-color: var(--rom-header-bg); color: #fff; }
.role-chip--engineering.active { background: #1a5fb4; border-color: #1a5fb4; color: #fff; }
.role-chip--pm.active          { background: #2e7d32; border-color: #2e7d32; color: #fff; }
.role-chip--technician.active  { background: #854f0b; border-color: #854f0b; color: #fff; }

/* Lines table */
.lines-wrap { padding: 0 16px 0; overflow-x: auto; }
.lines-table {
  width: 100%; border-collapse: collapse; margin: 12px 0 0;
  font-size: 12px;
}
.lines-table th {
  text-align: left; padding: 5px 8px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .05em; color: var(--rom-text-muted);
  border-bottom: 2px solid var(--rom-border);
  background: var(--rom-surface);
  white-space: nowrap;
}
.line-row td { padding: 5px 8px; border-bottom: 1px solid var(--rom-border); vertical-align: middle; }
.line-row:last-child td { border-bottom: none; }
.line-row:hover td { background: var(--rom-surface-alt); }

/* Column widths */
.col-move  { width: 36px; }
.col-role  { width: 52px; }
.col-cat   { width: 120px; }
.col-task  { min-width: 200px; }
.col-days  { width: 90px; }
.col-hpd   { width: 90px; }
.col-hrs   { width: 100px; }
.col-rate  { width: 100px; }
.col-total { width: 110px; font-weight: 700; color: var(--rom-accent-dark); text-align: right; white-space: nowrap; }
.col-del   { width: 36px; }

/* Total Hrs cell — slightly highlighted to show it's computed but editable */
.cell-num--hrs {
  font-weight: 600;
  color: var(--rom-accent-dark);
  background: var(--rom-accent-bg) !important;
  border-color: transparent !important;
  border-radius: 4px;
}
.cell-num--hrs:hover, .cell-num--hrs:focus {
  border-color: var(--rom-accent) !important;
  background: var(--rom-surface) !important;
  color: var(--rom-text);
}

/* Drag handle */
.drag-handle {
  display: block; text-align: center;
  font-size: 14px; color: var(--rom-text-faint);
  cursor: grab; user-select: none; line-height: 1;
  padding: 2px 0;
}
.drag-handle:active { cursor: grabbing; }
.line-row--dragging  { opacity: .4; }
.line-row--drag-over td { border-top: 2px solid var(--rom-accent) !important; background: var(--rom-accent-bg); }

/* Role badge */
.role-badge {
  display: inline-block; padding: 2px 6px; border-radius: 4px;
  font-size: 9px; font-weight: 800; letter-spacing: .04em;
}
.role-badge--engineering { background: #dce8fb; color: #1a5fb4; }
.role-badge--pm          { background: #d4edda; color: #2e7d32; }
.role-badge--technician  { background: #faeeda; color: #854f0b; }

/* Cell inputs */
.cell-select {
  width: 100%; padding: 4px 6px; font-size: 12px;
  border: 1px solid transparent; border-radius: 4px;
  background: transparent; color: var(--rom-text);
  cursor: pointer;
}
.cell-select:hover, .cell-select:focus {
  border-color: var(--rom-accent); background: var(--rom-surface);
  outline: none;
}
.cell-select--task { min-width: 180px; }

.cell-input {
  width: 100%; padding: 4px 6px; font-size: 12px;
  border: 1px solid var(--rom-accent); border-radius: 4px;
  background: var(--rom-accent-bg); color: var(--rom-text);
}
.cell-input:focus { outline: none; border-color: var(--rom-accent-dark); }
.cell-input--task { min-width: 160px; }

.custom-task-wrap { display: flex; align-items: center; gap: 4px; }
.custom-task-back {
  flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 4px;
  border: 1px solid var(--rom-border); background: var(--rom-surface);
  color: var(--rom-text-muted); cursor: pointer; font-size: 12px;
}
.custom-task-back:hover { border-color: var(--rom-accent); color: var(--rom-accent); }

.cell-num {
  width: 100%; padding: 4px 6px; font-size: 12px; text-align: right;
  border: 1px solid transparent; border-radius: 4px;
  background: transparent; color: var(--rom-text);
}
.cell-num:hover, .cell-num:focus {
  border-color: var(--rom-accent); background: var(--rom-surface); outline: none;
}

/* Phase total footer */
.phase-total-row td { padding: 6px 8px; background: var(--rom-surface-alt); border-top: 2px solid var(--rom-border); }
.phase-total-label { font-size: 11px; font-weight: 700; color: var(--rom-text-muted); text-align: right; text-transform: uppercase; letter-spacing: .04em; }
.phase-total-value { font-size: 14px; font-weight: 800; color: var(--rom-accent-dark); text-align: right; white-space: nowrap; }

/* Delete button */
.del-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border: none; border-radius: 4px;
  background: transparent; color: var(--rom-text-faint); cursor: pointer; font-size: 12px;
}
.del-btn:hover { background: #fff0f0; color: var(--rom-danger); }

/* Hidden rows hint */
.hidden-rows-hint {
  margin: 6px 16px 0;
  padding: 6px 10px;
  font-size: 11px; color: var(--rom-text-muted); font-style: italic;
  background: var(--rom-surface-alt); border-radius: 4px;
  border-left: 3px solid var(--rom-border);
}

/* Add row — no-lines state (standalone below filter bar) */
.phase-add-row { padding: 10px 16px 12px; }
.add-line-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; font-size: 12px;
  border: 1px dashed var(--rom-border); border-radius: var(--rom-radius);
  background: transparent; color: var(--rom-text-muted); cursor: pointer;
}
.add-line-btn:hover { border-color: var(--rom-accent); color: var(--rom-accent); background: var(--rom-accent-bg); }

/* Inline add cell in tfoot */
.phase-add-inline {
  padding: 5px 8px;
  background: var(--rom-surface-alt);
  border-top: 2px solid var(--rom-border);
}
.add-line-btn--inline {
  padding: 3px 10px; font-size: 11px;
}
.role-picker--inline {
  padding: 4px 6px;
  border: none; border-radius: 4px;
  background: transparent;
  width: auto;
}
.role-picker--inline .role-pick-btn {
  padding: 3px 10px; font-size: 11px;
}
.role-picker--inline .role-picker-label { font-size: 10px; }

/* Role picker (shown when Add row is clicked) */
.role-picker {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 8px 12px;
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: var(--rom-radius);
  width: fit-content;
}
.role-picker-label {
  font-size: 11px; font-weight: 600; color: var(--rom-text-muted);
  text-transform: uppercase; letter-spacing: .04em; white-space: nowrap;
}
.role-pick-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 14px; border-radius: 6px; font-size: 12px; font-weight: 600;
  border: 2px solid; cursor: pointer; transition: all .12s;
}
.role-pick-btn--engineering { border-color: #1a5fb4; color: #1a5fb4; background: #f0f5ff; }
.role-pick-btn--engineering:hover { background: #1a5fb4; color: #fff; }
.role-pick-btn--pm           { border-color: #2e7d32; color: #2e7d32; background: #f0faf0; }
.role-pick-btn--pm:hover     { background: #2e7d32; color: #fff; }
.role-pick-btn--technician   { border-color: #854f0b; color: #854f0b; background: #fff8f0; }
.role-pick-btn--technician:hover { background: #854f0b; color: #fff; }
.role-pick-cancel {
  padding: 4px 10px; font-size: 11px; color: var(--rom-text-faint);
  background: none; border: 1px solid var(--rom-border); border-radius: 4px; cursor: pointer;
}
.role-pick-cancel:hover { color: var(--rom-danger); border-color: var(--rom-danger); }

/* Drop zone at end of list */
.drop-zone-end td {
  padding: 4px 8px;
  border-top: 2px dashed var(--rom-border);
  transition: background .1s, border-color .1s;
}
.drop-zone-end--active td {
  background: var(--rom-accent-bg);
  border-top-color: var(--rom-accent);
}
.drop-zone-cell {
  font-size: 11px; color: var(--rom-text-faint); font-style: italic;
  text-align: center; padding: 6px 8px !important;
}
.drop-zone-end--active .drop-zone-cell { color: var(--rom-accent); }
</style>
