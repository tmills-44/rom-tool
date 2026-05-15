<template>
  <div class="admin-view">
    <!-- ── Password gate ───────────────────────────────────────────── -->
    <div v-if="!unlocked" class="lock-screen">
      <div class="lock-card">
        <i class="ti ti-shield-lock lock-icon"></i>
        <h2>Administration</h2>
        <p>Enter the admin password to manage rates and tasks.</p>
        <form @submit.prevent="tryUnlock">
          <input
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="8"
            v-model="pwInput"
            placeholder="Password"
            class="lock-input"
            :class="{ 'lock-input--error': showError }"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
          />
          <button type="submit" class="lock-submit">
            <i class="ti ti-key"></i> Unlock
          </button>
        </form>
        <div v-if="showError" class="lock-error">Incorrect password.</div>
      </div>
    </div>

    <!-- ── Admin content ───────────────────────────────────────────── -->
    <template v-else>
      <header class="admin-header">
        <div>
          <h2 class="admin-title">Administration</h2>
          <p class="admin-sub">Manage labor-category rates and the task list. Changes persist across sessions.</p>
        </div>
        <div class="admin-header-actions">
          <button class="lock-btn" @click="manualLock" title="Sign out — require password again">
            <i class="ti ti-lock"></i> Lock
          </button>
          <button class="close-btn" @click="closeAdmin" title="Close Administration" aria-label="Close">
            <i class="ti ti-x"></i>
          </button>
        </div>
      </header>

      <div class="admin-body">
        <!-- ── Display preferences ─────────────────────────────────── -->
        <section class="admin-prefs">
          <label class="pref-toggle">
            <input type="checkbox" :checked="rom.showRates" @change="rom.showRates = $event.target.checked" />
            <span class="pref-label">Show Rate column on the Deliverables page</span>
            <span class="pref-hint">When off, the per-hour $ rate is hidden from line rows. Costs and totals stay visible.</span>
          </label>
          <label class="pref-toggle">
            <input type="checkbox" :checked="rom.showRowStatus" @change="rom.showRowStatus = $event.target.checked" />
            <span class="pref-label">Show row tracking indicators</span>
            <span class="pref-hint">The green check / amber alert / empty circle next to each engineering row. Off = nothing shown, just the drag handle.</span>
          </label>
        </section>

        <!-- ── Rates editor ───────────────────────────────────────── -->
        <section class="admin-section">
          <div class="admin-section-head">
            <h3>Labor-Category Rates</h3>
            <button class="reset-btn" @click="resetRates" title="Restore factory defaults">
              <i class="ti ti-refresh"></i> Reset to defaults
            </button>
          </div>
          <p class="admin-section-desc">
            These rates auto-populate when you pick a labor category on a row. Edits apply to new rows;
            existing rows keep whatever rate they already have.
          </p>

          <div class="rates-table-wrap">
            <table class="rates-table">
              <thead>
                <tr>
                  <th class="col-move-head"></th>
                  <th class="sortable" @click="toggleSort('id')">
                    Code <span class="sort-arrow">{{ sortArrow('id') }}</span>
                  </th>
                  <th class="sortable" @click="toggleSort('label')">
                    Label <span class="sort-arrow">{{ sortArrow('label') }}</span>
                  </th>
                  <th class="sortable" @click="toggleSort('role')">
                    Role <span class="sort-arrow">{{ sortArrow('role') }}</span>
                  </th>
                  <th class="amt sortable" @click="toggleSort('defaultRate')">
                    Rate ($/hr) <span class="sort-arrow">{{ sortArrow('defaultRate') }}</span>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(cat, i) in sortedLaborCats"
                  :key="cat.id"
                  class="rate-row"
                  :class="{
                    'rate-row--dragging':  dragCat.dragId === cat.id,
                    'rate-row--drag-over': dragCat.overId === cat.id && dragCat.dragId !== cat.id,
                  }"
                  draggable="true"
                  @dragstart="onCatDragStart(cat.id)"
                  @dragend="onCatDragEnd"
                  @dragover.prevent="dragCat.overId = cat.id"
                  @dragleave="dragCat.overId = null"
                  @drop.prevent="onCatDrop(cat.id)"
                >
                  <td class="col-move-cell">
                    <div class="cat-reorder">
                      <span class="drag-handle" title="Drag to reorder">⠿</span>
                      <button
                        :disabled="i === 0 && sortKey === null"
                        @click="moveCatUp(cat.id)"
                        :title="sortKey ? 'Clear sort, then move up' : 'Move up'"
                      >
                        <i class="ti ti-chevron-up"></i>
                      </button>
                      <button
                        :disabled="i === sortedLaborCats.length - 1 && sortKey === null"
                        @click="moveCatDown(cat.id)"
                        :title="sortKey ? 'Clear sort, then move down' : 'Move down'"
                      >
                        <i class="ti ti-chevron-down"></i>
                      </button>
                    </div>
                  </td>
                  <td class="mono">{{ cat.id }}</td>
                  <td>
                    <input
                      type="text"
                      :value="cat.label"
                      class="cell-input"
                      @input="rom.updateLaborCatLabel(cat.id, $event.target.value)"
                    />
                  </td>
                  <td>
                    <select
                      :value="cat.role"
                      class="cell-input cell-input--role"
                      :class="`role-select--${cat.role}`"
                      @change="rom.updateLaborCatRole(cat.id, $event.target.value)"
                    >
                      <option value="engineering">Engineering</option>
                      <option value="pm">PM</option>
                      <option value="programming">Programming</option>
                      <option value="technician">Technician</option>
                    </select>
                  </td>
                  <td class="amt">
                    <div class="rate-input-wrap">
                      <span class="rate-prefix">$</span>
                      <input
                        type="number" min="0" step="0.01"
                        :value="cat.defaultRate"
                        class="cell-input cell-input--rate"
                        @input="rom.updateLaborCatRate(cat.id, +$event.target.value)"
                      />
                    </div>
                  </td>
                  <td class="amt">
                    <button
                      class="cat-delete"
                      @click="confirmRemoveCat(cat)"
                      :title="`Delete ${cat.label}`"
                    >
                      <i class="ti ti-trash"></i>
                    </button>
                  </td>
                </tr>
                <!-- Add new category row -->
                <tr class="add-cat-row">
                  <td class="col-move-cell"></td>
                  <td class="mono">new</td>
                  <td>
                    <input
                      type="text"
                      v-model="newCat.label"
                      class="cell-input"
                      placeholder="Category name (e.g. DESIGNER)"
                      @keydown.enter="addNewCat"
                    />
                  </td>
                  <td>
                    <select v-model="newCat.role" class="cell-input cell-input--role">
                      <option value="engineering">Engineering</option>
                      <option value="pm">PM</option>
                      <option value="programming">Programming</option>
                      <option value="technician">Technician</option>
                    </select>
                  </td>
                  <td class="amt">
                    <div class="rate-input-wrap">
                      <span class="rate-prefix">$</span>
                      <input
                        type="number" min="0" step="0.01"
                        v-model.number="newCat.defaultRate"
                        class="cell-input cell-input--rate"
                        placeholder="0"
                        @keydown.enter="addNewCat"
                      />
                    </div>
                  </td>
                  <td class="amt">
                    <button
                      class="cat-add"
                      :disabled="!newCat.label.trim()"
                      @click="addNewCat"
                      title="Add labor category"
                    >
                      <i class="ti ti-plus"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ── WBS / Task editor ──────────────────────────────────── -->
        <section class="admin-section">
          <div class="admin-section-head">
            <h3>Tasks (Work Breakdown Structure)</h3>
            <button class="reset-btn" @click="resetWbs" title="Restore factory defaults">
              <i class="ti ti-refresh"></i> Reset to defaults
            </button>
          </div>
          <p class="admin-section-desc">
            Pick a role and phase, then add / rename / remove / reorder tasks. These show up in the
            Task dropdown when you add a row in Engineering.
          </p>

          <!-- Role + phase picker -->
          <div class="wbs-picker">
            <label class="wbs-picker-label">Role</label>
            <select v-model="selectedRole" class="cell-input">
              <option v-for="role in rom.ROLES" :key="role.id" :value="role.id">{{ role.label }}</option>
            </select>
            <label class="wbs-picker-label">Phase</label>
            <select v-model="selectedPhase" class="cell-input">
              <option v-for="phase in rom.LIFECYCLE_PHASES" :key="phase.id" :value="phase.id">{{ phase.label }}</option>
            </select>
          </div>

          <!-- Task list -->
          <div class="wbs-task-list">
            <div v-if="!currentTasks.length" class="wbs-empty">
              No tasks defined for this role / phase. Add one below.
            </div>
            <div
              v-for="(task, i) in currentTasks"
              :key="task.id"
              class="wbs-task-row"
              :class="{
                'wbs-task-row--dragging':  dragTask.dragId === task.id,
                'wbs-task-row--drag-over': dragTask.overId === task.id && dragTask.dragId !== task.id,
              }"
              draggable="true"
              @dragstart="dragTask.dragId = task.id"
              @dragend="dragTask.dragId = null; dragTask.overId = null"
              @dragover.prevent="dragTask.overId = task.id"
              @dragleave="dragTask.overId = null"
              @drop.prevent="onTaskDrop(task.id)"
            >
              <div class="wbs-reorder">
                <span class="drag-handle" title="Drag to reorder">⠿</span>
                <button :disabled="i === 0" @click="rom.moveTask(selectedRole, selectedPhase, task.id, 'up')" title="Move up">
                  <i class="ti ti-chevron-up"></i>
                </button>
                <button :disabled="i === currentTasks.length - 1" @click="rom.moveTask(selectedRole, selectedPhase, task.id, 'down')" title="Move down">
                  <i class="ti ti-chevron-down"></i>
                </button>
              </div>
              <input
                type="text"
                :value="task.subphase || ''"
                placeholder="Sub-phase (optional)"
                class="cell-input cell-input--subphase"
                @input="rom.updateTask(selectedRole, selectedPhase, task.id, { subphase: $event.target.value || undefined })"
              />
              <input
                type="text"
                :value="task.label"
                placeholder="Task name"
                class="cell-input cell-input--task"
                @input="rom.updateTask(selectedRole, selectedPhase, task.id, { label: $event.target.value })"
              />
              <button class="wbs-delete" @click="rom.removeTask(selectedRole, selectedPhase, task.id)" title="Remove task">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>

          <!-- Add task -->
          <div class="wbs-add-row">
            <input
              type="text"
              v-model="newSubphase"
              placeholder="Sub-phase (optional)"
              class="cell-input cell-input--subphase"
            />
            <input
              type="text"
              v-model="newTaskLabel"
              placeholder="New task name"
              class="cell-input cell-input--task"
              @keydown.enter="addNewTask"
            />
            <button class="add-task-btn" @click="addNewTask" :disabled="!newTaskLabel.trim()">
              <i class="ti ti-plus"></i> Add task
            </button>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, watch } from 'vue'
import { useRomStore } from '../stores/rom'

const rom = useRomStore()

const ADMIN_PASSWORD = '8888'
const UNLOCK_KEY = 'rom-admin-unlocked'

const unlocked  = ref(sessionStorage.getItem(UNLOCK_KEY) === '1')
const pwInput   = ref('')
const showError = ref(false)
// Remember which tab the user came from so the X can return them there
const previousTabId = ref('engineering')

watch(() => rom.selectedTabId, (newTab, oldTab) => {
  if (newTab === 'admin' && oldTab && oldTab !== 'admin') {
    previousTabId.value = oldTab
  }
})

function tryUnlock() {
  if (pwInput.value.trim() === ADMIN_PASSWORD) {
    unlocked.value = true
    sessionStorage.setItem(UNLOCK_KEY, '1')
    pwInput.value = ''
    showError.value = false
  } else {
    showError.value = true
    pwInput.value = ''
  }
}

function manualLock() {
  unlocked.value = false
  sessionStorage.removeItem(UNLOCK_KEY)
}

function closeAdmin() {
  // Don't lock — just navigate back to where the user came from.
  // Unlock state persists in sessionStorage so they don't have to retype next time.
  rom.selectedTabId = previousTabId.value || 'engineering'
}

// Sort state for the rates table
const sortKey = ref(null)      // 'id' | 'label' | 'role' | 'defaultRate' | null (unsorted, preserves original order)
const sortDir = ref('asc')     // 'asc' | 'desc'

function toggleSort(key) {
  if (sortKey.value === key) {
    // Same column clicked: asc → desc → unsorted → asc → …
    if (sortDir.value === 'asc')      sortDir.value = 'desc'
    else if (sortDir.value === 'desc') { sortKey.value = null; sortDir.value = 'asc' }
    else                               sortDir.value = 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortArrow(key) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

const sortedLaborCats = computed(() => {
  const list = [...rom.LABOR_CATS]
  if (!sortKey.value) return list
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return list.sort((a, b) => {
    let va = a[key], vb = b[key]
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va < vb) return -1 * dir
    if (va > vb) return  1 * dir
    return 0
  })
})

// Reorder helpers — clear any active column sort first so the up/down buttons
// actually visibly reorder rows even when the table is currently sorted.
function moveCatUp(catId) {
  if (sortKey.value) { sortKey.value = null; sortDir.value = 'asc' }
  rom.moveLaborCat(catId, 'up')
}
function moveCatDown(catId) {
  if (sortKey.value) { sortKey.value = null; sortDir.value = 'asc' }
  rom.moveLaborCat(catId, 'down')
}

// ── Drag-and-drop reorder: rates table ──────────────────────────────
const dragCat = reactive({ dragId: null, overId: null })
function onCatDragStart(catId) {
  // Clear column sort so the visible order reflects the underlying array
  if (sortKey.value) { sortKey.value = null; sortDir.value = 'asc' }
  dragCat.dragId = catId
}
function onCatDragEnd() {
  dragCat.dragId = null
  dragCat.overId = null
}
function onCatDrop(dropId) {
  rom.reorderLaborCat(dragCat.dragId, dropId)
  dragCat.dragId = null
  dragCat.overId = null
}

// ── Drag-and-drop reorder: WBS tasks ────────────────────────────────
const dragTask = reactive({ dragId: null, overId: null })
function onTaskDrop(dropId) {
  rom.reorderTask(selectedRole.value, selectedPhase.value, dragTask.dragId, dropId)
  dragTask.dragId = null
  dragTask.overId = null
}

// New labor-category form state
const newCat = ref({ label: '', role: 'engineering', defaultRate: 0 })

function addNewCat() {
  const label = newCat.value.label.trim()
  if (!label) return
  rom.addLaborCat({
    label,
    role: newCat.value.role,
    defaultRate: newCat.value.defaultRate,
  })
  newCat.value = { label: '', role: 'engineering', defaultRate: 0 }
}

function confirmRemoveCat(cat) {
  if (!confirm(`Delete labor category "${cat.label}"?\n\nExisting line items that use this category will keep their saved rate, but the category will no longer appear in the dropdown.`)) return
  rom.removeLaborCat(cat.id)
}

// WBS editor state
const selectedRole  = ref('engineering')
const selectedPhase = ref('cost-estimate')
const newSubphase   = ref('')
const newTaskLabel  = ref('')

const currentTasks = computed(() => rom.wbs[selectedRole.value]?.[selectedPhase.value] ?? [])

function addNewTask() {
  if (!newTaskLabel.value.trim()) return
  rom.addTask(selectedRole.value, selectedPhase.value, {
    label: newTaskLabel.value.trim(),
    subphase: newSubphase.value.trim() || undefined,
  })
  newTaskLabel.value = ''
  // keep subphase so user can add multiple tasks to the same sub-phase
}

function resetRates() {
  if (!confirm('Reset all labor-category rates to factory defaults? Existing line items keep their current rates.')) return
  rom.resetLaborCats()
}
function resetWbs() {
  if (!confirm('Reset the entire task list to factory defaults? This removes any custom tasks you added.')) return
  rom.resetWbs()
}
</script>

<style scoped>
.admin-view { padding: 0 0 48px; }

/* ── Lock screen ────────────────────────────────────────────────── */
.lock-screen {
  display: flex; align-items: center; justify-content: center;
  min-height: 70vh;
  padding: 20px;
}
.lock-card {
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  padding: 32px 40px;
  max-width: 380px;
  width: 100%;
  text-align: center;
}
.lock-icon { font-size: 40px; color: var(--rom-accent, #1a5fb4); margin-bottom: 8px; }
.lock-card h2 { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
.lock-card p  { font-size: 13px; color: var(--rom-text-muted); margin: 0 0 20px; }
.lock-input {
  width: 100%;
  padding: 10px 12px; font-size: 14px;
  border: 1px solid var(--rom-border); border-radius: var(--rom-radius, 6px);
  background: var(--rom-surface); color: var(--rom-text);
  margin-bottom: 10px;
}
.lock-input:focus { outline: 2px solid var(--rom-accent, #1a5fb4); outline-offset: -1px; }
.lock-input--error { border-color: var(--rom-danger, #c44a4a); }
.lock-submit {
  width: 100%;
  padding: 10px 16px; font-size: 13px; font-weight: 600;
  background: var(--rom-accent, #1a5fb4); color: #fff;
  border: 1px solid var(--rom-accent, #1a5fb4); border-radius: var(--rom-radius, 6px);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.lock-submit:hover { background: var(--rom-accent-dark, #134a91); border-color: var(--rom-accent-dark, #134a91); }
.lock-error { color: var(--rom-danger, #c44a4a); font-size: 12px; margin-top: 8px; }

/* ── Admin content ──────────────────────────────────────────────── */
.admin-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  padding: 20px 24px 14px;
  border-bottom: 1px solid var(--rom-border);
  background: var(--rom-surface);
}
.admin-title { font-size: 20px; font-weight: 600; margin: 0 0 2px; }
.admin-sub   { font-size: 12px; color: var(--rom-text-muted); margin: 0; }
.admin-header-actions { display: inline-flex; align-items: center; gap: 8px; }
.lock-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; padding: 6px 12px;
  background: transparent; color: var(--rom-text-muted);
  border: 1px solid var(--rom-border); border-radius: var(--rom-radius, 6px);
  cursor: pointer;
}
.lock-btn:hover { color: var(--rom-text); border-color: var(--rom-text-muted); }
.close-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  font-size: 18px;
  background: transparent; color: var(--rom-text-muted);
  border: 1px solid var(--rom-border); border-radius: var(--rom-radius, 6px);
  cursor: pointer;
}
.close-btn:hover { color: #fff; background: var(--rom-danger, #c44a4a); border-color: var(--rom-danger, #c44a4a); }

.admin-body { padding: 20px; display: flex; flex-direction: column; gap: 24px; }

.admin-prefs {
  background: var(--rom-surface-alt, #f7f5ee);
  border: 1px solid var(--rom-border, #d8d6cd);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.pref-toggle {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 4px 10px;
  cursor: pointer;
}
.pref-toggle + .pref-toggle { padding-top: 10px; border-top: 1px dashed var(--rom-border, #d8d6cd); }
.pref-toggle input { grid-row: span 2; width: 18px; height: 18px; cursor: pointer; }
.pref-label { font-size: 13px; font-weight: 500; }
.pref-hint  { font-size: 11px; color: var(--rom-text-muted); }

.admin-section {
  background: var(--rom-surface);
  border: 1px solid var(--rom-border); border-radius: 8px;
  padding: 16px 20px;
}
.admin-section-head { display: flex; align-items: center; justify-content: space-between; }
.admin-section-head h3 { margin: 0; font-size: 15px; font-weight: 600; }
.admin-section-desc { font-size: 12px; color: var(--rom-text-muted); margin: 6px 0 14px; }
.reset-btn {
  font-size: 11px; padding: 4px 10px;
  background: transparent; color: var(--rom-text-muted);
  border: 1px solid var(--rom-border); border-radius: 4px;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px;
}
.reset-btn:hover { color: var(--rom-text); border-color: var(--rom-text-muted); }

/* Rates table */
.rates-table-wrap { overflow-x: auto; }
.rates-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.rates-table th {
  text-align: left; font-weight: 600; font-size: 11px;
  text-transform: uppercase; letter-spacing: .04em;
  color: var(--rom-text-muted);
  padding: 8px 10px; border-bottom: 1px solid var(--rom-border);
}
.rates-table th.sortable { cursor: pointer; user-select: none; }
.rates-table th.sortable:hover { color: var(--rom-text); }
.sort-arrow { display: inline-block; min-width: 14px; color: var(--rom-accent, #1a5fb4); font-size: 10px; }

/* Manual reorder column */
.col-move-head { width: 78px; }
.col-move-cell { width: 78px; padding: 4px 6px !important; }
.cat-reorder { display: inline-flex; gap: 2px; align-items: center; }
.cat-reorder button {
  width: 22px; height: 22px;
  background: transparent; color: var(--rom-text-muted);
  border: 1px solid var(--rom-border); border-radius: 4px;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px;
}
.cat-reorder button:hover:not(:disabled) { color: var(--rom-text); border-color: var(--rom-text-muted); }
.cat-reorder button:disabled { opacity: 0.3; cursor: not-allowed; }

/* Drag handle (six-dot grip) */
.drag-handle {
  cursor: grab;
  color: var(--rom-text-faint, #b4b2a9);
  font-size: 16px;
  padding: 0 4px;
  user-select: none;
  display: inline-flex;
  align-items: center;
}
.drag-handle:hover { color: var(--rom-text-muted, #6f6f6a); }
.drag-handle:active { cursor: grabbing; }

/* Drag state on table rows */
.rate-row { cursor: default; }
.rate-row--dragging { opacity: 0.4; }
.rate-row--drag-over td { border-top: 2px solid var(--rom-accent, #1a5fb4) !important; }

/* Drag state on WBS task rows */
.wbs-task-row { transition: background .1s ease, transform .1s ease; }
.wbs-task-row--dragging { opacity: 0.4; }
.wbs-task-row--drag-over { box-shadow: inset 0 2px 0 0 var(--rom-accent, #1a5fb4); }
.rates-table th.amt { text-align: right; }
.rates-table td { padding: 6px 10px; border-bottom: 1px solid var(--rom-border); }
.rates-table td.amt { text-align: right; }
.rates-table td.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--rom-text-muted); }

.role-pill {
  font-size: 10px; font-weight: 600; padding: 2px 8px;
  border-radius: 10px; text-transform: uppercase; letter-spacing: .03em;
}
.role-pill--engineering { background: #f0f5ff; color: #1a5fb4; }
.role-pill--pm          { background: #f0faf0; color: #2e7d32; }
.role-pill--programming { background: #f7f0ff; color: #6a1b9a; }
.role-pill--technician  { background: #fdf6e3; color: #8a6508; }

/* Role dropdown — tint to match the chosen role */
.cell-input--role { font-weight: 600; font-size: 11px; padding: 4px 8px; }
.role-select--engineering { background: #f0f5ff; color: #1a5fb4; }
.role-select--pm          { background: #f0faf0; color: #2e7d32; }
.role-select--programming { background: #f7f0ff; color: #6a1b9a; }
.role-select--technician  { background: #fdf6e3; color: #8a6508; }

/* Delete / add category buttons */
.cat-delete, .cat-add {
  width: 28px; height: 26px;
  background: transparent;
  border: 1px solid var(--rom-border); border-radius: 4px;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px;
}
.cat-delete { color: var(--rom-text-muted); }
.cat-delete:hover { color: var(--rom-danger, #c44a4a); border-color: var(--rom-danger, #c44a4a); background: #fff0f0; }
.cat-add {
  color: #fff; background: var(--rom-accent, #1a5fb4); border-color: var(--rom-accent, #1a5fb4);
}
.cat-add:hover:not(:disabled) { background: var(--rom-accent-dark, #134a91); }
.cat-add:disabled { opacity: 0.4; cursor: not-allowed; }

.add-cat-row td {
  background: var(--rom-surface-alt);
  border-top: 1px dashed var(--rom-border);
}
.add-cat-row td.mono { color: var(--rom-text-faint); font-style: italic; }

.cell-input {
  width: 100%;
  padding: 5px 8px; font-size: 12px;
  border: 1px solid var(--rom-border); border-radius: 4px;
  background: var(--rom-surface); color: var(--rom-text);
  font-family: inherit;
}
.cell-input:focus { outline: 2px solid var(--rom-accent, #1a5fb4); outline-offset: -1px; }
.cell-input--rate { text-align: right; width: 90px; }
.rate-input-wrap { display: inline-flex; align-items: center; gap: 4px; }
.rate-prefix { font-size: 11px; color: var(--rom-text-muted); }

/* WBS picker */
.wbs-picker {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 12px; margin-bottom: 14px;
  background: var(--rom-surface-alt); border-radius: 6px;
}
.wbs-picker .cell-input { width: auto; min-width: 180px; }
.wbs-picker-label {
  font-size: 11px; font-weight: 600; color: var(--rom-text-muted);
  text-transform: uppercase; letter-spacing: .04em;
}

.wbs-task-list {
  display: flex; flex-direction: column; gap: 4px;
  margin-bottom: 12px;
}
.wbs-task-row {
  display: grid;
  grid-template-columns: 50px 200px 1fr 36px;
  gap: 6px; align-items: center;
}
.wbs-empty {
  font-size: 12px; color: var(--rom-text-muted); font-style: italic;
  padding: 12px; background: var(--rom-surface-alt); border-radius: 4px;
  text-align: center;
}

.wbs-reorder { display: inline-flex; gap: 2px; }
.wbs-reorder button {
  width: 22px; height: 22px;
  background: transparent; color: var(--rom-text-muted);
  border: 1px solid var(--rom-border); border-radius: 4px;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px;
}
.wbs-reorder button:hover:not(:disabled) { color: var(--rom-text); border-color: var(--rom-text-muted); }
.wbs-reorder button:disabled { opacity: 0.3; cursor: not-allowed; }

.cell-input--subphase { font-size: 11px; color: var(--rom-text-muted); font-style: italic; }
.cell-input--task     { font-size: 12px; }

.wbs-delete {
  width: 30px; height: 28px;
  background: transparent; color: var(--rom-text-muted);
  border: 1px solid var(--rom-border); border-radius: 4px;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
}
.wbs-delete:hover { color: var(--rom-danger, #c44a4a); border-color: var(--rom-danger, #c44a4a); background: #fff0f0; }

.wbs-add-row {
  display: grid;
  grid-template-columns: 200px 1fr auto;
  gap: 6px; align-items: center;
  padding-top: 10px; border-top: 1px dashed var(--rom-border);
}
.add-task-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; font-size: 12px; font-weight: 600;
  background: var(--rom-accent, #1a5fb4); color: #fff;
  border: 1px solid var(--rom-accent, #1a5fb4); border-radius: var(--rom-radius, 6px);
  cursor: pointer;
}
.add-task-btn:hover:not(:disabled) { background: var(--rom-accent-dark, #134a91); }
.add-task-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
