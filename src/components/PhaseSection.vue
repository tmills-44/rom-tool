<template>
  <!-- Phase-level collapsible subsection -->
  <div class="phase-section" :class="{ 'phase-has-lines': lines.length > 0 }">

    <!-- Phase sub-header -->
    <button
      class="phase-head"
      :class="{ 'phase-head--collapsed': collapsed }"
      @click="collapsed = !collapsed"
      :aria-expanded="!collapsed"
    >
      <div class="phase-head-left">
        <i
          class="ti phase-chevron"
          :class="collapsed ? 'ti-chevron-right' : 'ti-chevron-down'"
          aria-hidden="true"
        ></i>
        <span class="phase-label">{{ phase.label }}</span>
        <span v-if="lines.length > 0" class="phase-count">{{ lines.length }}</span>
      </div>
      <div class="phase-head-right">
        <span v-if="phaseHrs > 0" class="phase-hours">{{ Math.round(phaseHrs) }} hrs</span>
        <span v-if="phaseCst > 0" class="phase-cost">{{ fmt(phaseCst) }}</span>
      </div>
    </button>

    <!-- Phase body: line items table + add button -->
    <div v-show="!collapsed" class="phase-body">

      <!-- Table (only rendered when there are lines) -->
      <div v-if="lines.length > 0" class="table-wrap">
        <table class="line-table">
          <thead>
            <tr>
              <th class="col-role">Role</th>
              <th class="col-task">Task</th>
              <th class="col-cat">Labor cat</th>
              <th class="col-num">Days</th>
              <th class="col-num">Hrs/day</th>
              <th class="col-num">Rate</th>
              <th class="col-num">Total hrs</th>
              <th class="col-cost">Total cost</th>
              <th class="col-del"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in lines" :key="line.id" class="line-row">

              <!-- Role (read-only label matching the section) -->
              <td class="col-role">
                <span class="role-label-cell">{{ roleLabelShort }}</span>
              </td>

              <!-- Task -->
              <td class="col-task">
                <select
                  :value="line.taskId"
                  @change="rom.updateLine(line.id, { taskId: $event.target.value })"
                >
                  <option value="">— select task —</option>
                  <option
                    v-for="task in availableTasks"
                    :key="task.id"
                    :value="task.id"
                  >{{ task.label }}</option>
                </select>
              </td>

              <!-- Labor cat -->
              <td class="col-cat">
                <select
                  :value="line.laborCat"
                  @change="rom.updateLine(line.id, { laborCat: $event.target.value })"
                >
                  <option v-for="cat in cats" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
                </select>
              </td>

              <!-- Days -->
              <td class="col-num">
                <input
                  type="number" min="0" step="0.5"
                  :value="line.days"
                  @input="rom.updateLine(line.id, { days: +$event.target.value })"
                />
              </td>

              <!-- Hrs/day -->
              <td class="col-num">
                <input
                  type="number" min="1" max="24" step="1"
                  :value="line.hoursPerDay"
                  @input="rom.updateLine(line.id, { hoursPerDay: +$event.target.value })"
                />
              </td>

              <!-- Rate -->
              <td class="col-num">
                <input
                  type="number" min="0" step="1"
                  :value="line.rate"
                  @input="rom.updateLine(line.id, { rate: +$event.target.value })"
                />
              </td>

              <!-- Total hours (computed, read-only) -->
              <td class="col-num">
                <input
                  type="number"
                  :value="Math.round(rom.lineHours(line))"
                  readonly tabindex="-1"
                />
              </td>

              <!-- Total cost (formatted, read-only) -->
              <td class="col-cost">
                <span class="cost-cell">{{ fmt(rom.lineCost(line)) }}</span>
              </td>

              <!-- Delete -->
              <td class="col-del">
                <button
                  class="del-btn"
                  @click="rom.removeLine(line.id)"
                  title="Remove this task"
                  :aria-label="`Remove task row`"
                >
                  <i class="ti ti-trash" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state when no lines yet -->
      <div v-else class="phase-empty">
        No tasks added yet.
      </div>

      <!-- Add task button -->
      <div class="phase-add-row">
        <button class="add-task-btn" @click="addTask">
          <i class="ti ti-plus" aria-hidden="true"></i> Add task
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRomStore } from '../stores/rom'

const props = defineProps({
  roleId:   { type: String, required: true },
  phase:    { type: Object, required: true },
  entityId: { type: String, required: true },
})

const rom = useRomStore()

// Start collapsed if this phase has no tasks in the WBS
const hasTasks = computed(() => rom.tasksFor(props.roleId, props.phase.id).length > 0)
const collapsed = ref(!hasTasks.value)

const lines        = computed(() => rom.linesForPhase(props.roleId, props.phase.id, props.entityId))
const phaseHrs     = computed(() => rom.phaseHours(props.roleId, props.phase.id, props.entityId))
const phaseCst     = computed(() => rom.phaseCost(props.roleId,  props.phase.id, props.entityId))
const cats         = computed(() => rom.catsForRole(props.roleId))
const availableTasks = computed(() => rom.tasksFor(props.roleId, props.phase.id))

// Short role label for the Role column cell
const roleLabelShort = computed(() => {
  const map = { engineering: 'Systems Eng', pm: 'PM', technician: 'Technician' }
  return map[props.roleId] ?? props.roleId
})

function addTask() {
  collapsed.value = false
  rom.addLine(props.roleId, props.phase.id, '', { entity: props.entityId })
}

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString() }
</script>

<style scoped>
.phase-section {
  border-top: 1px solid var(--rom-border);
}

/* Phase sub-header */
.phase-head {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 7px 16px 7px 32px;
  border: none; background: var(--rom-surface-alt); cursor: pointer;
  text-align: left;
}
.phase-head:hover { background: var(--rom-border); }

.phase-head-left  { display: flex; align-items: center; gap: 7px; }
.phase-head-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.phase-chevron { font-size: 12px; color: var(--rom-text-faint); }
.phase-label   { font-size: 12px; font-weight: 500; color: var(--rom-text-muted); }
.phase-count   {
  font-size: 10px; padding: 1px 6px;
  background: var(--rom-accent-bg); color: var(--rom-accent);
  border-radius: 8px; font-weight: 600;
}
.phase-hours { font-size: 11px; color: var(--rom-text-faint); }
.phase-cost  { font-size: 12px; font-weight: 500; color: var(--rom-accent); min-width: 64px; text-align: right; }

/* Phase body */
.phase-body { background: var(--rom-surface); }

/* Line items table */
.table-wrap { overflow-x: auto; }

.line-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.line-table th {
  padding: 7px 10px;
  text-align: left;
  font-weight: 600;
  font-size: 11px;
  color: rgba(255,255,255,.85);
  background: var(--rom-header-bg);
  border-bottom: none;
  white-space: nowrap;
}
.line-table th.col-num,
.line-table th.col-cost { text-align: right; }

.line-row td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--rom-border);
  vertical-align: middle;
}
.line-row:last-child td { border-bottom: none; }
.line-row:hover td { background: var(--rom-surface-alt); }

/* Column widths */
.col-role { width: 90px; }
.col-cat  { width: 110px; }
.col-task { min-width: 200px; }
.col-num  { width: 72px; text-align: right; }
.col-cost { width: 88px; text-align: right; }
.col-del  { width: 36px; text-align: center; }

/* Cell contents */
.role-label-cell {
  font-size: 11px; color: var(--rom-text-muted); white-space: nowrap;
}

select {
  width: 100%;
  padding: 3px 5px;
  border: 1px solid var(--rom-border);
  border-radius: 4px;
  background: var(--rom-surface);
  color: var(--rom-text);
  font-size: 12px;
  cursor: pointer;
}
select:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: transparent; }

input[type="number"] {
  width: 100%;
  text-align: right;
  padding: 3px 5px;
  border: 1px solid var(--rom-border);
  border-radius: 4px;
  background: var(--rom-surface);
  color: var(--rom-text);
  font-size: 12px;
}
input[type="number"]:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: transparent; }
input[readonly] {
  background: var(--rom-readonly);
  color: var(--rom-text-muted);
  cursor: default;
  border-color: transparent;
}

.cost-cell {
  display: block; text-align: right;
  font-weight: 500; color: var(--rom-accent);
  white-space: nowrap;
}

.del-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px;
  border: none; border-radius: 4px;
  background: transparent; color: var(--rom-text-faint);
  cursor: pointer; font-size: 13px;
}
.del-btn:hover { background: #fff0f0; color: var(--rom-danger); }

/* Empty state */
.phase-empty {
  padding: 10px 32px;
  font-size: 12px; color: var(--rom-text-faint); font-style: italic;
}

/* Add task row */
.phase-add-row {
  padding: 8px 32px;
  border-top: 1px solid var(--rom-border);
}
.add-task-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; font-size: 12px;
  border: 1px dashed var(--rom-border);
  border-radius: var(--rom-radius);
  background: transparent; color: var(--rom-text-muted); cursor: pointer;
}
.add-task-btn:hover {
  border-color: var(--rom-accent); color: var(--rom-accent);
  background: var(--rom-accent-bg);
}
</style>
