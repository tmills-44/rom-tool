<template>
  <div class="app">

    <!-- ── Top bar ─────────────────────────────────────────────── -->
    <header class="topbar">
      <div class="topbar-left">
        <i class="ti ti-anchor app-logo" aria-hidden="true"></i>
        <div class="app-title">
          <div class="app-name">ROM Tool</div>
          <div class="app-sub">Rough Order of Magnitude Estimator</div>
        </div>
        <div v-if="rom.project.sponsor || rom.project.roomName" class="quote-id">
          <span v-if="rom.project.sponsor">{{ rom.project.sponsor }}</span>
          <span v-if="rom.project.sponsor && rom.project.roomName"> · </span>
          <span v-if="rom.project.roomName">{{ rom.project.roomName }}</span>
          <span v-if="rom.project.templateName" class="template-badge">{{ rom.project.templateName }}</span>
        </div>
      </div>

      <div class="topbar-right">
        <div class="rates-chip" :title="ratesChipDetail">
          <i class="ti ti-database"></i>
          Rates: {{ ratesLoadedAt }}
        </div>
        <div class="quote-total">
          <span class="quote-total-label">QUOTE TOTAL</span>
          <span class="quote-total-value">{{ fmt(rom.totalLoadedCost) }}</span>
        </div>
        <button class="btn btn-snapshot" @click="showSnapshots = true" title="Snapshots">
          <i class="ti ti-camera" aria-hidden="true"></i> Snapshots
          <span v-if="rom.snapshots.length > 0" class="snap-count">{{ rom.snapshots.length }}</span>
        </button>
        <button class="btn" @click="exportExcel" title="Export to Excel">
          <i class="ti ti-file-spreadsheet" aria-hidden="true"></i> Excel
        </button>
        <button class="btn btn-pdf" @click="exportPDF" title="Export to PDF">
          <i class="ti ti-file-type-pdf" aria-hidden="true"></i> PDF
        </button>
        <button class="btn" @click="exportPpt" title="Export to PowerPoint">
          <i class="ti ti-presentation" aria-hidden="true"></i> PPT
        </button>
        <button class="btn btn-secondary" @click="showPicker = true" title="New quote">
          <i class="ti ti-file-plus" aria-hidden="true"></i> New
        </button>
        <button class="btn btn-danger" @click="confirmReset" title="Reset all data">
          <i class="ti ti-trash" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <!-- ── Tab bar ─────────────────────────────────────────────── -->
    <nav class="tabbar" role="tablist" aria-label="Sections">
      <button
        v-for="tab in rom.TABS"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: rom.selectedTabId === tab.id }"
        role="tab"
        :aria-selected="rom.selectedTabId === tab.id"
        @click="rom.selectedTabId = tab.id"
      >
        <i class="ti" :class="tab.icon" aria-hidden="true"></i>
        {{ tab.label }}
        <span v-if="tab.id === 'engineering' && rom.engineeringTotal > 0" class="tab-badge">
          {{ fmtCompact(rom.engineeringTotal) }}
        </span>
        <span v-if="tab.id === 'travel' && rom.travelTotal > 0" class="tab-badge">
          {{ fmtCompact(rom.travelTotal) }}
        </span>
        <span v-if="tab.id === 'material' && rom.materialTotal > 0" class="tab-badge">
          {{ fmtCompact(rom.materialTotal) }}
        </span>
      </button>
    </nav>

    <!-- ── Validation banner ─────────────────────────────────────── -->
    <div v-if="validationWarnings.length" class="val-banner">
      <i class="ti ti-alert-triangle" aria-hidden="true"></i>
      <span v-for="(w, i) in validationWarnings" :key="i" class="val-item">{{ w }}</span>
    </div>

    <!-- ── Main content (full width, no sidebar) ───────────────── -->
    <main class="main" role="tabpanel">
      <EngineeringView v-if="rom.selectedTabId === 'engineering'" />
      <TravelView      v-else-if="rom.selectedTabId === 'travel'" />
      <MaterialView    v-else-if="rom.selectedTabId === 'material'" />
      <OverheadView    v-else-if="rom.selectedTabId === 'overhead'" />
      <SummaryView     v-else-if="rom.selectedTabId === 'summary'" />
    </main>

    <!-- ── Status bar ──────────────────────────────────────────── -->
    <footer class="statusbar">
      <span class="stat">Engineering <strong>{{ fmtCompact(rom.engineeringTotal) }}</strong></span>
      <span class="stat">Travel <strong>{{ fmtCompact(rom.travelTotal) }}</strong></span>
      <span class="stat">Material <strong>{{ fmtCompact(rom.materialTotal) }}</strong></span>
      <span class="stat">Overhead <strong>{{ fmtCompact(rom.totalOverhead) }}</strong></span>
      <span class="stat stat-loaded">Loaded total <strong>{{ fmt(rom.totalLoadedCost) }}</strong></span>
      <span class="stat stat-saved"><i class="ti ti-device-floppy" aria-hidden="true"></i> Auto-saved</span>
    </footer>

    <!-- ── Template picker modal ───────────────────────────────── -->
    <TemplatePicker
      v-if="showPicker"
      :can-dismiss="!!rom.project.templateId"
      @close="showPicker = false"
    />

    <!-- ── Snapshot modal ────────────────────────────────────────── -->
    <SnapshotModal
      v-if="showSnapshots"
      @close="showSnapshots = false"
    />

    <!-- ── Reset confirm modal ─────────────────────────────────── -->
    <div v-if="showReset" class="modal-backdrop" @click.self="showReset = false">
      <div class="confirm-modal">
        <h3>Reset everything?</h3>
        <p>Clears all engineering, travel, material, and overhead entries. Cannot be undone.</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="showReset = false">Cancel</button>
          <button class="btn btn-danger" @click="doReset">Reset</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRomStore } from './stores/rom'
import { generatePDF }   from './utils/pdfExport'
import { generateExcel } from './utils/excelExport'
import { loadAllRates }  from './utils/ratesLoader'
import TemplatePicker from './components/TemplatePicker.vue'
import SnapshotModal from './components/SnapshotModal.vue'
import EngineeringView from './views/EngineeringView.vue'
import TravelView from './views/TravelView.vue'
import MaterialView from './views/MaterialView.vue'
import OverheadView from './views/OverheadView.vue'
import SummaryView from './views/SummaryView.vue'

const rom = useRomStore()

const showPicker    = ref(false)
const showReset     = ref(false)
const showSnapshots = ref(false)
const ratesStatus   = reactive({ conus: '', oconus: '', errors: [] })
const ratesLoadedAt   = ref('')   // e.g. "May 15 · 2:34 PM"
const ratesChipDetail = ref('')   // tooltip detail

function fmtTime(d) {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
    + ' · ' + d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

onMounted(async () => {
  if (!rom.project.templateId) showPicker.value = true

  // Always stamp the load time immediately
  ratesLoadedAt.value   = fmtTime(new Date())
  ratesChipDetail.value = 'Rates loading…'

  // Load rate files from public/rates/ — silently skips if files not yet uploaded
  try {
    const { conus, oconus, errors } = await loadAllRates()
    ratesStatus.errors = errors

    if (conus && Object.keys(conus).length) {
      rom.loadCONUSRates(conus)
      ratesStatus.conus = `${Object.keys(conus).length} CONUS cities`
    }
    if (oconus && oconus.countries.length) {
      rom.loadOCONUSRates(oconus)
      ratesStatus.oconus = `${oconus.countries.length} countries / ${Object.keys(oconus.map).length} OCONUS locations`
    }
    const detail = [ratesStatus.conus, ratesStatus.oconus].filter(Boolean).join(' · ')
    ratesChipDetail.value = detail || 'No rate files found'
  } catch {
    // Files not present yet — normal on first run
  }
})

const validationWarnings = computed(() => {
  const w = []
  if (!rom.project.templateId)                  w.push('No template selected — choose one via New.')
  if (rom.lineItems.length === 0)                w.push('No engineering labor entered.')
  if (rom.engineeringTotal === 0 && rom.lineItems.length > 0) w.push('Engineering lines exist but total is $0 — check rates and hours.')
  if (rom.totalLoadedCost === 0)                 w.push('Grand total is $0.')
  if (rom.overhead.scrPct === 0)                 w.push('Support Cost Rate is 0%.')
  if (!rom.project.sponsor)                      w.push('Customer / Sponsor is blank.')
  return w
})

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString() }
function fmtCompact(n) {
  if (!n) return '$0'
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'k'
  return '$' + Math.round(n)
}

async function exportExcel() {
  try {
    await generateExcel(rom)
  } catch (e) {
    alert('Excel export error: ' + e.message)
  }
}
async function exportPpt() {
  alert('PowerPoint export — coming soon.')
}
async function exportPDF() {
  try {
    await generatePDF(rom)
  } catch (e) {
    alert('PDF export error: ' + e.message)
  }
}
function confirmReset() { showReset.value = true }
function doReset() {
  rom.resetAll()
  showReset.value  = false
  showPicker.value = true
}
</script>

<style>
/* ═══ Design tokens ════════════════════════════════════════════════ */
:root {
  --rom-bg:           #f0f4fb;
  --rom-surface:      #ffffff;
  --rom-surface-alt:  #eaf0fb;
  --rom-border:       #c4cede;
  --rom-readonly:     #eaeff8;
  --rom-text:         #1a2133;
  --rom-text-muted:   #4a5a78;
  --rom-text-faint:   #8a9ab8;

  --rom-accent:       #1a5fb4;
  --rom-accent-bg:    #e8f0fe;
  --rom-accent-dark:  #1248a0;
  --rom-info:         #185fa5;
  --rom-info-bg:      #e6f1fb;
  --rom-warn:         #854f0b;
  --rom-warn-bg:      #faeeda;
  --rom-danger:       #c0392b;

  --rom-cronos-bg:    #e8f0fe;
  --rom-cronos-border:#1a5fb4;
  --rom-cronos-text:  #1248a0;
  --rom-gov-bg:       #e6f1fb;
  --rom-gov-border:   #185fa5;
  --rom-gov-text:     #0c447c;
  --rom-sub-bg:       #faeeda;
  --rom-sub-border:   #ba7517;
  --rom-sub-text:     #633806;

  --rom-header-bg:    #1a3560;
  --rom-header-text:  #ffffff;

  --rom-radius:       8px;
  --rom-radius-lg:    12px;
}

/* Dark mode intentionally omitted — light theme only to match suite */

/* ═══ Reset ════════════════════════════════════════════════════════ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app { height: 100%; }
body {
  background: var(--rom-bg);
  color: var(--rom-text);
  font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* ═══ App shell — 4-row grid ════════════════════════════════════════
   topbar | tabbar | main (scrollable) | statusbar
══════════════════════════════════════════════════════════════════════ */
.app {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  height: 100vh;
  overflow: hidden;
}

/* ─── Topbar ─────────────────────────────────────────────────────── */
.topbar {
  background: var(--rom-header-bg);
  color: var(--rom-header-text);
  padding: 9px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  z-index: 10;
}
.topbar-left  { display: flex; align-items: center; gap: 12px; min-width: 0; }
.topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.rates-chip {
  display: flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 12px;
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25);
  font-size: 11px; color: rgba(255,255,255,.85); white-space: nowrap;
  cursor: default;
}
.rates-chip .ti { font-size: 12px; }

.app-logo { font-size: 22px; }
.app-title { display: flex; flex-direction: column; line-height: 1.2; }
.app-name  { font-size: 14px; font-weight: 500; }
.app-sub   { font-size: 10px; color: rgba(255,255,255,.65); letter-spacing: .3px; }

.quote-id {
  display: flex; align-items: center; gap: 6px;
  margin-left: 12px; padding-left: 12px;
  border-left: 1px solid rgba(255,255,255,.2);
  font-size: 12px; color: rgba(255,255,255,.8);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.template-badge {
  font-size: 10px; padding: 1px 6px;
  background: rgba(255,255,255,.15); border-radius: 4px;
  color: rgba(255,255,255,.75);
}

.quote-total { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.2; margin-right: 4px; }
.quote-total-label { font-size: 9px; color: rgba(255,255,255,.6); letter-spacing: .08em; text-transform: uppercase; }
.quote-total-value { font-size: 16px; font-weight: 600; color: #7dd3fc; }

/* ─── Buttons (shared) ───────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; font-size: 12px; font-weight: 500;
  border-radius: var(--rom-radius); border: 1px solid rgba(255,255,255,.25);
  background: rgba(255,255,255,.1); color: #fff; cursor: pointer;
  transition: background .15s;
}
.btn:hover          { background: rgba(255,255,255,.2); }
.btn.btn-secondary  { background: rgba(255,255,255,.06); }
.btn.btn-danger     { background: rgba(163,45,45,.5); border-color: #a32d2d; }
.btn.btn-danger:hover { background: rgba(163,45,45,.75); }
.btn.btn-snapshot   { background: rgba(255,255,255,.12); border-color: rgba(125,211,252,.4); }
.btn.btn-snapshot:hover { background: rgba(125,211,252,.15); }
.btn.btn-pdf        { background: rgba(180,30,30,.35); border-color: rgba(220,80,80,.5); }
.btn.btn-pdf:hover  { background: rgba(180,30,30,.55); }
.snap-count {
  font-size: 10px; padding: 1px 6px;
  background: #7dd3fc; color: #1a3560;
  border-radius: 8px; font-weight: 700; margin-left: 2px;
}

/* ─── Tab bar ────────────────────────────────────────────────────── */
.tabbar {
  display: flex;
  background: var(--rom-header-bg);
  border-bottom: 3px solid var(--rom-accent);
  padding: 0 12px;
  gap: 2px;
  flex-shrink: 0;
}
.tab-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px 8px; font-size: 13px; font-weight: 500;
  border: none; border-bottom: 3px solid transparent;
  margin-bottom: -3px;
  background: transparent; color: rgba(255,255,255,.65); cursor: pointer;
  transition: color .15s, background .15s;
  white-space: nowrap; border-radius: 4px 4px 0 0;
}
.tab-btn .ti { font-size: 14px; }
.tab-btn:hover           { color: #fff; background: rgba(255,255,255,.08); }
.tab-btn.active          { color: var(--rom-accent); background: var(--rom-surface); border-bottom-color: var(--rom-accent); font-weight: 700; }
.tab-badge {
  font-size: 10px; padding: 1px 7px;
  background: #2e7d32; color: #fff;
  border-radius: 10px; font-weight: 600;
}

/* ─── Validation banner ──────────────────────────────────────────── */
.val-banner {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 7px 18px;
  background: #fff8e1;
  border-bottom: 1px solid #f59e0b;
  font-size: 12px; color: #92400e;
  flex-shrink: 0;
}
.val-banner .ti-alert-triangle { font-size: 14px; color: #d97706; flex-shrink: 0; }
.val-item::after { content: '·'; margin-left: 10px; color: #d97706; }
.val-item:last-child::after { content: ''; }

/* ─── Main content ───────────────────────────────────────────────── */
.main {
  overflow-y: auto;
  background: var(--rom-bg);
}

/* ─── Status bar ─────────────────────────────────────────────────── */
.statusbar {
  display: flex; align-items: center; gap: 20px;
  background: var(--rom-header-bg);
  padding: 0 18px; height: 28px;
  font-size: 11px; color: #cce0ff;
  flex-shrink: 0; flex-wrap: wrap;
}
.stat { }
.stat:last-child { margin-left: auto; }
.stat strong { color: #fff; }
.stat-loaded { font-size: 12px; font-weight: 500; }
.stat-loaded strong { color: #7dd3fc; font-size: 13px; }
.stat-saved { opacity: .5; font-size: 10px; }

/* ─── Modal backdrop ─────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
}
.confirm-modal {
  background: var(--rom-surface);
  border-radius: var(--rom-radius-lg);
  padding: 28px 32px;
  width: 360px;
  box-shadow: 0 8px 32px rgba(0,0,0,.2);
}
.confirm-modal h3 { font-size: 16px; margin-bottom: 10px; }
.confirm-modal p  { font-size: 13px; color: var(--rom-text-muted); margin-bottom: 20px; line-height: 1.5; }
.confirm-actions  { display: flex; gap: 10px; justify-content: flex-end; }
.confirm-actions .btn { border: 1px solid var(--rom-border); background: var(--rom-surface); color: var(--rom-text); }
.confirm-actions .btn.btn-danger { background: var(--rom-danger); border-color: var(--rom-danger); color: #fff; }

/* ─── Shared form elements (used across views) ───────────────────── */
select, input[type="number"], input[type="text"] {
  background: var(--rom-surface);
  color: var(--rom-text);
  border: 1px solid var(--rom-border);
  border-radius: 5px;
  padding: 3px 6px;
  font-size: 12px;
  font-family: inherit;
}
select:focus, input:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: transparent; }
input[readonly] { background: var(--rom-readonly); color: var(--rom-text-muted); cursor: default; }
</style>
