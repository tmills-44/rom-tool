<template>
  <div class="coa-selector" v-click-outside="close">
    <!-- Trigger chip -->
    <button class="coa-trigger" @click="open = !open" type="button" :aria-expanded="open">
      <i class="ti ti-list-check coa-trigger-icon" aria-hidden="true"></i>
      <span class="coa-trigger-label">Working on:</span>
      <span class="coa-trigger-name">{{ rom.activeCoa.name }}</span>
      <span v-if="totalCoas > 1" class="coa-trigger-count">{{ includedCount }}/{{ totalCoas }} in quote</span>
      <i class="ti coa-trigger-chevron" :class="open ? 'ti-chevron-up' : 'ti-chevron-down'" aria-hidden="true"></i>
    </button>

    <!-- Dropdown panel -->
    <div v-if="open" class="coa-panel">
      <div class="coa-panel-head">
        <span>Courses of Action</span>
        <span class="coa-panel-hint">tick = include in printed quote</span>
      </div>

      <div class="coa-list">
        <div
          v-for="coa in rom.coas"
          :key="coa.id"
          class="coa-row"
          :class="{ 'coa-row--active': coa.id === rom.activeCoaId, 'coa-row--excluded': !coa.includeInQuote }"
        >
          <input
            type="checkbox"
            :checked="coa.includeInQuote"
            @change="rom.toggleCoaIncluded(coa.id)"
            @click.stop
            :title="coa.includeInQuote ? 'Included in quote' : 'Excluded from quote'"
          />
          <button class="coa-row-main" @click="pick(coa.id)" type="button">
            <div class="coa-row-text">
              <input
                v-if="editingId === coa.id"
                type="text"
                class="coa-edit-name"
                :value="coa.name"
                @input="rom.renameCoa(coa.id, $event.target.value)"
                @blur="editingId = null"
                @keyup.enter="editingId = null"
                @click.stop
                ref="editInput"
              />
              <div v-else class="coa-row-name">
                {{ coa.name }}
                <span v-if="coa.id === rom.activeCoaId" class="coa-row-active-tag">CURRENT</span>
              </div>
              <div class="coa-row-meta">
                {{ coaLineCount(coa.id) }} lines · {{ fmt(coaTotal(coa.id)) }}
              </div>
            </div>
          </button>
          <button class="coa-row-icon" @click.stop="startEdit(coa.id)" type="button" title="Rename"><i class="ti ti-edit" aria-hidden="true"></i></button>
          <button class="coa-row-icon" @click.stop="rom.duplicateCoa(coa.id); open = false" type="button" title="Duplicate this COA"><i class="ti ti-copy" aria-hidden="true"></i></button>
          <button
            class="coa-row-icon coa-row-icon--danger"
            @click.stop="confirmDelete(coa)"
            type="button"
            :disabled="rom.coas.length <= 1"
            :title="rom.coas.length <= 1 ? 'Cannot delete the last COA' : 'Delete this COA'"
          ><i class="ti ti-trash" aria-hidden="true"></i></button>
        </div>
      </div>

      <button class="coa-add" @click="rom.addCoa(); open = false" type="button">
        <i class="ti ti-plus" aria-hidden="true"></i>
        Add another course of action
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRomStore } from '../stores/rom'

const rom = useRomStore()
const open = ref(false)
const editingId = ref(null)
const editInput = ref(null)

const totalCoas     = computed(() => rom.coas.length)
const includedCount = computed(() => rom.coas.filter(c => c.includeInQuote).length)

function pick(id) {
  rom.setActiveCoa(id)
  open.value = false
}
function startEdit(id) {
  editingId.value = id
  nextTick(() => {
    // Focus the input once it's rendered
    const el = Array.isArray(editInput.value) ? editInput.value[0] : editInput.value
    if (el) { el.focus(); el.select?.() }
  })
}
function confirmDelete(coa) {
  if (rom.coas.length <= 1) return
  const lines = coaLineCount(coa.id)
  const msg = lines > 0
    ? `Delete "${coa.name}" and its ${lines} line${lines === 1 ? '' : 's'}? This can't be undone.`
    : `Delete "${coa.name}"?`
  if (window.confirm(msg)) rom.removeCoa(coa.id)
}
function close() { open.value = false; editingId.value = null }

function coaLineCount(id) {
  return rom.lineItems.filter(l => l.coaId === id).length
}
function coaTotal(id) {
  return rom.lineItems
    .filter(l => l.coaId === id)
    .reduce((s, l) => s + (l.days || 0) * (l.hoursPerDay || 0) * (l.rate || 0), 0)
}
function fmt(n) { return '$' + Math.round(n || 0).toLocaleString() }

// Simple click-outside directive (registered locally below)
const vClickOutside = {
  mounted(el, binding) {
    el.__clickOutside = (ev) => {
      if (!el.contains(ev.target)) binding.value()
    }
    document.addEventListener('mousedown', el.__clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('mousedown', el.__clickOutside)
  },
}
</script>

<style scoped>
.coa-selector { position: relative; display: inline-block; }

.coa-trigger {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 12px;
  border-radius: 14px;
  background: rgba(125,211,252,0.18);
  border: 1px solid rgba(125,211,252,0.5);
  color: #b6e2fc;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: background .12s;
}
.coa-trigger:hover { background: rgba(125,211,252,0.28); }
.coa-trigger-icon { font-size: 13px; }
.coa-trigger-label { font-weight: 500; opacity: .8; }
.coa-trigger-name { font-weight: 700; color: #fff; }
.coa-trigger-count {
  font-size: 10px; padding: 1px 8px; border-radius: 8px;
  background: rgba(255,255,255,0.15);
  color: #fff;
}
.coa-trigger-chevron { font-size: 12px; }

.coa-panel {
  position: absolute; top: calc(100% + 6px); right: 0; z-index: 50;
  width: 380px;
  background: var(--rom-surface, #fff);
  color: var(--rom-text, #1a2133);
  border: 1px solid var(--rom-border, #c4cede);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  overflow: hidden;
}
.coa-panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .05em;
  color: var(--rom-text-muted, #4a5a78);
  background: var(--rom-surface-alt, #eaf0fb);
  border-bottom: 1px solid var(--rom-border, #c4cede);
}
.coa-panel-hint { font-weight: 500; text-transform: none; letter-spacing: 0; font-size: 10px; opacity: .7; }

.coa-list { max-height: 320px; overflow-y: auto; }
.coa-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--rom-border, #c4cede);
}
.coa-row:last-child { border-bottom: none; }
.coa-row--active { background: var(--rom-accent-bg, #e8f0fe); }
.coa-row--excluded { opacity: 0.6; }
.coa-row input[type="checkbox"] { margin: 0; width: 14px; height: 14px; cursor: pointer; flex-shrink: 0; }

.coa-row-main {
  flex: 1; min-width: 0;
  display: flex; align-items: center; gap: 8px;
  padding: 0; border: none; background: none;
  text-align: left; font-family: inherit;
  cursor: pointer;
  color: inherit;
}
.coa-row-text { flex: 1; min-width: 0; }
.coa-row-name {
  font-size: 13px; font-weight: 500; color: var(--rom-text, #1a2133);
  display: flex; align-items: center; gap: 6px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.coa-row-active-tag {
  font-size: 9px; font-weight: 700;
  padding: 1px 6px; border-radius: 3px;
  background: var(--rom-accent, #1a5fb4); color: #fff;
  letter-spacing: .04em;
}
.coa-row-meta {
  font-size: 11px; color: var(--rom-text-muted, #4a5a78);
  margin-top: 1px;
}

.coa-edit-name {
  width: 100%;
  font-size: 13px; padding: 3px 6px;
  border: 1px solid var(--rom-accent, #1a5fb4); border-radius: 4px;
  font-family: inherit;
}

.coa-row-icon {
  flex-shrink: 0;
  width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 4px;
  background: transparent; color: var(--rom-text-faint, #8a9ab8);
  cursor: pointer; font-size: 12px;
}
.coa-row-icon:hover { background: var(--rom-surface-alt, #eaf0fb); color: var(--rom-accent, #1a5fb4); }
.coa-row-icon--danger:hover:not(:disabled) { background: #fff0f0; color: var(--rom-danger, #c0392b); }
.coa-row-icon:disabled { opacity: .3; cursor: not-allowed; }

.coa-add {
  display: flex; align-items: center; gap: 6px;
  width: 100%; padding: 10px 14px;
  border: none; border-top: 1px solid var(--rom-border, #c4cede);
  background: var(--rom-surface-alt, #eaf0fb);
  color: var(--rom-accent, #1a5fb4);
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.coa-add:hover { background: var(--rom-accent-bg, #e8f0fe); }
</style>
