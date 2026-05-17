<template>
  <div class="phase-task-table">
    <!-- WBS has no tasks at all for this phase -->
    <template v-if="!wbsTasks.length">
      <div class="empty-phase">
        <i class="ti ti-info-circle"></i>
        <span>No tasks defined for this phase. Add some in WBS Settings.</span>
      </div>
    </template>

    <template v-else>
      <!-- Render only tasks that have at least one line item, grouped by sub-phase -->
      <div v-for="group in usedGroups" :key="group.label || '__none__'" class="task-group">
        <div v-if="group.label" class="subphase-head">
          <span>{{ group.label }}</span>
          <span class="subphase-total">{{ fmt(subphaseTotal(group)) }}</span>
        </div>

        <div class="task-row task-header">
          <div>Task</div>
          <div>Entity</div>
          <div>Persons</div>
          <div>Days</div>
          <div>Hrs/Day</div>
          <div>Total Hrs</div>
          <div>Rate</div>
          <div>Cost</div>
          <div></div><div></div><div></div>
        </div>

        <template v-for="task in group.tasks" :key="task.id">
          <div
            v-for="line in linesFor(task.id)"
            :key="line.id"
            class="task-row"
            :class="`row-${line.entity}`"
          >
            <span class="task-label" :title="task.label">{{ task.label }}</span>
            <select
              :value="line.entity"
              :class="`ent-${line.entity}`"
              @change="rom.updateLine(line.id, { entity: $event.target.value })"
            >
              <option v-for="ent in rom.ENTITIES" :key="ent.id" :value="ent.id">{{ ent.label }}</option>
            </select>
            <input type="number" min="0" step="1" :value="line.persons"
              @input="rom.updateLine(line.id, { persons: +$event.target.value })" />
            <input type="number" min="0" step="1" :value="line.days"
              @input="rom.updateLine(line.id, { days: +$event.target.value })" />
            <input type="number" min="0" step="1" :value="line.hoursPerDay"
              @input="rom.updateLine(line.id, { hoursPerDay: +$event.target.value })" />
            <input type="number" :value="rom.lineHours(line)" readonly tabindex="-1" class="readonly" />
            <input type="number" min="0" step="1" :value="line.rate"
              @input="rom.updateLine(line.id, { rate: +$event.target.value })" />
            <span class="cost">{{ fmt(rom.lineCost(line)) }}</span>

            <!-- Copy to scope -->
            <div class="line-action-wrap" v-if="otherScopes.length">
              <button
                class="line-action line-action--copy"
                :class="{ 'line-action--open': copyMenuId === line.id }"
                @click.stop="toggleCopyMenu(line.id)"
                :title="otherScopes.length === 1 ? `Copy to ${otherScopes[0].name}` : 'Copy to another scope'"
              >
                <i class="ti ti-copy"></i>
              </button>
              <div v-if="copyMenuId === line.id && otherScopes.length > 1" class="copy-menu">
                <button
                  v-for="s in otherScopes"
                  :key="s.id"
                  class="copy-menu-item"
                  @click="doCopy(line.id, s.id)"
                >
                  <i class="ti ti-arrow-right"></i> {{ s.name }}
                </button>
              </div>
            </div>
            <span v-else></span>

            <!-- Notes toggle -->
            <button
              class="line-action"
              :class="{ 'line-action--has-notes': line.notes }"
              @click="toggleNotes(line.id)"
              :title="line.notes ? 'Edit note' : 'Add note'"
            >
              <i class="ti" :class="line.notes ? 'ti-notes' : 'ti-notes'"></i>
            </button>

            <!-- Remove -->
            <button class="remove" @click="rom.removeLine(line.id)" title="Remove this line">
              <i class="ti ti-x"></i>
            </button>
          </div>

          <!-- Notes row — expands inline below the line it belongs to -->
          <template v-for="line in linesFor(task.id)" :key="`notes-${line.id}`">
            <div v-if="notesOpenIds.has(line.id)" class="notes-row">
              <textarea
                class="line-notes-input"
                :value="line.notes || ''"
                @input="rom.updateLine(line.id, { notes: $event.target.value })"
                placeholder="Assumptions or notes for this line…"
                rows="2"
                :ref="el => { if (el) el.focus() }"
              />
            </div>
          </template>

          <!-- Below each task's line(s): a tiny button to add a second entity -->
          <div class="task-row add-second" v-if="canAddAnother(task.id)">
            <span></span>
            <button class="add-second-btn" @click="addAnother(task.id)">
              <i class="ti ti-plus"></i> add line for another entity
            </button>
          </div>
        </template>
      </div>

      <!-- "+ Add task" picker — appears at the bottom of every phase that has unused WBS tasks -->
      <div class="add-task-section">
        <div v-if="!availableTasks.length" class="all-added">
          <i class="ti ti-checks"></i>
          <span>All WBS tasks for this phase are added.</span>
        </div>
        <div v-else class="add-task-control">
          <i class="ti ti-plus add-icon"></i>
          <select
            v-model="newTaskId"
            @change="onAddTask"
            class="add-task-select"
          >
            <option value="" disabled selected>Add task to this phase…</option>
            <template v-for="g in availableGroups" :key="g.label || '__none__'">
              <optgroup v-if="g.label" :label="g.label">
                <option v-for="t in g.tasks" :key="t.id" :value="t.id">{{ t.label }}</option>
              </optgroup>
              <template v-else>
                <option v-for="t in g.tasks" :key="t.id" :value="t.id">{{ t.label }}</option>
              </template>
            </template>
          </select>
          <span class="available-hint">{{ availableTasks.length }} available</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRomStore } from '../stores/rom'

const props = defineProps({
  role:    { type: String, required: true },
  phaseId: { type: String, required: true },
})

const rom = useRomStore()
const newTaskId = ref('')

// Notes expand/collapse — track which line IDs have their notes row open
const notesOpenIds = ref(new Set())
function toggleNotes(lineId) {
  const s = new Set(notesOpenIds.value)
  if (s.has(lineId)) s.delete(lineId)
  else s.add(lineId)
  notesOpenIds.value = s
}

// Copy-to-scope menu
const copyMenuId = ref(null)
const otherScopes = computed(() =>
  rom.coas.filter(c => c.id !== rom.activeCoaId)
)
function toggleCopyMenu(lineId) {
  if (otherScopes.value.length === 1) {
    rom.copyLineToScope(lineId, otherScopes.value[0].id)
    return
  }
  copyMenuId.value = copyMenuId.value === lineId ? null : lineId
}
function doCopy(lineId, targetCoaId) {
  rom.copyLineToScope(lineId, targetCoaId)
  copyMenuId.value = null
}
// Close copy menu on outside click
if (typeof document !== 'undefined') {
  document.addEventListener('mousedown', () => { copyMenuId.value = null }, true)
}

const wbsTasks = computed(() => rom.tasksFor(props.role, props.phaseId))

function linesFor(taskId) {
  return rom.linesForTask(props.role, props.phaseId, taskId)
}

// Set of taskIds that already have at least one line item in this phase.
const usedTaskIds = computed(() => {
  const ids = new Set()
  rom.linesForPhase(props.role, props.phaseId).forEach(l => ids.add(l.taskId))
  return ids
})

// Render only the WBS tasks that are in use, grouped by sub-phase.
const usedGroups = computed(() => {
  const groups = []
  const map = new Map()
  wbsTasks.value
    .filter(t => usedTaskIds.value.has(t.id))
    .forEach(t => {
      const key = t.subphase || '__none__'
      if (!map.has(key)) {
        const g = { label: t.subphase || null, tasks: [] }
        map.set(key, g)
        groups.push(g)
      }
      map.get(key).tasks.push(t)
    })
  return groups
})

// WBS tasks NOT yet used → these populate the "Add task" dropdown.
const availableTasks = computed(() =>
  wbsTasks.value.filter(t => !usedTaskIds.value.has(t.id))
)

const availableGroups = computed(() => {
  const groups = []
  const map = new Map()
  availableTasks.value.forEach(t => {
    const key = t.subphase || '__none__'
    if (!map.has(key)) {
      const g = { label: t.subphase || null, tasks: [] }
      map.set(key, g)
      groups.push(g)
    }
    map.get(key).tasks.push(t)
  })
  return groups
})

function subphaseTotal(group) {
  return group.tasks.reduce((s, t) =>
    s + linesFor(t.id).reduce((s2, l) => s2 + rom.lineCost(l), 0)
  , 0)
}

function canAddAnother(taskId) {
  // Only show the "+ add line for another entity" button if there's an entity not yet on this task
  const used = new Set(linesFor(taskId).map(l => l.entity))
  return rom.ENTITIES.some(e => !used.has(e.id))
}

function addAnother(taskId) {
  const existing = new Set(linesFor(taskId).map(l => l.entity))
  const next = ['gov', 'sub', 'cronos'].find(e => !existing.has(e))
  if (next) rom.addLine(props.role, props.phaseId, taskId, { entity: next })
}

function onAddTask() {
  if (!newTaskId.value) return
  rom.addLine(props.role, props.phaseId, newTaskId.value, { entity: 'cronos' })
  newTaskId.value = ''
}

function fmt(n) {
  return '$' + Math.round(n || 0).toLocaleString()
}
</script>

<style scoped>
.phase-task-table { padding: 0; }

.empty-phase {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  color: var(--rom-text-muted, #6f6f6a);
  font-size: 12px;
  background: var(--rom-readonly, #f3f2ec);
  border-radius: 6px;
  margin: 4px 0;
}
.empty-phase i { font-size: 16px; }

.task-group { margin-bottom: 14px; }

.subphase-head {
  padding: 8px 12px;
  background: var(--rom-readonly, #f3f2ec);
  border-radius: 6px;
  margin: 12px 0 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
}
.subphase-total {
  color: var(--rom-text-muted, #6f6f6a);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.task-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.8fr) 110px 70px 70px 70px 80px 90px 90px 28px 28px 28px;
  gap: 8px;
  align-items: center;
  padding: 5px 4px;
  font-size: 12px;
}
.task-header {
  font-size: 11px;
  color: var(--rom-text-muted, #6f6f6a);
  border-bottom: 0.5px solid var(--rom-border, #d8d6cd);
  padding-bottom: 4px;
}
.task-label {
  font-size: 12px;
  color: var(--rom-text, #1a1a1a);
  padding-left: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-row select,
.task-row input {
  height: 28px;
  font-size: 12px;
  padding: 0 6px;
  border: 0.5px solid var(--rom-border, #d8d6cd);
  border-radius: 6px;
  background: var(--rom-surface, #fff);
  color: var(--rom-text, #1a1a1a);
  font-family: inherit;
  width: 100%;
}
.task-row input.readonly {
  background: var(--rom-readonly, #f3f2ec);
  color: var(--rom-text-muted, #6f6f6a);
}
.task-row select:focus,
.task-row input:focus {
  outline: 2px solid #1d9e75;
  outline-offset: -1px;
}
.cost {
  font-size: 12px;
  font-weight: 500;
  text-align: right;
  font-variant-numeric: tabular-nums;
  padding-right: 4px;
}
.line-action {
  background: transparent; border: none; cursor: pointer;
  padding: 4px; border-radius: 4px;
  color: var(--rom-text-faint, #8a9ab8);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; width: 28px; height: 28px;
}
.line-action:hover { background: var(--rom-surface-alt, #eaf0fb); color: var(--rom-accent, #1a5fb4); }
.line-action--has-notes { color: var(--rom-accent, #1a5fb4); }
.line-action--open { background: var(--rom-accent-bg, #e8f0fe); color: var(--rom-accent, #1a5fb4); }

.line-action-wrap { position: relative; }
.copy-menu {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 50;
  min-width: 220px;
  background: var(--rom-surface, #fff);
  border: 1px solid var(--rom-border, #c4cede);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.15);
  overflow: hidden;
}
.copy-menu-item {
  display: flex; align-items: center; gap: 6px;
  width: 100%; padding: 8px 12px;
  background: transparent; border: none; border-bottom: 1px solid var(--rom-border, #c4cede);
  font-size: 12px; font-family: inherit; text-align: left; cursor: pointer;
  color: var(--rom-text, #1a2133);
}
.copy-menu-item:last-child { border-bottom: none; }
.copy-menu-item:hover { background: var(--rom-accent-bg, #e8f0fe); }
.copy-menu-item .ti { font-size: 11px; color: var(--rom-accent, #1a5fb4); }

.notes-row {
  padding: 2px 4px 6px 4px;
}
.line-notes-input {
  width: 100%; resize: vertical;
  font-size: 12px; font-family: inherit; line-height: 1.4;
  padding: 5px 8px;
  border: 1px solid var(--rom-accent, #1a5fb4); border-radius: 5px;
  background: var(--rom-accent-bg, #e8f0fe);
  color: var(--rom-text, #1a2133);
}
.line-notes-input:focus {
  outline: 2px solid var(--rom-accent, #1a5fb4); outline-offset: -1px;
}

.remove {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--rom-text-muted, #6f6f6a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}
.remove:hover { color: #c44a4a; background: rgba(196,74,74,0.08); }

.row-gov { background: rgba(24, 95, 165, 0.04); border-radius: 4px; }
.row-sub { background: rgba(133, 79, 11, 0.04); border-radius: 4px; }

.add-second { padding-left: 0; }
.add-second-btn {
  background: transparent;
  border: 1px dashed var(--rom-border, #d8d6cd);
  color: var(--rom-text-muted, #6f6f6a);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.add-second-btn:hover { border-style: solid; color: var(--rom-text, #1a1a1a); }

/* "+ Add task" picker at the bottom of each phase */
.add-task-section { margin-top: 8px; }
.add-task-control {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px dashed var(--rom-border, #d8d6cd);
  border-radius: 6px;
  background: transparent;
}
.add-task-control:hover { border-style: solid; }
.add-icon {
  color: #1d9e75;
  font-size: 16px;
}
.add-task-select {
  flex: 1;
  height: 30px;
  font-size: 12px;
  padding: 0 8px;
  border: 0.5px solid var(--rom-border, #d8d6cd);
  border-radius: 6px;
  background: var(--rom-surface, #fff);
  color: var(--rom-text, #1a1a1a);
  font-family: inherit;
}
.available-hint {
  font-size: 11px;
  color: var(--rom-text-muted, #6f6f6a);
  white-space: nowrap;
}
.all-added {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 11px;
  color: var(--rom-text-muted, #6f6f6a);
}
.all-added i { color: #1d9e75; font-size: 14px; }

.ent-cronos { color: #085041; }
.ent-gov    { color: #185fa5; }
.ent-sub    { color: #854f0b; }
@media (prefers-color-scheme: dark) {
  .ent-cronos { color: #9fe1cb; }
  .ent-gov    { color: #b5d4f4; }
  .ent-sub    { color: #fac775; }
  .row-gov { background: rgba(181, 212, 244, 0.08); }
  .row-sub { background: rgba(250, 199, 117, 0.08); }
}
</style>
