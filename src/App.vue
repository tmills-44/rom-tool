<template>
  <div class="app">

    <!-- ── Top bar ─────────────────────────────────────────────── -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="app-logo-chip">
          <img src="/logo.png" alt="Cronos" class="app-logo-img" />
        </div>
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
        <CoaSelector />
        <div class="quote-total">
          <span class="quote-total-label">QUOTE TOTAL</span>
          <span class="quote-total-value">{{ fmt(rom.totalLoadedCost) }}</span>
        </div>
        <button class="btn btn-icon" :disabled="!rom.canUndo" @click="rom.undo" title="Undo (last add/duplicate/remove/reorder)">
          <i class="ti ti-arrow-back-up" aria-hidden="true"></i>
        </button>
        <button class="btn btn-icon" :disabled="!rom.canRedo" @click="rom.redo" title="Redo">
          <i class="ti ti-arrow-forward-up" aria-hidden="true"></i>
        </button>
        <button class="btn btn-snapshot" @click="showPicker = true" title="Rooms (templates + saved quotes)">
          <i class="ti ti-layout-grid" aria-hidden="true"></i> Rooms
          <span v-if="rom.snapshots.length > 0" class="snap-count">{{ rom.snapshots.length }}</span>
        </button>
        <div class="save-split" v-click-outside="() => saveMenuOpen = false">
          <button class="btn btn-save btn-save--main" @click="downloadQuoteFile" title="Download this quote as a .rom.json file">
            <i class="ti ti-device-floppy" aria-hidden="true"></i> Save
          </button>
          <button class="btn btn-save btn-save--caret" @click="saveMenuOpen = !saveMenuOpen" title="Save / load options" :aria-expanded="saveMenuOpen">
            <i class="ti ti-chevron-down" aria-hidden="true"></i>
          </button>
          <div v-if="saveMenuOpen" class="save-menu">
            <button class="save-menu-item" @click="downloadQuoteFile(); saveMenuOpen = false">
              <i class="ti ti-download" aria-hidden="true"></i>
              <div>
                <div class="save-menu-title">Download backup</div>
                <div class="save-menu-sub">Save this quote to a .rom.json file on your computer</div>
              </div>
            </button>
            <button class="save-menu-item" @click="pickQuoteFile(); saveMenuOpen = false">
              <i class="ti ti-upload" aria-hidden="true"></i>
              <div>
                <div class="save-menu-title">Load from backup</div>
                <div class="save-menu-sub">Replace the current quote with one from a .rom.json file</div>
              </div>
            </button>
          </div>
          <input ref="loadFileInput" type="file" accept=".json,.rom.json,application/json"
            style="display:none" @change="onQuoteFilePicked" />
        </div>
        <div class="export-split" v-click-outside="() => exportMenuOpen = false">
          <button class="btn btn-export btn-export--main" @click="exportMenuOpen = !exportMenuOpen" title="Export quote">
            <i class="ti ti-download" aria-hidden="true"></i> Export
            <i class="ti ti-chevron-down" aria-hidden="true" style="font-size:13px;margin-left:2px;"></i>
          </button>
          <div v-if="exportMenuOpen" class="export-menu">
            <button class="export-menu-item" @click="exportExcel(); exportMenuOpen = false">
              <i class="ti ti-file-spreadsheet" aria-hidden="true"></i>
              <div>
                <div class="export-menu-title">Excel</div>
                <div class="export-menu-sub">Workbook with a Summary tab + one tab per scope</div>
              </div>
            </button>
            <button class="export-menu-item" @click="exportPDF('separate'); exportMenuOpen = false">
              <i class="ti ti-files" aria-hidden="true"></i>
              <div>
                <div class="export-menu-title">PDF — separate files</div>
                <div class="export-menu-sub">One PDF per included scope</div>
              </div>
            </button>
            <button class="export-menu-item" @click="exportPDF('combined'); exportMenuOpen = false">
              <i class="ti ti-file-type-pdf" aria-hidden="true"></i>
              <div>
                <div class="export-menu-title">PDF — combined document</div>
                <div class="export-menu-sub">All scopes in one PDF + rollup page</div>
              </div>
            </button>
            <button class="export-menu-item" @click="exportWord(); exportMenuOpen = false">
              <i class="ti ti-file-description" aria-hidden="true"></i>
              <div>
                <div class="export-menu-title">Word</div>
                <div class="export-menu-sub">Editable .doc you can open in Word</div>
              </div>
            </button>
          </div>
        </div>
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

    <!-- ── Project Info drawer ─────────────────────────────────────── -->
    <div class="proj-drawer" :class="{ 'proj-drawer--open': projInfoOpen }">
      <button class="proj-drawer-tab" type="button" @click="projInfoOpen = !projInfoOpen" :aria-expanded="projInfoOpen">
        <span class="proj-drawer-tab-label">Project Info</span>
        <i class="ti" :class="projInfoOpen ? 'ti-chevron-up' : 'ti-chevron-down'" aria-hidden="true"></i>
      </button>

      <div v-show="projInfoOpen" class="proj-drawer-body">
        <div class="proj-field">
          <label>Sponsor</label>
          <input
            type="text"
            :value="rom.project.sponsor"
            @input="rom.project.sponsor = $event.target.value"
          />
        </div>
        <div class="proj-field">
          <label>Room / Project Name</label>
          <input
            type="text"
            :value="rom.project.roomName"
            @input="rom.project.roomName = $event.target.value"
          />
        </div>
        <div class="proj-field">
          <label>Project Lead</label>
          <input
            type="text"
            :value="rom.project.projectEngineer"
            @input="rom.project.projectEngineer = $event.target.value"
          />
        </div>
        <div class="proj-field proj-field--date">
          <label>Date</label>
          <input
            type="date"
            :value="rom.project.date"
            @input="rom.project.date = $event.target.value"
          />
        </div>
      </div>
    </div>

    <!-- ── Validation banner ─────────────────────────────────────── -->
    <!-- Hidden for now. To re-enable, change v-if to "validationWarnings.length". -->
    <div v-if="false" class="val-banner">
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
      <AdminView       v-else-if="rom.selectedTabId === 'admin'" />
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
import { generateWord }  from './utils/wordExport'
import { loadAllRates }  from './utils/ratesLoader'
import TemplatePicker from './components/TemplatePicker.vue'
import CoaSelector from './components/CoaSelector.vue'
import EngineeringView from './views/EngineeringView.vue'
import TravelView from './views/TravelView.vue'
import MaterialView from './views/MaterialView.vue'
import OverheadView from './views/OverheadView.vue'
import SummaryView from './views/SummaryView.vue'
import AdminView from './views/AdminView.vue'

const rom = useRomStore()

const showPicker    = ref(false)
const showReset     = ref(false)
const ratesStatus   = reactive({ conus: '', oconus: '', errors: [] })
const ratesLoadedAt   = ref('')   // e.g. "May 15 · 2:34 PM"
const ratesChipDetail = ref('')   // tooltip detail

// Page load timestamp — stamped once on mount so the user can verify they're on a fresh build
const pageLoadedAt   = ref('')   // e.g. "2:34 PM"
const pageLoadedFull = ref('')   // e.g. "May 15, 2026 · 2:34:07 PM"

function fmtTime(d) {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
    + ' · ' + d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

onMounted(async () => {
  if (!rom.project.templateId) showPicker.value = true

  // Stamp the page-load time so the user can confirm a fresh refresh
  const now = new Date()
  pageLoadedAt.value   = now.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
  pageLoadedFull.value = now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })

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

// Project info drawer — closed by default, click the tab to expand
const projInfoOpen = ref(false)

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
const exportMenuOpen = ref(false)
const saveMenuOpen   = ref(false)
const loadFileInput  = ref(null)

async function exportPDF(mode = 'separate') {
  try {
    await generatePDF(rom, { mode })
  } catch (e) {
    alert('PDF export error: ' + e.message)
  }
}
async function exportWord() {
  try {
    await generateWord(rom)
  } catch (e) {
    alert('Word export error: ' + e.message)
  }
}

// ── Quote backup file: download + load ─────────────────────────────────
function downloadQuoteFile() {
  try {
    const payload = rom.exportStateForBackup()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    const sponsor = (rom.project.sponsor || 'quote').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40)
    const date    = (rom.project.date || new Date().toISOString().split('T')[0]).replace(/-/g, '')
    a.download = `ROM_${sponsor}_${date}.rom.json`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 0)
  } catch (e) {
    alert('Could not save quote file: ' + e.message)
  }
}
function pickQuoteFile() {
  loadFileInput.value?.click()
}
function onQuoteFilePicked(ev) {
  const file = ev.target.files?.[0]
  if (!file) return
  if (!window.confirm(`Loading "${file.name}" will replace the current quote. Continue?`)) {
    ev.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result)
      rom.importStateFromBackup(payload)
    } catch (e) {
      alert('Could not load quote file: ' + e.message)
    } finally {
      ev.target.value = ''
    }
  }
  reader.readAsText(file)
}

// Lightweight click-outside directive used by the PDF split-button menu
const vClickOutside = {
  mounted(el, binding) {
    el.__clickOutside = (ev) => { if (!el.contains(ev.target)) binding.value() }
    document.addEventListener('mousedown', el.__clickOutside)
  },
  unmounted(el) { document.removeEventListener('mousedown', el.__clickOutside) },
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
.rates-chip--load {
  background: rgba(125,211,252,.18);
  border-color: rgba(125,211,252,.4);
  color: #b6e2fc;
  font-weight: 600;
}

/* Light chip behind the logo so the blue C reads cleanly against navy.
   Gives it its own surface with a soft shadow for depth. */
.app-logo-chip {
  display: inline-flex; align-items: center; justify-content: center;
  background: #fff;
  padding: 3px 8px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25), 0 0 0 1px rgba(125,211,252,0.4);
}
.app-logo-img {
  height: 32px; width: auto;
  display: block;
}
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

/* Unified Export dropdown — Excel · PDF · Word */
.export-split { position: relative; display: inline-flex; }
.btn-export {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(255,255,255,.18);
  border-color: rgba(255,255,255,.35);
  color: #fff;
}
.btn-export:hover { background: rgba(255,255,255,.28); }
.export-menu {
  position: absolute; top: calc(100% + 4px); right: 0; z-index: 60;
  width: 300px;
  background: var(--rom-surface, #fff);
  color: var(--rom-text, #1a2133);
  border: 1px solid var(--rom-border, #c4cede);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  overflow: hidden;
}
.export-menu-item {
  display: flex; align-items: flex-start; gap: 10px;
  width: 100%; padding: 10px 14px;
  background: transparent; border: none; border-bottom: 1px solid var(--rom-border, #c4cede);
  font-family: inherit; text-align: left; cursor: pointer;
  color: inherit;
}
.export-menu-item:last-child { border-bottom: none; }
.export-menu-item:hover { background: var(--rom-accent-bg, #e8f0fe); }
.export-menu-item i { font-size: 18px; color: var(--rom-accent, #1a5fb4); margin-top: 2px; flex-shrink: 0; }
.export-menu-title { font-size: 13px; font-weight: 600; color: var(--rom-text, #1a2133); }
.export-menu-sub   { font-size: 11px; color: var(--rom-text-muted, #4a5a78); margin-top: 1px; }

/* Save split button */
.save-split { position: relative; display: inline-flex; align-items: stretch; }
.btn.btn-save        { background: rgba(125,211,252,.12); border-color: rgba(125,211,252,.4); }
.btn.btn-save:hover  { background: rgba(125,211,252,.22); }
.btn-save--main      { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.btn-save--caret     {
  padding: 6px 8px;
  border-top-left-radius: 0; border-bottom-left-radius: 0;
  border-left: 1px solid rgba(125,211,252,.5);
}
.btn-save--caret i   { font-size: 14px; }
.save-menu {
  position: absolute; top: calc(100% + 4px); right: 0; z-index: 60;
  width: 280px;
  background: var(--rom-surface, #fff);
  color: var(--rom-text, #1a2133);
  border: 1px solid var(--rom-border, #c4cede);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  overflow: hidden;
}
.save-menu-item {
  display: flex; align-items: flex-start; gap: 10px;
  width: 100%; padding: 10px 14px;
  background: transparent; border: none; border-bottom: 1px solid var(--rom-border, #c4cede);
  font-family: inherit; text-align: left; cursor: pointer;
  color: inherit;
}
.save-menu-item:last-child { border-bottom: none; }
.save-menu-item:hover { background: var(--rom-accent-bg, #e8f0fe); }
.save-menu-item i { font-size: 18px; color: var(--rom-accent, #1a5fb4); margin-top: 2px; flex-shrink: 0; }
.save-menu-title { font-size: 13px; font-weight: 600; color: var(--rom-text, #1a2133); }
.save-menu-sub   { font-size: 11px; color: var(--rom-text-muted, #4a5a78); margin-top: 1px; }
.btn.btn-icon       { padding: 6px 8px; }
.btn.btn-icon i     { font-size: 16px; }
.btn:disabled       { opacity: .35; cursor: not-allowed; background: rgba(255,255,255,.05); }
.btn:disabled:hover { background: rgba(255,255,255,.05); }
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

/* ─── Project Info drawer ────────────────────────────────────────── */
.proj-drawer {
  background: var(--rom-surface, #fff);
  border-bottom: 1px solid var(--rom-border, #c4cede);
}
.proj-drawer-tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 14px;
  margin: 0 18px;
  background: var(--rom-surface, #fff);
  border: 1px solid var(--rom-border, #c4cede);
  border-top: none;
  border-radius: 0 0 6px 6px;
  font-family: inherit;
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--rom-text-muted, #4a5a78);
  cursor: pointer;
  transition: color .12s, background .12s;
}
.proj-drawer-tab:hover { color: var(--rom-accent, #1a5fb4); background: var(--rom-accent-bg, #e8f0fe); }
.proj-drawer--open .proj-drawer-tab {
  color: var(--rom-accent-dark, #1248a0);
  background: var(--rom-accent-bg, #e8f0fe);
  border-color: var(--rom-accent, #1a5fb4);
}
.proj-drawer-tab .ti { font-size: 14px; }

.proj-drawer-body {
  display: grid;
  grid-template-columns: 1.6fr 1.4fr 1fr 150px;
  gap: 16px;
  padding: 12px 18px 14px;
  background: var(--rom-surface, #fff);
  border-top: 1px solid var(--rom-border, #c4cede);
}
.proj-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.proj-field label {
  font-size: 10px; font-weight: 600;
  color: var(--rom-text-muted, #4a5a78);
  text-transform: uppercase; letter-spacing: .05em;
}
.proj-field input {
  height: 32px; font-size: 13px; padding: 0 10px;
  border: 1px solid var(--rom-border, #c4cede); border-radius: 6px;
  background: var(--rom-surface, #fff); color: var(--rom-text, #1a2133);
  font-family: inherit; min-width: 0;
}
.proj-field input:focus {
  outline: 2px solid var(--rom-accent, #1a5fb4); outline-offset: -1px;
  border-color: var(--rom-accent, #1a5fb4);
}
@media (max-width: 760px) {
  .proj-drawer-body { grid-template-columns: 1fr 1fr; }
}

.val-banner {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 3px 18px;
  background: #fff8e1;
  border-bottom: 1px solid #f59e0b;
  font-size: 10px; color: #92400e;
  line-height: 1.3;
  flex-shrink: 0;
}
.val-banner .ti-alert-triangle { font-size: 11px; color: #d97706; flex-shrink: 0; }
.val-item::after { content: '·'; margin-left: 8px; color: #d97706; }
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
