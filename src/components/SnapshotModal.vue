<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="snap-modal">

      <div class="snap-header">
        <h3><i class="ti ti-camera" aria-hidden="true"></i> Snapshots</h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Save new snapshot -->
      <div class="snap-save">
        <input
          v-model="snapName"
          type="text"
          placeholder="Snapshot name (e.g. NAVAIR Conf Room v1)"
          class="snap-name-input"
          @keydown.enter="save"
          maxlength="80"
        />
        <button class="btn-save" :disabled="!snapName.trim()" @click="save">
          <i class="ti ti-camera" aria-hidden="true"></i> Save snapshot
        </button>
      </div>

      <!-- Snapshot list -->
      <div class="snap-list" v-if="rom.snapshots.length > 0">
        <div
          v-for="snap in rom.snapshots"
          :key="snap.id"
          class="snap-row"
        >
          <div class="snap-info">
            <div class="snap-name">{{ snap.name }}</div>
            <div class="snap-meta">
              {{ fmtDate(snap.date) }}
              &nbsp;·&nbsp;
              {{ snap.state.lineItems.length }} line{{ snap.state.lineItems.length === 1 ? '' : 's' }}
              &nbsp;·&nbsp;
              {{ fmt(totalFor(snap)) }}
            </div>
          </div>
          <div class="snap-actions">
            <button class="btn-restore" @click="restore(snap.id)" title="Restore this snapshot">
              <i class="ti ti-restore" aria-hidden="true"></i> Restore
            </button>
            <button class="btn-del" @click="remove(snap.id)" title="Delete snapshot">
              <i class="ti ti-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="snap-empty">
        No snapshots yet. Build out your estimate, then save a snapshot to preserve it.
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRomStore } from '../stores/rom'

defineEmits(['close'])

const rom      = ref(useRomStore())
const snapName = ref('')

function save() {
  if (!snapName.value.trim()) return
  rom.value.saveSnapshot(snapName.value.trim())
  snapName.value = ''
}

function restore(id) {
  if (confirm('Restore this snapshot? Current data will be replaced.')) {
    rom.value.restoreSnapshot(id)
    // re-read store after restore
  }
}

function remove(id) {
  if (confirm('Delete this snapshot?')) rom.value.deleteSnapshot(id)
}

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString() }

function fmtDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function totalFor(snap) {
  return snap.state.lineItems.reduce((sum, l) => sum + (l.days || 0) * (l.hoursPerDay || 0) * (l.rate || 0), 0)
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
}

.snap-modal {
  background: var(--rom-surface);
  border-radius: var(--rom-radius-lg);
  width: 560px;
  max-height: 80vh;
  display: flex; flex-direction: column;
  box-shadow: 0 8px 40px rgba(0,0,0,.25);
  overflow: hidden;
}

.snap-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  background: var(--rom-header-bg);
  color: #fff;
  flex-shrink: 0;
}
.snap-header h3 {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 600;
}
.close-btn {
  background: transparent; border: none;
  color: rgba(255,255,255,.7); cursor: pointer; font-size: 16px;
  display: flex; align-items: center;
}
.close-btn:hover { color: #fff; }

/* Save row */
.snap-save {
  display: flex; gap: 8px; align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--rom-border);
  flex-shrink: 0;
}
.snap-name-input {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid var(--rom-border);
  border-radius: var(--rom-radius);
  font-size: 13px;
  color: var(--rom-text);
  background: var(--rom-surface);
}
.snap-name-input:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: transparent; }
.btn-save {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; font-size: 12px; font-weight: 600;
  background: var(--rom-accent); color: #fff;
  border: none; border-radius: var(--rom-radius); cursor: pointer;
  white-space: nowrap;
}
.btn-save:disabled { opacity: .4; cursor: default; }
.btn-save:not(:disabled):hover { background: var(--rom-accent-dark); }

/* List */
.snap-list {
  overflow-y: auto;
  flex: 1;
}
.snap-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--rom-border);
  gap: 12px;
}
.snap-row:last-child { border-bottom: none; }
.snap-row:hover { background: var(--rom-surface-alt); }

.snap-info { flex: 1; min-width: 0; }
.snap-name { font-size: 13px; font-weight: 600; color: var(--rom-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.snap-meta { font-size: 11px; color: var(--rom-text-muted); margin-top: 2px; }

.snap-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.btn-restore {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; font-size: 12px;
  border: 1px solid var(--rom-accent); border-radius: var(--rom-radius);
  background: var(--rom-accent-bg); color: var(--rom-accent); cursor: pointer;
}
.btn-restore:hover { background: var(--rom-accent); color: #fff; }
.btn-del {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border: 1px solid var(--rom-border); border-radius: var(--rom-radius);
  background: transparent; color: var(--rom-text-faint); cursor: pointer; font-size: 13px;
}
.btn-del:hover { background: #fff0f0; color: var(--rom-danger); border-color: var(--rom-danger); }

/* Empty state */
.snap-empty {
  padding: 32px 20px;
  text-align: center;
  font-size: 13px; color: var(--rom-text-muted); font-style: italic;
  line-height: 1.6;
}
</style>
