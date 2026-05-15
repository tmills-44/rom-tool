<template>
  <!-- Role-level accordion -->
  <div class="role-section">

    <!-- Role header — click to collapse/expand -->
    <button
      class="role-head"
      :class="{ 'role-head--collapsed': collapsed }"
      @click="collapsed = !collapsed"
      :aria-expanded="!collapsed"
    >
      <div class="role-head-left">
        <i
          class="ti role-chevron"
          :class="collapsed ? 'ti-chevron-right' : 'ti-chevron-down'"
          aria-hidden="true"
        ></i>
        <i class="ti" :class="role.icon" aria-hidden="true"></i>
        <span class="role-label">{{ role.label }}</span>
        <span class="role-count" v-if="allLines.length > 0">
          {{ allLines.length }} {{ allLines.length === 1 ? 'task' : 'tasks' }}
        </span>
      </div>
      <div class="role-head-right">
        <span class="role-hours">{{ Math.round(rom.roleHours(role.id, entityId)) }} hrs</span>
        <span class="role-cost">{{ fmt(rom.roleCost(role.id, entityId)) }}</span>
      </div>
    </button>

    <!-- Role body -->
    <div v-show="!collapsed" class="role-body">

      <!-- ── Flat task table (primary view) ─────────────────────── -->
      <div v-if="allLines.length > 0" class="table-wrap">
        <table class="line-table">
          <thead>
            <tr>
              <th class="col-phase">Phase</th>
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
            <tr v-for="line in allLines" :key="line.id" class="line-row">

              <!-- Phase -->
              <td class="col-phase">
                <select
                  :value="line.phaseId"
                  @change="rom.updateLine(line.id, { phaseId: $event.target.value })"
                >
                  <option v-for="p in activePhases" :key="p.id" :value="p.id">{{ p.label }}</option>
                </select>
              </td>

              <!-- Task (sub-items indented under their parent) -->
              <td class="col-task">
                <select
                  :value="line.taskId"
                  @change="rom.updateLine(line.id, { taskId: $event.target.value })"
                >
                  <option value="">— select task —</option>
                  <option
                    v-for="task in rom.tasksFor(role.id, line.phaseId)"
                    :key="task.id"
                    :value="task.id"
                  >{{ task.subphase ? ' ' + task.label : task.label }}</option>
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

              <!-- Total hrs (read-only) -->
              <td class="col-num">
                <input
                  type="number"
                  :value="Math.round(rom.lineHours(line))"
                  readonly tabindex="-1"
                />
              </td>

              <!-- Total cost (read-only) -->
              <td class="col-cost">
                <span class="cost-cell">{{ fmt(rom.lineCost(line)) }}</span>
              </td>

              <!-- Delete -->
              <td class="col-del">
                <button
                  class="del-btn"
                  @click="rom.removeLine(line.id)"
                  title="Remove this task"
                >
                  <i class="ti ti-trash" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-else class="role-empty">No tasks added yet.</div>

      <!-- Add task + phase breakdown toggle -->
      <div class="role-actions">
        <button class="add-task-btn" @click="addTask">
          <i class="ti ti-plus" aria-hidden="true"></i> Add task
        </button>
        <button class="phase-toggle-btn" @click="showPhases = !showPhases">
          <i class="ti" :class="showPhases ? 'ti-layout-list' : 'ti-layout-rows'" aria-hidden="true"></i>
          {{ showPhases ? 'Hide phase breakdown' : 'View by phase' }}
        </button>
      </div>

      <!-- ── Phase accordion (optional detailed view) ────────────── -->
      <div v-if="showPhases" class="phases-wrap">
        <PhaseSection
          v-for="phase in rom.LIFECYCLE_PHASES"
          :key="phase.id"
          :role-id="role.id"
          :phase="phase"
          :entity-id="entityId"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRomStore } from '../stores/rom'
import PhaseSection from './PhaseSection.vue'

const props = defineProps({
  role:     { type: Object, required: true },
  entityId: { type: String, required: true },
})

const rom = useRomStore()
const collapsed  = ref(false)
const showPhases = ref(false)

const allLines     = computed(() => rom.linesForRole(props.role.id, props.entityId))
const cats         = computed(() => rom.catsForRole(props.role.id))
const activePhases = computed(() => rom.LIFECYCLE_PHASES.filter(p => rom.tasksFor(props.role.id, p.id).length > 0))

function addTask() {
  collapsed.value = false
  const firstPhase = activePhases.value[0] ?? rom.LIFECYCLE_PHASES[0]
  rom.addLine(props.role.id, firstPhase.id, '', { entity: props.entityId })
}

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString() }
</script>

<style scoped>
.role-section {
  border-top: 1px solid var(--rom-border);
}
.role-section:first-child { border-top: none; }

/* Role header */
.role-head {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 10px 16px;
  border: none; background: var(--rom-surface); cursor: pointer;
  text-align: left; transition: background .1s;
}
.role-head:hover      { background: var(--rom-surface-alt); }

.role-head-left  { display: flex; align-items: center; gap: 8px; }
.role-head-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

.role-chevron { font-size: 13px; color: var(--rom-text-muted); }
.role-head-left .ti:not(.role-chevron) { font-size: 14px; color: var(--rom-text-muted); }
.role-label  { font-weight: 500; font-size: 13px; color: var(--rom-text); }
.role-count  {
  font-size: 11px; padding: 1px 7px;
  background: var(--rom-surface-alt); color: var(--rom-text-muted);
  border-radius: 10px; border: 1px solid var(--rom-border);
}
.role-hours { font-size: 12px; color: var(--rom-text-muted); }
.role-cost  { font-size: 13px; font-weight: 500; color: var(--rom-text); min-width: 72px; text-align: right; }

/* Role body */
.role-body { background: var(--rom-surface); }

/* Flat line table */
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
.col-phase { width: 210px; }
.col-task  { min-width: 200px; }
.col-cat   { width: 110px; }
.col-num   { width: 72px; text-align: right; }
.col-cost  { width: 88px; text-align: right; }
.col-del   { width: 36px; text-align: center; }

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
.role-empty {
  padding: 12px 16px;
  font-size: 12px; color: var(--rom-text-faint); font-style: italic;
}

/* Actions row */
.role-actions {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px;
  border-top: 1px solid var(--rom-border);
}

.add-task-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 12px; font-size: 12px;
  border: 1px dashed var(--rom-border);
  border-radius: var(--rom-radius);
  background: transparent; color: var(--rom-text-muted); cursor: pointer;
}
.add-task-btn:hover {
  border-color: var(--rom-accent); color: var(--rom-accent);
  background: var(--rom-accent-bg);
}

.phase-toggle-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; font-size: 11px;
  border: 1px solid var(--rom-border);
  border-radius: var(--rom-radius);
  background: transparent; color: var(--rom-text-faint); cursor: pointer;
  margin-left: auto;
}
.phase-toggle-btn:hover {
  color: var(--rom-text-muted);
  background: var(--rom-surface-alt);
}

/* Phase breakdown section */
.phases-wrap {
  border-top: 2px dashed var(--rom-border);
  background: var(--rom-bg);
}
</style>
