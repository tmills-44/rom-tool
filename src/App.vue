<template>
  <div class="app" :class="{ 'app--sidebar-collapsed': sidebarCollapsed }">

    <!-- ── Left sidebar (brand + tabs + quote total) ──────────────── -->
    <aside class="sidebar" role="navigation" aria-label="Sections">
      <div class="sidebar-brand">
        <div class="app-logo-chip">
          <img src="/logo.png" alt="Cronos" class="app-logo-img" />
        </div>
        <div class="sidebar-brand-text">
          <div>Cost Estimate Tool</div>
          <div class="sidebar-build-tag">Test Build #1</div>
        </div>
      </div>

      <nav class="sidebar-nav" role="tablist">
        <button
          v-for="tab in rom.TABS"
          :key="tab.id"
          class="sidebar-tab"
          :class="{ active: rom.selectedTabId === tab.id }"
          role="tab"
          :aria-selected="rom.selectedTabId === tab.id"
          :title="tab.label"
          @click="rom.selectedTabId = tab.id"
        >
          <i class="ti sidebar-tab-icon" :class="tab.icon" aria-hidden="true"></i>
          <span class="sidebar-tab-label">{{ tab.label }}</span>
          <span v-if="tab.id === 'engineering' && tabStatus('engineering') !== 'empty'"
            class="sidebar-tab-badge"
            :class="`sidebar-tab-badge--${tabStatus('engineering')}`">
            {{ fmtCompact(rom.engineeringTotal) }}
          </span>
          <span v-if="tab.id === 'travel' && tabStatus('travel') !== 'empty'"
            class="sidebar-tab-badge"
            :class="`sidebar-tab-badge--${tabStatus('travel')}`">
            {{ fmtCompact(rom.travelTotal) }}
          </span>
          <span v-if="tab.id === 'material' && tabStatus('material') !== 'empty'"
            class="sidebar-tab-badge"
            :class="`sidebar-tab-badge--${tabStatus('material')}`">
            {{ fmtCompact(rom.materialTotal) }}
          </span>
        </button>
      </nav>

      <div class="sidebar-spacer"></div>
    </aside>

    <!-- ── Right column: light topbar + main + status ─────────────── -->
    <div class="main-col">

      <!-- Light topbar: two stacked rows
           Row 1 — hamburger · scope chip · action buttons
           Row 2 — project info pills · Edit button -->
      <header class="topbar topbar--light">
        <div class="topbar-row topbar-row--main">
          <button class="sidebar-toggle sidebar-toggle--top"
            type="button"
            @click="sidebarCollapsed = !sidebarCollapsed"
            :data-tooltip="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
            <i class="ti ti-menu-2" aria-hidden="true"></i>
          </button>
          <CoaSelector />

          <div class="topbar-actions">
          <button class="btn btn-icon" @click="toggleTheme"
            :data-tooltip="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
            <i class="ti" :class="theme === 'dark' ? 'ti-sun' : 'ti-moon'" aria-hidden="true"></i>
          </button>
          <button class="btn btn-icon" :disabled="!rom.canUndo" @click="rom.undo" data-tooltip="Undo">
            <i class="ti ti-arrow-back-up" aria-hidden="true"></i>
          </button>
          <button class="btn btn-icon" :disabled="!rom.canRedo" @click="rom.redo" data-tooltip="Redo">
            <i class="ti ti-arrow-forward-up" aria-hidden="true"></i>
          </button>
          <div class="save-split" v-click-outside="() => saveMenuOpen = false">
            <button class="btn btn-save btn-save--main" @click="downloadQuoteFile" data-tooltip="Save quote to file">
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
                  <div class="export-menu-sub">One PDF per included scope (full detail)</div>
                </div>
              </button>
              <div v-if="includedScopesForExport.length > 1" class="combine-section">
                <button class="export-menu-item" @click="exportPDF('combined'); exportMenuOpen = false">
                  <i class="ti ti-file-type-pdf" aria-hidden="true"></i>
                  <div>
                    <div class="export-menu-title">PDF — combined document</div>
                    <div class="export-menu-sub">
                      Includes: {{ includedScopesForExport.map(c => c.name).join(', ') }}
                    </div>
                  </div>
                </button>
                <div class="combine-chips" @click.stop>
                  <button
                    v-for="c in rom.coas"
                    :key="c.id"
                    type="button"
                    class="combine-chip"
                    :class="{ 'combine-chip--on': c.includeInQuote }"
                    @click="rom.toggleCoaIncluded(c.id)"
                    :title="c.includeInQuote ? `Untick to drop ${c.name} from this combined PDF` : `Tick to include ${c.name} in this combined PDF`"
                  >
                    <i class="ti" :class="c.includeInQuote ? 'ti-check' : 'ti-x'" aria-hidden="true"></i>
                    {{ c.name }}
                  </button>
                </div>
              </div>
              <button class="export-menu-item" @click="exportWord(); exportMenuOpen = false">
                <i class="ti ti-file-description" aria-hidden="true"></i>
                <div>
                  <div class="export-menu-title">Word</div>
                  <div class="export-menu-sub">Editable .doc you can open in Word</div>
                </div>
              </button>
              <div class="summary-section">
                <div class="export-menu-item export-menu-item--label">
                  <i class="ti ti-clipboard-list" aria-hidden="true"></i>
                  <div>
                    <div class="export-menu-title">Cost summary (1 page)</div>
                    <div class="export-menu-sub">One-page roundup per scope — pick a format:</div>
                  </div>
                </div>
                <div class="summary-chips" @click.stop>
                  <button class="summary-chip" @click="exportPDF('summary'); exportMenuOpen = false" title="Download as PDF">
                    <i class="ti ti-file-type-pdf" aria-hidden="true"></i> PDF
                  </button>
                  <button class="summary-chip" @click="exportWordSummary(); exportMenuOpen = false" title="Download as Word document">
                    <i class="ti ti-file-description" aria-hidden="true"></i> Word
                  </button>
                  <button class="summary-chip" @click="exportExcelSummary(); exportMenuOpen = false" title="Download as Excel (.xlsx)">
                    <i class="ti ti-file-spreadsheet" aria-hidden="true"></i> Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button class="btn btn-secondary" @click="showPicker = true" data-tooltip="Start a Quote">
            <i class="ti ti-file-plus" aria-hidden="true"></i>
          </button>
          <button class="btn btn-danger" @click="confirmReset" data-tooltip="Reset all data">
            <i class="ti ti-trash" aria-hidden="true"></i>
          </button>
        </div>
        </div><!-- /.topbar-row--main -->

        <div class="topbar-row topbar-row--info">
          <div class="info-pills">
            <span v-for="(item, i) in projectSynopsis" :key="i"
              class="info-pill"
              :class="{ 'info-pill--scope': item.label === 'Scope' }">
              <span class="info-pill-key">{{ item.label }}</span>
              <span class="info-pill-value">{{ item.value }}</span>
            </span>
            <span v-if="!projectSynopsis.length" class="info-pill-empty">
              No project info yet — click Edit to fill in
            </span>
          </div>
          <button class="info-edit" @click="projInfoOpen = !projInfoOpen"
            :title="projInfoOpen ? 'Hide project info editor' : 'Edit project info'">
            <i class="ti" :class="projInfoOpen ? 'ti-x' : 'ti-edit'" aria-hidden="true"></i>
            {{ projInfoOpen ? 'Close' : 'Edit' }}
          </button>
        </div>
      </header>

      <!-- Project Info editor — slides down from the light topbar when Edit is clicked -->
      <div v-show="projInfoOpen" class="proj-drawer-body proj-drawer-body--inline">
        <div class="proj-field" :class="{ 'proj-field--off': rom.project.includeFields.sponsor === false }">
          <label>
            <span>Sponsor</span>
            <input type="checkbox" class="proj-include"
              :checked="rom.project.includeFields.sponsor"
              @change="rom.project.includeFields.sponsor = $event.target.checked"
              title="Include this field on the printed quote" />
          </label>
          <input type="text" :value="rom.project.sponsor"
            @input="rom.project.sponsor = $event.target.value" />
        </div>
        <div class="proj-field" :class="{ 'proj-field--off': rom.project.includeFields.roomName === false }">
          <label>
            <span>Room / Project Name</span>
            <input type="checkbox" class="proj-include"
              :checked="rom.project.includeFields.roomName"
              @change="rom.project.includeFields.roomName = $event.target.checked"
              title="Include this field on the printed quote" />
          </label>
          <input type="text" :value="rom.project.roomName"
            @input="rom.project.roomName = $event.target.value" />
        </div>
        <div class="proj-field" :class="{ 'proj-field--off': rom.project.includeFields.cityBase === false }">
          <label>
            <span>City / Base</span>
            <input type="checkbox" class="proj-include"
              :checked="rom.project.includeFields.cityBase"
              @change="rom.project.includeFields.cityBase = $event.target.checked"
              title="Include this field on the printed quote" />
          </label>
          <input type="text" :value="rom.project.cityBase"
            @input="rom.project.cityBase = $event.target.value" />
        </div>
        <div class="proj-field" :class="{ 'proj-field--off': rom.project.includeFields.building === false }">
          <label>
            <span>Building</span>
            <input type="checkbox" class="proj-include"
              :checked="rom.project.includeFields.building"
              @change="rom.project.includeFields.building = $event.target.checked"
              title="Include this field on the printed quote" />
          </label>
          <input type="text" :value="rom.project.building"
            @input="rom.project.building = $event.target.value" />
        </div>
        <div class="proj-field" :class="{ 'proj-field--off': rom.project.includeFields.projectEngineer === false }">
          <label>
            <span>Cronos Project Lead</span>
            <input type="checkbox" class="proj-include"
              :checked="rom.project.includeFields.projectEngineer"
              @change="rom.project.includeFields.projectEngineer = $event.target.checked"
              title="Include this field on the printed quote" />
          </label>
          <input type="text" :value="rom.project.projectEngineer"
            @input="rom.project.projectEngineer = $event.target.value" />
        </div>
        <div class="proj-field" :class="{ 'proj-field--off': rom.project.includeFields.govLead === false }">
          <label>
            <span>Government Project Lead</span>
            <input type="checkbox" class="proj-include"
              :checked="rom.project.includeFields.govLead"
              @change="rom.project.includeFields.govLead = $event.target.checked"
              title="Include this field on the printed quote" />
          </label>
          <input type="text" :value="rom.project.govLead"
            @input="rom.project.govLead = $event.target.value" />
        </div>
        <div class="proj-field" :class="{ 'proj-field--off': rom.project.includeFields.pmSupportLead === false }">
          <label>
            <span>PM Support Lead</span>
            <input type="checkbox" class="proj-include"
              :checked="rom.project.includeFields.pmSupportLead"
              @change="rom.project.includeFields.pmSupportLead = $event.target.checked"
              title="Include this field on the printed quote" />
          </label>
          <input type="text" :value="rom.project.pmSupportLead"
            @input="rom.project.pmSupportLead = $event.target.value" />
        </div>
        <div class="proj-field proj-field--date" :class="{ 'proj-field--off': rom.project.includeFields.date === false }">
          <label>
            <span>Date</span>
            <input type="checkbox" class="proj-include"
              :checked="rom.project.includeFields.date"
              @change="rom.project.includeFields.date = $event.target.checked"
              title="Include this field on the printed quote" />
          </label>
          <input type="date" :value="rom.project.date"
            @input="rom.project.date = $event.target.value" />
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
      <span class="stat">Engineering <strong>{{ fmtCompact(rom.engineeringTotal) }}</strong><span class="stat-hrs">{{ Math.round(rom.engineeringHours) }} hrs</span></span>
      <span class="stat">Travel <strong>{{ fmtCompact(rom.travelTotal) }}</strong></span>
      <span class="stat">Material <strong>{{ fmtCompact(rom.materialTotal) }}</strong></span>
      <span class="stat">Overhead <strong>{{ fmtCompact(rom.totalOverhead) }}</strong></span>
      <span class="stat stat-loaded">Loaded total <strong>{{ fmt(rom.totalLoadedCost) }}</strong></span>
      <span class="stat stat-saved"><i class="ti ti-device-floppy" aria-hidden="true"></i> Auto-saved</span>
      <span class="stat stat-build">build {{ BUILD }}</span>
    </footer>

    </div><!-- /.main-col -->

    <!-- ── Template picker modal ───────────────────────────────── -->
    <TemplatePicker
      v-if="showPicker"
      :can-dismiss="!!rom.project.templateId"
      @close="showPicker = false"
      @upload-backup="showPicker = false; pickQuoteFile()"
    />

    <!-- ── Missing project-info warning before export ──────────── -->
    <div v-if="showMissingWarning" class="modal-backdrop" @click.self="cancelMissingWarning">
      <div class="confirm-modal missing-modal">
        <h3>
          <i class="ti ti-alert-triangle" aria-hidden="true" style="color: #d97706; vertical-align: -2px; margin-right: 4px;"></i>
          {{ pendingMissing.length }} project field{{ pendingMissing.length === 1 ? '' : 's' }} missing
        </h3>
        <p class="missing-sub">Your printed quote will leave these blank:</p>
        <ul class="missing-list">
          <li v-for="f in pendingMissing" :key="f.key">
            <i class="ti ti-circle-dashed" aria-hidden="true"></i> {{ f.label }}
          </li>
        </ul>
        <p class="missing-q">Fill them in first, or export anyway?</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="exportAnywayFromWarning" type="button">
            Download anyway
          </button>
          <button class="btn btn-save" @click="updateInfoFromWarning" type="button">
            <i class="ti ti-edit" aria-hidden="true"></i> Update project info
          </button>
        </div>
      </div>
    </div>

    <!-- ── Reset confirm modal ─────────────────────────────────── -->
    <div v-if="showReset" class="modal-backdrop" @click.self="showReset = false">
      <div class="confirm-modal">
        <h3>Reset everything?</h3>
        <p>Clears all scopes, project info, labor, travel, material, and overhead — a full quote reset. Cannot be undone.</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="showReset = false">Cancel</button>
          <button class="btn btn-danger" @click="doReset">Reset</button>
        </div>
      </div>
    </div>

    <!-- ── Load JSON confirm modal ───────────────────────────────── -->
    <div v-if="showLoadConfirm" class="modal-backdrop" @click.self="cancelLoad">
      <div class="confirm-modal">
        <h3>
          <i class="ti ti-file-import" aria-hidden="true" style="color: var(--rom-accent); vertical-align: -2px; margin-right: 6px;"></i>
          Load quote file?
        </h3>
        <p>
          This will replace your current quote with the contents of:<br>
          <strong class="load-filename">{{ pendingLoadFile?.name }}</strong>
        </p>
        <p class="load-sub">Any unsaved changes will be lost.</p>
        <p v-if="loadError" class="load-error">
          <i class="ti ti-alert-triangle" aria-hidden="true"></i> {{ loadError }}
        </p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="cancelLoad">Cancel</button>
          <button class="btn btn-save" @click="doLoad">
            <i class="ti ti-file-import" aria-hidden="true"></i> Load file
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRomStore } from './stores/rom'
import { generatePDF }   from './utils/pdfExport'
import { generateExcel, generateExcelSummary } from './utils/excelExport'
import { generateWord, generateWordSummary }  from './utils/wordExport'
import { loadAllRates }  from './utils/ratesLoader'
import TemplatePicker from './components/TemplatePicker.vue'
import CoaSelector from './components/CoaSelector.vue'
import EngineeringView from './views/EngineeringView.vue'
import TravelView from './views/TravelView.vue'
import MaterialView from './views/MaterialView.vue'
import OverheadView from './views/OverheadView.vue'
import SummaryView from './views/SummaryView.vue'
import AdminView from './views/AdminView.vue'
import { BUILD } from './buildNumber.js'

const rom = useRomStore()

const showPicker      = ref(false)
const showReset       = ref(false)
const showLoadConfirm = ref(false)
const pendingLoadFile = ref(null)
const loadError       = ref('')
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

// Sidebar collapse state — persisted across reloads so the user's preference sticks
const SIDEBAR_KEY = 'rom-sidebar-collapsed'
const sidebarCollapsed = ref(localStorage.getItem(SIDEBAR_KEY) === '1')
watch(sidebarCollapsed, v => {
  try { localStorage.setItem(SIDEBAR_KEY, v ? '1' : '0') } catch {}
})

// Theme (light / dark) — applied via data-theme attribute on the document root
// so the dark-mode CSS variable overrides can target it. Persisted to localStorage.
const THEME_KEY = 'rom-theme'
const theme = ref(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light')
function applyTheme(t) {
  try { document.documentElement.setAttribute('data-theme', t) } catch {}
}
applyTheme(theme.value)
watch(theme, t => {
  applyTheme(t)
  try { localStorage.setItem(THEME_KEY, t) } catch {}
})
function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark' }

// Per-tab completion status — drives the sidebar tab badge color.
// Returns 'empty' (no badge), 'partial' (orange — something needs filling in), or 'complete' (green)
const laborTabStatus = computed(() => {
  const lines = rom.lineItems.filter(l => l.coaId === rom.activeCoaId && !!l.laborCat)
  if (lines.length === 0) return 'empty'
  const allComplete = lines.every(l =>
    l.taskId && (l.days || 0) > 0 && (l.hoursPerDay || 0) > 0 && (l.rate || 0) > 0
  )
  return allComplete ? 'complete' : 'partial'
})
const travelTabStatus = computed(() => {
  const trips = rom.ENTITIES.flatMap(e => rom.travel[e.id] ?? [])
    .filter(t => (t.coaId ?? rom.coas[0]?.id) === rom.activeCoaId)
  const travelers = trips.flatMap(t => t.travelers ?? [])
  if (travelers.length === 0) return 'empty'
  const allComplete = travelers.every(tr =>
    !!tr.name && (tr.days || 0) > 0 && (tr.hotel || tr.car || tr.airfare || tr.misc)
  )
  return allComplete ? 'complete' : 'partial'
})
const materialTabStatus = computed(() => {
  const items = rom.activeMaterialItems
  const manualAmt = rom.material.manualAmounts?.[rom.activeCoaId] || 0
  if (items.length === 0 && manualAmt === 0) return 'empty'
  if (items.length === 0) return 'partial'
  const allComplete = items.every(i =>
    !!i.description && (i.qty || 0) > 0 && (i.unitCost || 0) > 0
  )
  return allComplete ? 'complete' : 'partial'
})
// Helper used by the template to map tab id → its status
function tabStatus(tabId) {
  if (tabId === 'engineering') return laborTabStatus.value
  if (tabId === 'travel')      return travelTabStatus.value
  if (tabId === 'material')    return materialTabStatus.value
  return 'empty'
}

// Synopsis pills shown inline next to the scope chip. The active scope name
// already lives in the scope chip itself, so we don't repeat it here.
const projectSynopsis = computed(() => {
  const items = []
  const order = [
    { key: 'sponsor',         label: 'Sponsor' },
    { key: 'roomName',        label: 'Project' },
    { key: 'building',        label: 'Bldg' },
    { key: 'cityBase',        label: 'City' },
    { key: 'projectEngineer', label: 'Cronos' },
    { key: 'govLead',         label: 'Gov' },
  ]
  order.forEach(f => {
    const value = String(rom.project?.[f.key] ?? '').trim()
    if (value) items.push({ label: f.label, value })
  })
  return items
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

function exportExcel() {
  runExportWithCheck(async () => {
    try { await generateExcel(rom) }
    catch (e) { alert('Excel export error: ' + e.message) }
  })
}
const exportMenuOpen = ref(false)
// Used in the Export menu to show which scopes will land in the combined PDF
// and to hide the "combined" option entirely when only one scope is included.
const includedScopesForExport = computed(() => rom.coas.filter(c => c.includeInQuote))

// Required project-info fields for a printed quote — if any are blank we pop
// a custom modal asking the user whether to fill them in or export anyway.
const REQUIRED_PROJECT_FIELDS = [
  { key: 'sponsor',         label: 'Sponsor' },
  { key: 'projectEngineer', label: 'Cronos Project Lead' },
  { key: 'govLead',         label: 'Government Project Lead' },
  { key: 'roomName',        label: 'Room / Project Name' },
  { key: 'cityBase',        label: 'City / Base' },
  { key: 'building',        label: 'Building' },
  { key: 'pmSupportLead',   label: 'PM Support Lead' },
  { key: 'date',            label: 'Date' },
]
function missingProjectFields() {
  const includes = rom.project?.includeFields || {}
  // Only check fields the user has ticked as "include in printout"
  return REQUIRED_PROJECT_FIELDS.filter(f =>
    includes[f.key] !== false && !String(rom.project?.[f.key] ?? '').trim()
  )
}

// Missing-info modal state
const showMissingWarning = ref(false)
const pendingMissing = ref([])
let pendingExportFn = null

// Wrap each export with this. Runs the export immediately if nothing's missing,
// otherwise pops a modal that lets the user fill in info or proceed anyway.
function runExportWithCheck(fn) {
  const missing = missingProjectFields()
  if (missing.length === 0) { fn(); return }
  pendingMissing.value = missing
  pendingExportFn      = fn
  showMissingWarning.value = true
}
function exportAnywayFromWarning() {
  showMissingWarning.value = false
  const fn = pendingExportFn
  pendingExportFn = null
  pendingMissing.value = []
  if (fn) fn()
}
function updateInfoFromWarning() {
  showMissingWarning.value = false
  pendingExportFn = null
  pendingMissing.value = []
  projInfoOpen.value = true   // open the Project Info drawer so they can fill in
}
function cancelMissingWarning() {
  showMissingWarning.value = false
  pendingExportFn = null
  pendingMissing.value = []
}
const saveMenuOpen   = ref(false)
const loadFileInput  = ref(null)

function exportPDF(mode = 'separate') {
  runExportWithCheck(async () => {
    try { await generatePDF(rom, { mode }) }
    catch (e) { alert('PDF export error: ' + e.message) }
  })
}
function exportWord() {
  runExportWithCheck(async () => {
    try { await generateWord(rom) }
    catch (e) { alert('Word export error: ' + e.message) }
  })
}
function exportWordSummary() {
  runExportWithCheck(async () => {
    try { await generateWordSummary(rom) }
    catch (e) { alert('Word export error: ' + e.message) }
  })
}
function exportExcelSummary() {
  runExportWithCheck(async () => {
    try { await generateExcelSummary(rom) }
    catch (e) { alert('Excel export error: ' + e.message) }
  })
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
  pendingLoadFile.value = file
  loadError.value = ''
  showLoadConfirm.value = true
  ev.target.value = ''
}
function cancelLoad() {
  showLoadConfirm.value = false
  pendingLoadFile.value = null
  loadError.value = ''
}
function doLoad() {
  const file = pendingLoadFile.value
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result)
      rom.importStateFromBackup(payload)
      showLoadConfirm.value = false
      pendingLoadFile.value = null
      loadError.value = ''
    } catch (e) {
      loadError.value = 'Could not load quote file: ' + e.message
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
/* ═══ Tooltip ══════════════════════════════════════════════════════ */
[data-tooltip] { position: relative; }
[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: #1a2133;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  padding: 5px 9px;
  border-radius: 5px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity .15s, transform .15s;
  z-index: 9999;
}
[data-tooltip]:hover::after {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

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

/* ═══ Dark mode — override the design tokens when data-theme="dark" ════ */
:root[data-theme="dark"] {
  --rom-bg:           #0f1521;
  --rom-surface:      #1a2333;
  --rom-surface-alt:  #243049;
  --rom-border:       #344058;
  --rom-readonly:     #1c2535;
  --rom-text:         #e4e8f0;
  --rom-text-muted:   #a4b0cc;
  --rom-text-faint:   #6a7790;

  --rom-accent:       #4d8fd6;
  --rom-accent-bg:    #1e3050;
  --rom-accent-dark:  #7db4f0;
  --rom-info:         #4d8fd6;
  --rom-info-bg:      #1e3050;
  --rom-warn:         #f5c97a;
  --rom-warn-bg:      #3a2d12;
  --rom-danger:       #e67373;

  --rom-cronos-bg:    #1e3050;
  --rom-cronos-border:#4d8fd6;
  --rom-cronos-text:  #b5d4f4;
  --rom-gov-bg:       #1a2c44;
  --rom-gov-border:   #378add;
  --rom-gov-text:     #b5d4f4;
  --rom-sub-bg:       #3a2d12;
  --rom-sub-border:   #ef9f27;
  --rom-sub-text:     #fac775;

  --rom-header-bg:    #0a1020;
  --rom-header-text:  #f0f3f8;
}

/* Specific dark-mode overrides for hard-coded light backgrounds in scoped
   component CSS. We use a higher-specificity prefix so the scoped rules
   (which carry an extra data-v-* attribute) still get overridden. */

/* Entity card headers (Labor + Travel views) — light blue/amber → dark tints */
:root[data-theme="dark"] .entity--cronos .entity-head { background: #1e3050; border-bottom-color: #4d8fd6; }
:root[data-theme="dark"] .entity--gov    .entity-head { background: #1a2c44; border-bottom-color: #378add; }
:root[data-theme="dark"] .entity--sub    .entity-head { background: #3a2d12; border-bottom-color: #ef9f27; }
:root[data-theme="dark"] .entity--cronos .entity-pill { background: #4d8fd6; }
:root[data-theme="dark"] .entity--gov    .entity-pill { background: #378add; }
:root[data-theme="dark"] .entity--sub    .entity-pill { background: #ba7517; }

/* Phase backgrounds inside entity cards */
:root[data-theme="dark"] .phases-wrap   { background: #161e2e; }
:root[data-theme="dark"] .phase-section { border-color: #344058; }
:root[data-theme="dark"] .phase-section--has-lines { border-color: #4d8fd6; }

/* SummaryView subtotal/strong rows */
:root[data-theme="dark"] .break-sub-row td        { background: #243049; }
:root[data-theme="dark"] .break-sub-row--strong td { background: #2a3654; }

/* Small inline pill colors that were tuned for light bg */
:root[data-theme="dark"] .oh-info-pill--withoh { background: #3a2d12; color: #fac775; }

/* Travel service-block "MIE" row also uses an alt surface */
:root[data-theme="dark"] .service-block--mie { background: #243049; }

/* Hover surfaces with hardcoded near-white */
:root[data-theme="dark"] .del-btn:hover,
:root[data-theme="dark"] .oh-row-del:hover,
:root[data-theme="dark"] .btn-del:hover,
:root[data-theme="dark"] .cat-delete:hover,
:root[data-theme="dark"] .wbs-delete:hover { background: #4a1e1e; }

/* Phase header hover on populated rows — was bright blue, made white text vanish */
:root[data-theme="dark"] .phase-section--has-lines > .phase-head:hover { background: #243049; }

/* Material BOM row hover — its custom --row-hover fell back to #f8fafc */
:root[data-theme="dark"] .bom-row:hover td { background: #243049; }

/* Travel service cell hover */
:root[data-theme="dark"] .svc-cell:hover { background: #243049; }

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

/* ═══ App shell — sidebar | main-col ═══════════════════════════════
   sidebar (navy) holds brand + tabs + quote total
   main-col holds light topbar + project info drawer + main + status
══════════════════════════════════════════════════════════════════════ */
.app {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: 1fr;   /* single full-height row so sidebar + main-col stretch */
  height: 100vh;
  overflow: hidden;
}

/* ─── Sidebar ──────────────────────────────────────────────────── */
.sidebar {
  background: var(--rom-header-bg);
  color: var(--rom-header-text);
  display: flex; flex-direction: column;
  padding: 14px 0;
  overflow-y: auto;
}
.sidebar-brand {
  display: flex; align-items: center; gap: 8px;
  padding: 0 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.12);
  margin-bottom: 10px;
}
.sidebar-brand-text {
  font-size: 13px; font-weight: 500; color: #fff;
  line-height: 1.15;
  flex: 1; min-width: 0;
}
.sidebar-build-tag {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 6px;
  font-size: 9px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase;
  background: rgba(125,211,252,0.18);
  color: #b6e2fc;
  border: 1px solid rgba(125,211,252,0.4);
  border-radius: 4px;
}
.sidebar-toggle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  background: transparent; border: none; border-radius: 4px;
  color: rgba(255,255,255,0.75); cursor: pointer;
  flex-shrink: 0;
}
.sidebar-toggle:hover { background: rgba(255,255,255,0.08); color: #fff; }
.sidebar-toggle i { font-size: 18px; }

/* When the toggle lives in the light topbar instead of the dark sidebar */
.sidebar-toggle--top {
  width: 34px; height: 34px;
  border: 1px solid var(--rom-border);
  background: var(--rom-surface);
  color: var(--rom-text-muted);
}
.sidebar-toggle--top:hover {
  background: var(--rom-accent-bg);
  border-color: var(--rom-accent);
  color: var(--rom-accent);
}
.sidebar-nav { display: flex; flex-direction: column; padding: 4px 6px; gap: 2px; }
.sidebar-tab {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px;
  background: transparent; border: none; border-left: 3px solid transparent;
  color: rgba(255,255,255,0.65);
  font-size: 13px; font-weight: 500; text-align: left;
  cursor: pointer; font-family: inherit;
  border-radius: 0 4px 4px 0;
  transition: background .12s, color .12s;
}
.sidebar-tab-icon { font-size: 16px; flex-shrink: 0; }
.sidebar-tab-label { flex: 1; }
.sidebar-tab:hover { color: #fff; background: rgba(255,255,255,0.08); }
.sidebar-tab.active {
  color: #fff;
  background: rgba(125,211,252,0.12);
  border-left-color: #7dd3fc;
  font-weight: 700;
}
.sidebar-tab-badge {
  font-size: 10px; padding: 1px 7px;
  background: #2e7d32; color: #fff;     /* default green = complete */
  border-radius: 10px; font-weight: 600;
}
.sidebar-tab-badge--complete { background: #2e7d32; color: #fff; }
.sidebar-tab-badge--partial  { background: #d97706; color: #fff; }
.sidebar-spacer { flex: 1; min-height: 16px; }
.sidebar-total {
  padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,0.12);
  line-height: 1.1;
}
.sidebar-total-label {
  font-size: 9px; color: rgba(255,255,255,0.55);
  letter-spacing: .08em; text-transform: uppercase;
  margin-bottom: 2px;
}
.sidebar-total-value {
  font-size: 20px; font-weight: 700; color: #7dd3fc;
}

/* ─── Collapsed sidebar state ─────────────────────────────────────
   Triggered by the hamburger toggle in the brand area. Sidebar shrinks
   to a 64px rail showing only icons + the C logo + the loaded total. */
.app--sidebar-collapsed { grid-template-columns: 64px 1fr; }
.app--sidebar-collapsed .sidebar-brand {
  justify-content: center;
  padding: 0 0 12px;
}
.app--sidebar-collapsed .sidebar-brand-text { display: none; }

.app--sidebar-collapsed .sidebar-nav { padding: 4px 6px; }
.app--sidebar-collapsed .sidebar-tab {
  justify-content: center;
  padding: 10px 0;
  border-left-width: 3px;
  border-radius: 0 4px 4px 0;
  position: relative;
}
.app--sidebar-collapsed .sidebar-tab-label { display: none; }
.app--sidebar-collapsed .sidebar-tab-icon { font-size: 18px; }
.app--sidebar-collapsed .sidebar-tab-badge {
  position: absolute; top: 4px; right: 4px;
  padding: 0; width: 7px; height: 7px;
  font-size: 0; line-height: 0; color: transparent;
  border-radius: 50%;
}
.app--sidebar-collapsed .sidebar-tab-badge--complete { background: #2e7d32; }
.app--sidebar-collapsed .sidebar-tab-badge--partial  { background: #d97706; }

.app--sidebar-collapsed .sidebar-total {
  padding: 10px 4px;
  text-align: center;
}
.app--sidebar-collapsed .sidebar-total-label { display: none; }
.app--sidebar-collapsed .sidebar-total-value {
  font-size: 11px; font-weight: 700;
  word-break: break-all; line-height: 1.1;
}

/* ─── Main column wrapper ──────────────────────────────────────── */
.main-col {
  display: flex; flex-direction: column;
  min-width: 0;            /* allow content inside to shrink/scroll */
  overflow: hidden;
}
.proj-drawer-body--inline { flex-shrink: 0; }

/* ─── Light topbar (above main content) — two stacked rows ─────── */
.topbar {
  display: flex; flex-direction: column;
  flex-shrink: 0;
  z-index: 10;
}
.topbar--light {
  background: var(--rom-surface);
  border-bottom: 1px solid var(--rom-border);
  color: var(--rom-text);
}
.topbar-row {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 18px;
  min-height: 36px;
  width: 100%;
}
.topbar-row--main {
  border-bottom: 2px solid var(--rom-accent);
}
.topbar-row--info {
  background: var(--rom-accent-bg);
  font-size: 12px;
}
/* Scope chip stays its natural compact size; actions anchor to the right */
.topbar-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; margin-left: auto; }
.topbar-actions .btn { padding: 5px 10px; font-size: 12px; }
.topbar-actions .btn-icon { padding: 5px 7px; }
/* Info row — pills fill the row width, Edit button anchors right */
.topbar-row--info .info-pills { flex: 1; min-width: 0; }
.topbar-row--info .info-edit  { flex-shrink: 0; }

/* Project info pills row in the light topbar */
.info-pills {
  display: flex; align-items: center;
  gap: 8px 14px;            /* row-gap · column-gap */
  flex-wrap: wrap;           /* allow pills to flow onto a second visual line */
  flex: 1; min-width: 0;
  padding: 2px 4px;
}
.info-pill {
  display: inline-flex; align-items: baseline; gap: 5px;
  flex-shrink: 0;
  font-size: 12px;
}
.info-pill-key {
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .05em;
  color: var(--rom-text-muted);
}
.info-pill-value { color: var(--rom-text); }
.info-pill--scope .info-pill-key { color: var(--rom-accent); }
.info-pill--scope .info-pill-value { color: var(--rom-accent-dark); font-weight: 700; }
.info-pill-empty {
  font-size: 12px; color: var(--rom-text-muted); font-style: italic;
}
.info-edit {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 4px;
  background: transparent; border: 1px solid var(--rom-border);
  color: var(--rom-accent-dark); font-size: 11px; font-weight: 600;
  cursor: pointer; font-family: inherit;
  flex-shrink: 0;
}
.info-edit:hover { background: var(--rom-accent-bg); border-color: var(--rom-accent); }
.info-edit i { font-size: 12px; }
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

/* ─── Buttons (shared) — now on a LIGHT topbar ─────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; font-size: 12px; font-weight: 500;
  border-radius: var(--rom-radius);
  border: 1px solid var(--rom-border);
  background: var(--rom-surface); color: var(--rom-text);
  cursor: pointer;
  transition: background .15s, border-color .15s;
  font-family: inherit;
}
.btn:hover          { background: var(--rom-surface-alt); border-color: var(--rom-accent); }
.btn.btn-secondary  { background: var(--rom-surface); }
.btn.btn-danger     { background: #fff0f0; border-color: var(--rom-danger); color: var(--rom-danger); }
.btn.btn-danger:hover { background: var(--rom-danger); color: #fff; }
.btn.btn-snapshot   {
  background: var(--rom-accent-bg);
  border-color: var(--rom-accent);
  color: var(--rom-accent-dark);
}
.btn.btn-snapshot:hover { background: #d6e3fa; }
.btn.btn-pdf        { background: #fff0f0; border-color: var(--rom-danger); color: var(--rom-danger); }
.btn.btn-pdf:hover  { background: var(--rom-danger); color: #fff; }
.btn:disabled       { opacity: .4; cursor: not-allowed; }
.btn:disabled:hover { background: var(--rom-surface); border-color: var(--rom-border); }

/* Unified Export dropdown — Excel · PDF · Word */
.export-split { position: relative; display: inline-flex; }
.btn-export {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--rom-header-bg);
  border-color: var(--rom-header-bg);
  color: #fff;
}
.btn-export:hover { background: var(--rom-accent-dark); border-color: var(--rom-accent-dark); }
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

/* Cost-summary section: label row + 3 format chips */
.summary-section { border-top: 1px solid var(--rom-border, #c4cede); }
.summary-section .export-menu-item--label { border-bottom: none; cursor: default; }
.summary-section .export-menu-item--label:hover { background: transparent; }
.summary-chips {
  display: flex; gap: 6px;
  padding: 0 14px 10px 42px;
}
.summary-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 12px;
  font-size: 11px; font-weight: 600;
  border: 1px solid var(--rom-border, #c4cede);
  border-radius: 10px;
  background: var(--rom-surface, #fff);
  color: var(--rom-accent, #1a5fb4);
  cursor: pointer;
  font-family: inherit;
}
.summary-chip i { font-size: 13px; }
.summary-chip:hover {
  background: var(--rom-accent-bg, #e8f0fe);
  border-color: var(--rom-accent, #1a5fb4);
}

/* Combined-PDF section: row + inline scope chips you can toggle without closing the menu */
.combine-section { border-bottom: 1px solid var(--rom-border, #c4cede); }
.combine-section .export-menu-item { border-bottom: none; }
.combine-chips {
  display: flex; flex-wrap: wrap; gap: 4px;
  padding: 0 14px 10px 42px;
}
.combine-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  font-size: 10px; font-weight: 600;
  border: 1px solid var(--rom-border, #c4cede);
  border-radius: 10px;
  background: var(--rom-surface, #fff);
  color: var(--rom-text-faint, #8a9ab8);
  cursor: pointer;
  font-family: inherit;
}
.combine-chip i { font-size: 11px; }
.combine-chip:hover { border-color: var(--rom-accent, #1a5fb4); }
.combine-chip--on {
  background: var(--rom-accent-bg, #e8f0fe);
  border-color: var(--rom-accent, #1a5fb4);
  color: var(--rom-accent-dark, #1248a0);
}

/* Save split button */
.save-split { position: relative; display: inline-flex; align-items: stretch; }
.btn.btn-save        { background: var(--rom-accent); border-color: var(--rom-accent); color: #fff; }
.btn.btn-save:hover  { background: var(--rom-accent-dark); border-color: var(--rom-accent-dark); }
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
.snap-count {
  font-size: 10px; padding: 1px 6px;
  background: var(--rom-accent); color: #fff;
  border-radius: 8px; font-weight: 700; margin-left: 2px;
}

/* ─── Project Info drawer ────────────────────────────────────────── */
.proj-drawer {
  background: var(--rom-surface, #fff);
  border-bottom: 1px solid var(--rom-border, #c4cede);
}
.proj-drawer-tab {
  display: flex; align-items: center; gap: 10px;
  padding: 5px 14px;
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
  text-align: left;
  max-width: calc(100% - 36px);
}
.proj-drawer-tab-label { flex-shrink: 0; }
.proj-drawer-synopsis {
  display: flex; align-items: center; gap: 14px; flex-wrap: nowrap;
  font-size: 11px; font-weight: 500;
  text-transform: none; letter-spacing: 0;
  color: var(--rom-text, #1a2133);
  flex: 1; min-width: 0;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.proj-drawer-syn-item {
  display: inline-flex; align-items: baseline; gap: 4px;
  padding: 0 8px 0 0;
  border-right: 1px solid var(--rom-border, #c4cede);
}
.proj-drawer-syn-item:last-child { border-right: none; padding-right: 0; }
.proj-drawer-syn-key {
  font-size: 9px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .05em;
  color: var(--rom-text-muted, #4a5a78);
}
.proj-drawer-synopsis--empty {
  font-style: italic; color: var(--rom-text-muted, #4a5a78);
}
.proj-drawer-syn-item--scope {
  color: var(--rom-accent-dark, #1248a0);
  font-weight: 700;
}
.proj-drawer-syn-item--scope .proj-drawer-syn-key {
  color: var(--rom-accent, #1a5fb4);
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
  /* Sponsor + Cronos Lead get the narrowest non-fixed column, City/Base gets
     the widest, Building + Date are compact, leads sit in the middle */
  grid-template-columns: 0.9fr 1fr 1.5fr 130px;
  gap: 14px;
  padding: 12px 18px 14px;
  background: var(--rom-surface, #fff);
  border-top: 1px solid var(--rom-border, #c4cede);
}
.proj-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.proj-field label {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
  font-size: 10px; font-weight: 600;
  color: var(--rom-text-muted, #4a5a78);
  text-transform: uppercase; letter-spacing: .05em;
}
.proj-include {
  width: 14px; height: 14px; margin: 0; cursor: pointer;
  flex-shrink: 0;
  accent-color: var(--rom-accent);
}
/* When a field is excluded from the printout, dim it so the state is visible at a glance */
.proj-field--off label > span { text-decoration: line-through; opacity: 0.55; }
.proj-field--off input[type="text"],
.proj-field--off input[type="date"] {
  opacity: 0.5;
  background: var(--rom-surface-alt);
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
  flex: 1;                /* fill the available height in main-col's flex column */
  min-height: 0;          /* allow inner scrolling */
  overflow-y: auto;
  background: var(--rom-bg);
}
.statusbar { flex-shrink: 0; }
.topbar    { flex-shrink: 0; }

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
.stat-hrs { margin-left: 6px; font-size: 10px; color: rgba(255,255,255,.45); font-weight: 400; }
.stat-loaded { font-size: 12px; font-weight: 500; }
.stat-loaded strong { color: #7dd3fc; font-size: 13px; }
.stat-saved { opacity: .5; font-size: 10px; }
.stat-build { opacity: .35; font-size: 10px; font-variant-numeric: tabular-nums; margin-left: auto; }

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

/* Load JSON modal */
.load-filename {
  display: inline-block; margin-top: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; color: var(--rom-accent);
  word-break: break-all;
}
.load-sub { font-size: 12px !important; margin-top: -12px !important; }
.load-error {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; border-radius: 6px;
  background: rgba(192, 57, 43, 0.08);
  border: 1px solid rgba(192, 57, 43, 0.25);
  color: var(--rom-danger); font-size: 12px;
  margin-bottom: 16px;
}

/* Missing-project-info export warning modal */
.missing-modal { width: 420px; }
.missing-modal h3 {
  font-size: 16px; margin: 0 0 10px;
  display: flex; align-items: center;
}
.missing-sub {
  font-size: 13px; color: var(--rom-text-muted);
  margin: 0 0 10px;
}
.missing-list {
  list-style: none; padding: 0; margin: 0 0 14px;
  background: var(--rom-surface-alt);
  border-radius: 6px;
  border: 1px solid var(--rom-border);
  max-height: 200px; overflow-y: auto;
}
.missing-list li {
  padding: 6px 12px;
  font-size: 13px; color: var(--rom-text);
  border-bottom: 1px solid var(--rom-border);
  display: flex; align-items: center; gap: 6px;
}
.missing-list li:last-child { border-bottom: none; }
.missing-list li i { color: #d97706; font-size: 13px; }
.missing-q {
  font-size: 13px; color: var(--rom-text); font-weight: 500;
  margin: 0 0 16px;
}

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
