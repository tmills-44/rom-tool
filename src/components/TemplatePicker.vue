<template>
  <Transition name="picker">
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-labelledby="picker-title">

      <header class="modal-head">
        <div class="modal-head-left">
          <i class="ti ti-door-enter modal-head-icon" aria-hidden="true"></i>
          <h3 id="picker-title">Start a Quote</h3>
        </div>
        <button class="close-btn" @click="$emit('close')" aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
      </header>

      <!-- ── New (blank) + Upload backup ── -->
      <div class="list">
        <button class="list-row list-row--new" @click="pickTemplate(blankTemplate)">
          <div class="row-ico row-ico--new">
            <i class="ti ti-plus" aria-hidden="true"></i>
          </div>
          <div class="row-info">
            <div class="row-name">New</div>
            <div class="row-desc">Start with a blank room</div>
          </div>
          <i class="ti ti-chevron-right row-chev" aria-hidden="true"></i>
        </button>
        <button class="list-row list-row--upload" @click="$emit('upload-backup')">
          <div class="row-ico row-ico--upload">
            <i class="ti ti-file-import" aria-hidden="true"></i>
          </div>
          <div class="row-info">
            <div class="row-name">Upload backup</div>
            <div class="row-desc">Load a saved .rom.json file</div>
          </div>
          <i class="ti ti-chevron-right row-chev" aria-hidden="true"></i>
        </button>
      </div>

      <!-- ── Baselines (collapsible) ── -->
      <button class="sec-head sec-head--toggle" @click="baselinesOpen = !baselinesOpen" type="button">
        <span>Baselines</span>
        <i class="ti row-chev" :class="baselinesOpen ? 'ti-chevron-up' : 'ti-chevron-down'" aria-hidden="true"></i>
      </button>
      <div v-if="baselinesOpen" class="list">
        <button
          v-for="tmpl in baselineTemplates"
          :key="tmpl.id"
          class="list-row"
          @click="pickTemplate(tmpl)"
        >
          <div class="row-ico" :data-tooltip="tmpl.name">
            <i class="ti" :class="iconFor(tmpl.id)" aria-hidden="true"></i>
          </div>
          <div class="row-info">
            <div class="row-name">{{ tmpl.name }}</div>
            <div class="row-desc">{{ tmpl.description }}</div>
          </div>
          <i class="ti ti-chevron-right row-chev" aria-hidden="true"></i>
        </button>
      </div>

      <!-- ── Saved rooms ── -->
      <div class="sec-head sec-head--saved">
        <span>Saved rooms</span>
        <button class="save-btn" @click="onSaveCurrent" :disabled="!canDismiss" :title="canDismiss ? 'Save this quote as a reusable room' : 'Load a quote first'">
          <i class="ti ti-plus" aria-hidden="true"></i> Save as room
        </button>
      </div>

      <div v-if="rom.snapshots.length === 0" class="empty-state">
        No saved rooms yet. Build a quote you want to reuse, then click <strong>Save as room</strong>.
      </div>
      <div v-else class="list list--saved">
        <div v-for="snap in rom.snapshots" :key="snap.id" class="list-row list-row--saved">
          <button class="saved-main" @click="pickSnapshot(snap)" type="button">
            <div class="row-ico row-ico--saved">
              <i class="ti ti-folder" aria-hidden="true"></i>
            </div>
            <div class="row-info">
              <div class="row-name">{{ snap.name }}</div>
              <div class="row-desc">{{ formatDate(snap.date) }}<template v-if="snapTotal(snap)"> · {{ snapTotal(snap) }}</template></div>
            </div>
            <i class="ti ti-chevron-right row-chev" aria-hidden="true"></i>
          </button>
          <button class="delete-btn" @click="confirmDeleteSnap(snap)" type="button" title="Delete">
            <i class="ti ti-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>

    </div>
  </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRomStore } from '../stores/rom'

const props = defineProps({
  canDismiss: { type: Boolean, default: true },
})
const emit = defineEmits(['close', 'upload-backup'])

const rom = useRomStore()
const baselinesOpen = ref(false)

const baselineTemplates = computed(() => rom.TEMPLATES.filter(t => t.id !== 'baseline-x'))
const blankTemplate     = computed(() => rom.TEMPLATES.find(t => t.id === 'baseline-x'))

function pickTemplate(tmpl) {
  rom.applyTemplate(tmpl.id)
  rom.selectedTabId = 'engineering'
  emit('close')
}

function pickSnapshot(snap) {
  rom.restoreSnapshot(snap.id)
  rom.selectedTabId = 'engineering'
  emit('close')
}

function onSaveCurrent() {
  const name = window.prompt('Name for this saved room:', rom.project.roomName || rom.project.sponsor || 'New room')
  if (!name) return
  rom.saveSnapshot(name.trim())
}

function confirmDeleteSnap(snap) {
  if (window.confirm(`Delete "${snap.name}"? This can't be undone.`)) {
    rom.deleteSnapshot(snap.id)
  }
}

function snapTotal(snap) {
  try {
    const lines = snap.state?.lineItems ?? []
    const total = lines.reduce((s, l) => s + (l.days || 0) * (l.hoursPerDay || 0) * (l.rate || 0), 0)
    return total ? '$' + Math.round(total).toLocaleString() + ' labor' : ''
  } catch { return '' }
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

function iconFor(id) {
  switch (id) {
    case 'baseline-a': return 'ti-square-letter-a'
    case 'baseline-b': return 'ti-square-letter-b'
    case 'baseline-c': return 'ti-square-letter-c'
    case 'baseline-d': return 'ti-square-letter-d'
    case 'baseline-x': return 'ti-pencil'
    default: return 'ti-folder'
  }
}
</script>

<style scoped>
/* ── Transition ── */
.picker-enter-active { transition: opacity .2s ease; }
.picker-leave-active { transition: opacity .15s ease; }
.picker-enter-from,
.picker-leave-to    { opacity: 0; }

.picker-enter-active .modal { transition: transform .22s cubic-bezier(.22,1,.36,1), opacity .2s ease; }
.picker-leave-active .modal { transition: transform .15s ease, opacity .15s ease; }
.picker-enter-from .modal   { transform: translateY(16px) scale(.97); opacity: 0; }
.picker-leave-to .modal     { transform: translateY(8px) scale(.98);  opacity: 0; }

.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(10, 18, 40, 0.5);
  display: flex; align-items: flex-start; justify-content: center;
  z-index: 1000; padding: 60px 20px 20px;
}
.modal {
  background: var(--rom-surface, #fff);
  border-radius: 14px;
  width: 100%; max-width: 520px;
  max-height: 88vh;
  box-shadow: 0 20px 60px rgba(0,0,0,.22);
  overflow-y: auto;
  display: flex; flex-direction: column;
}

/* ── Header ── */
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--rom-border, #c4cede);
  background: var(--rom-surface-alt, #f4f6fb);
  position: sticky; top: 0; z-index: 1;
}
.modal-head-left { display: flex; align-items: center; gap: 9px; }
.modal-head-icon { font-size: 18px; color: var(--rom-accent, #1a5fb4); }
.modal-head h3 { font-size: 15px; font-weight: 700; color: var(--rom-text, #1a2133); }
.close-btn {
  width: 28px; height: 28px; flex-shrink: 0;
  background: transparent; border: none; border-radius: 6px;
  font-size: 13px; cursor: pointer; color: var(--rom-text-muted, #4a5a78);
  display: inline-flex; align-items: center; justify-content: center;
}
.close-btn:hover { background: var(--rom-border, #c4cede); color: var(--rom-text, #1a2133); }

/* ── Section headers ── */
.sec-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 18px;
  background: var(--rom-surface-alt, #f4f6fb);
  border-bottom: 1px solid var(--rom-border, #c4cede);
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  color: var(--rom-text-muted, #4a5a78);
}
.sec-head--toggle {
  width: 100%; border: none; cursor: pointer; font-family: inherit;
  border-top: 1px solid var(--rom-border, #c4cede);
  transition: background .1s;
}
.sec-head--toggle:hover { background: var(--rom-accent-bg, #e8f0fe); color: var(--rom-accent, #1a5fb4); }
.sec-head--saved { border-top: 1px solid var(--rom-border, #c4cede); }

.row-ico--new,
.row-ico--upload {
  background: var(--rom-surface-alt, #f4f6fb);
  color: var(--rom-text-muted, #4a5a78);
}
.list-row--new:hover .row-ico--new,
.list-row--upload:hover .row-ico--upload { background: var(--rom-accent, #1a5fb4); color: #fff; }

/* ── Rows ── */
.list { display: flex; flex-direction: column; }

.list-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 18px;
  border: none; border-bottom: 1px solid var(--rom-border, #c4cede);
  background: var(--rom-surface, #fff);
  text-align: left; font-family: inherit; cursor: pointer; color: inherit;
  transition: background .1s;
  width: 100%;
}
.list-row:last-child { border-bottom: none; }
.list-row:hover { background: var(--rom-accent-bg, #e8f0fe); }
.list-row--blank { opacity: 0.75; }
.list-row--blank:hover { opacity: 1; }

.row-ico {
  width: 34px; height: 34px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  background: var(--rom-accent-bg, #e8f0fe);
  color: var(--rom-accent, #1a5fb4);
  font-size: 16px;
  transition: background .1s, color .1s;
  position: relative;
}
.row-ico[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: #1a2133;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  padding: 5px 9px;
  border-radius: 5px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity .15s, transform .15s;
  z-index: 9999;
}
.row-ico[data-tooltip]:hover::after {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.list-row:hover .row-ico { background: var(--rom-accent, #1a5fb4); color: #fff; }
.row-ico--saved { background: var(--rom-surface-alt, #f4f6fb); color: var(--rom-text-muted, #4a5a78); }
.list-row:hover .row-ico--saved { background: var(--rom-accent, #1a5fb4); color: #fff; }

.row-info { flex: 1; min-width: 0; }
.row-name { font-size: 13px; font-weight: 600; color: var(--rom-text, #1a2133); }
.row-desc { font-size: 11px; color: var(--rom-text-muted, #4a5a78); margin-top: 1px; }
.row-chev { font-size: 14px; color: var(--rom-text-faint, #a0aec0); flex-shrink: 0; }

/* ── Saved rows (button-inside-div layout) ── */
.list-row--saved { padding: 0; }
.saved-main {
  flex: 1; display: flex; align-items: center; gap: 12px;
  padding: 11px 18px;
  background: transparent; border: none;
  text-align: left; cursor: pointer; font-family: inherit; color: inherit;
  transition: background .1s;
  min-width: 0;
}
.saved-main:hover { background: var(--rom-accent-bg, #e8f0fe); }
.saved-main:hover .row-ico { background: var(--rom-accent, #1a5fb4); color: #fff; }

.delete-btn {
  flex-shrink: 0; width: 42px; align-self: stretch;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; border-left: 1px solid var(--rom-border, #c4cede);
  color: var(--rom-text-faint, #a0aec0); cursor: pointer; font-size: 13px;
  transition: background .1s, color .1s;
}
.delete-btn:hover { background: #fff0f0; color: var(--rom-danger, #c0392b); }

/* ── Empty state ── */
.empty-state {
  padding: 20px 18px;
  font-size: 12px; color: var(--rom-text-muted, #4a5a78);
  text-align: center;
  border-bottom: 1px solid var(--rom-border, #c4cede);
}

/* ── Save button ── */
.save-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 6px;
  border: 1px solid var(--rom-accent, #1a5fb4);
  background: var(--rom-accent, #1a5fb4); color: #fff;
  font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit;
  text-transform: none; letter-spacing: 0;
}
.save-btn:hover:not(:disabled) { background: var(--rom-accent-dark, #1248a0); }
.save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
