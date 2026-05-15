<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-labelledby="picker-title">
      <header class="modal-head">
        <div>
          <h3 id="picker-title">Rooms</h3>
          <p class="modal-sub">Pick a starting room — the 4 baselines are always available, plus anything you've saved. Click a card to load it.</p>
        </div>
        <button class="close-btn" @click="$emit('close')" aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
      </header>

      <div class="modal-body">

        <!-- ── Baseline rooms (templates) ─────────────────────────────── -->
        <div class="section-head">
          <span><i class="ti ti-layout-grid" aria-hidden="true"></i> Baseline rooms</span>
          <span class="section-hint">Pre-built starting points</span>
        </div>
        <div class="card-grid">
          <button
            v-for="tmpl in rom.TEMPLATES"
            :key="tmpl.id"
            class="room-card room-card--baseline"
            @click="pickTemplate(tmpl)"
          >
            <i class="ti room-icon" :class="iconFor(tmpl.id)" aria-hidden="true"></i>
            <div class="room-name">{{ tmpl.name }}</div>
            <div class="room-desc">{{ tmpl.description }}</div>
            <div class="room-tag room-tag--baseline">Baseline</div>
          </button>
        </div>

        <!-- ── Saved rooms (user snapshots) ───────────────────────────── -->
        <div class="section-head">
          <span><i class="ti ti-bookmark" aria-hidden="true"></i> Saved rooms</span>
          <button class="save-current-btn" @click="onSaveCurrent" :disabled="!canDismiss" :title="canDismiss ? 'Save the current quote as a new room' : 'Load or start a quote first'">
            <i class="ti ti-plus" aria-hidden="true"></i> Save current as room
          </button>
        </div>

        <div v-if="rom.snapshots.length === 0" class="empty-state">
          No saved rooms yet. Hit <strong>Save current as room</strong> after you've shaped a quote you want to keep.
        </div>
        <div v-else class="card-grid">
          <div
            v-for="snap in rom.snapshots"
            :key="snap.id"
            class="room-card room-card--saved"
          >
            <button class="room-card-main" @click="pickSnapshot(snap)" type="button">
              <i class="ti room-icon" aria-hidden="true">📁</i>
              <div class="room-name">{{ snap.name }}</div>
              <div class="room-desc">
                Saved {{ formatDate(snap.date) }}
                <span v-if="snapTotal(snap)" class="room-total"> · {{ snapTotal(snap) }}</span>
              </div>
            </button>
            <button class="room-delete" @click="confirmDeleteSnap(snap)" type="button" title="Delete this saved room">
              <i class="ti ti-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>

      </div>

      <footer class="modal-foot">
        <span class="footer-hint">
          Loading a room replaces the active scope's lines, travel, material, and overhead.
        </span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { useRomStore } from '../stores/rom'

const props = defineProps({
  canDismiss: { type: Boolean, default: true },
})
const emit = defineEmits(['close'])

const rom = useRomStore()

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
  // Best-effort: read the saved coas + lineItems and compute a rough loaded total.
  // Newer snapshots store overheadByCoa; older ones store overhead. We just sum line costs as a proxy.
  try {
    const lines = snap.state?.lineItems ?? []
    const total = lines.reduce((s, l) => s + (l.days || 0) * (l.hoursPerDay || 0) * (l.rate || 0), 0)
    if (!total) return ''
    return '$' + Math.round(total).toLocaleString() + ' labor'
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
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(20, 20, 20, 0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal {
  background: var(--rom-surface, #fff);
  border-radius: 12px;
  width: 100%;
  max-width: 760px;
  max-height: 88vh;
  box-shadow: 0 12px 48px rgba(0,0,0,0.18);
  overflow: hidden;
  display: flex; flex-direction: column;
}
.modal-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--rom-border, #c4cede);
}
.modal-head h3 { font-size: 18px; font-weight: 700; color: var(--rom-text, #1a2133); margin: 0; }
.modal-sub { font-size: 13px; color: var(--rom-text-muted, #4a5a78); margin: 4px 0 0; }
.close-btn {
  width: 30px; height: 30px;
  background: transparent; border: none; border-radius: 4px;
  font-size: 14px; cursor: pointer; color: var(--rom-text-muted, #4a5a78);
  display: inline-flex; align-items: center; justify-content: center;
}
.close-btn:hover { background: var(--rom-surface-alt, #eaf0fb); color: var(--rom-text, #1a2133); }

.modal-body {
  flex: 1; overflow-y: auto;
  padding: 16px 22px;
}

.section-head {
  display: flex; align-items: center; justify-content: space-between;
  margin: 6px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--rom-border, #c4cede);
  font-size: 12px; font-weight: 700;
  color: var(--rom-text-muted, #4a5a78);
  text-transform: uppercase; letter-spacing: .06em;
}
.section-head .ti { margin-right: 4px; }
.section-hint { font-weight: 500; text-transform: none; letter-spacing: 0; font-size: 11px; opacity: .7; }

.section-head + .section-head { margin-top: 24px; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  margin-bottom: 8px;
}

.room-card {
  position: relative;
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 12px 14px;
  background: var(--rom-surface, #fff);
  border: 1px solid var(--rom-border, #c4cede);
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color .12s, box-shadow .12s;
  min-height: 110px;
}
.room-card:hover { border-color: var(--rom-accent, #1a5fb4); box-shadow: 0 2px 8px rgba(26,95,180,0.12); }
.room-card--baseline { background: linear-gradient(to bottom, #f5f8fd, #fff); }

.room-icon { font-size: 22px; color: var(--rom-accent, #1a5fb4); margin-bottom: 4px; }
.room-name { font-size: 13px; font-weight: 700; color: var(--rom-text, #1a2133); margin-bottom: 4px; }
.room-desc { font-size: 11px; color: var(--rom-text-muted, #4a5a78); flex: 1; }
.room-total { font-weight: 600; color: var(--rom-accent-dark, #1248a0); }
.room-tag {
  position: absolute; top: 8px; right: 8px;
  font-size: 9px; font-weight: 700;
  padding: 1px 6px; border-radius: 3px;
  letter-spacing: .04em;
}
.room-tag--baseline { background: var(--rom-accent-bg, #e8f0fe); color: var(--rom-accent-dark, #1248a0); }

/* Saved-room card has the click-to-load inside a button + a delete icon outside */
.room-card--saved { padding: 0; }
.room-card-main {
  width: 100%;
  padding: 12px 14px;
  background: transparent; border: none;
  text-align: left; cursor: pointer; font-family: inherit;
  display: flex; flex-direction: column; align-items: flex-start;
  min-height: 110px;
  color: inherit;
}
.room-delete {
  position: absolute; top: 6px; right: 6px;
  width: 24px; height: 24px;
  background: transparent; border: none; border-radius: 4px;
  color: var(--rom-text-faint, #8a9ab8); cursor: pointer; font-size: 12px;
  display: inline-flex; align-items: center; justify-content: center;
}
.room-delete:hover { background: #fff0f0; color: var(--rom-danger, #c0392b); }

.save-current-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px;
  border: 1px solid var(--rom-accent, #1a5fb4); border-radius: 4px;
  background: var(--rom-accent, #1a5fb4); color: #fff;
  font-size: 11px; font-weight: 600; cursor: pointer;
  text-transform: none; letter-spacing: 0;
  font-family: inherit;
}
.save-current-btn:hover:not(:disabled) { background: var(--rom-accent-dark, #1248a0); }
.save-current-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.empty-state {
  padding: 18px 16px;
  background: var(--rom-surface-alt, #f4f6fb);
  border: 1px dashed var(--rom-border, #c4cede); border-radius: 6px;
  font-size: 13px; color: var(--rom-text-muted, #4a5a78);
  text-align: center;
}

.modal-foot {
  padding: 12px 22px;
  border-top: 1px solid var(--rom-border, #c4cede);
  background: var(--rom-surface-alt, #f4f6fb);
}
.footer-hint { font-size: 11px; color: var(--rom-text-muted, #4a5a78); font-style: italic; }
</style>
