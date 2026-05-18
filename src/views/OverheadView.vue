<template>
  <div class="overhead-view">

    <!-- Summary strip -->
    <div class="summary-strip">
      <span class="sstat"><span class="sstat-lbl">Unloaded Total</span><strong>{{ fmt(rom.unloadedProjectTotal) }}</strong></span>
      <span class="sstat-div"></span>
      <span class="sstat"><span class="sstat-lbl">Overhead %</span><strong>{{ totalPctDisplay }}%</strong></span>
      <span class="sstat-div"></span>
      <span class="sstat"><span class="sstat-lbl">Contract Fee</span><strong>{{ fmt(rom.contractFee) }}</strong></span>
      <span class="sstat-div"></span>
      <span class="sstat sstat--total sstat--accent"><span class="sstat-lbl">Grand Total (Loaded)</span><strong>{{ fmt(rom.totalLoadedCost) }}</strong></span>
    </div>

    <div class="oh-body">

      <!-- Labor escalation -->
      <div class="oh-section oh-esc-section">
        <span class="oh-esc-label">Labor Escalation</span>
        <div class="oh-esc-row">
          <input type="number" min="0" max="20" step="0.5" class="oh-esc-num"
            :value="rom.project.escalationPct"
            @input="rom.project.escalationPct = parseFloat($event.target.value) || 0" />
          <span class="oh-esc-unit">%/yr</span>
          <span class="oh-esc-x">×</span>
          <input type="number" min="0" max="10" step="1" class="oh-esc-num oh-esc-num--sm"
            :value="rom.project.escalationYears"
            @input="rom.project.escalationYears = parseInt($event.target.value) || 0" />
          <span class="oh-esc-unit">yrs</span>
          <span v-if="rom.escalationFactor > 1" class="oh-esc-badge">
            ×{{ rom.escalationFactor.toFixed(3) }} &nbsp;·&nbsp; +{{ fmt(escalationDelta) }} on labor
          </span>
        </div>
      </div>

      <!-- Master toggle: turn off all overhead for this scope at once -->
      <div class="oh-section oh-master">
        <label class="oh-master-toggle">
          <input type="checkbox"
            :checked="rom.overhead.overheadEnabled"
            @change="rom.setOverheadEnabled(rom.activeCoaId, $event.target.checked)" />
          <span class="oh-master-text">
            <strong>Apply overhead to this scope</strong>
            <span class="oh-master-sub">Untick to zero out all contract fee items below.</span>
          </span>
        </label>
      </div>

      <!-- Export display preference — controls what the printed quote shows -->
      <div class="oh-section">
        <div class="oh-section-head">On printed quote</div>
        <div class="oh-display-body">
          <label class="oh-display-opt">
            <input type="radio" name="oh-display"
              :checked="rom.overhead.showLineItems !== false"
              @change="rom.setShowLineItems(rom.activeCoaId, true)" />
            <span class="oh-display-text">
              <strong>Show all line items for contract fee</strong>
              <span class="oh-display-sub">Each overhead row appears on the printed PDF / Excel / Word with its own dollar amount.</span>
            </span>
          </label>
          <label class="oh-display-opt">
            <input type="radio" name="oh-display"
              :checked="rom.overhead.showLineItems === false"
              @change="rom.setShowLineItems(rom.activeCoaId, false)" />
            <span class="oh-display-text">
              <strong>Only show contract fee total on quote</strong>
              <span class="oh-display-sub">The breakdown stays in this tool. Customer-facing docs show only the rolled-up Contract Fee.</span>
            </span>
          </label>
        </div>
      </div>

      <!-- Overhead items — fully editable, deletable, addable. -->
      <div class="oh-section" :class="{ 'oh-section--off': !rom.overhead.overheadEnabled }">
        <div class="oh-section-head">
          <span>Overhead items
            <span class="oh-section-note">% of Unloaded Project Total · tick each to include in Contract Fee</span>
          </span>
          <button class="oh-info-btn"
            type="button"
            @click="infoOpen = !infoOpen"
            :title="infoOpen ? 'Hide help' : 'How does the base column work?'"
            :aria-expanded="infoOpen">
            <i class="ti ti-info-circle" aria-hidden="true"></i>
            <span class="oh-info-btn-label">How the base column works</span>
            <i class="ti oh-info-btn-chevron" :class="infoOpen ? 'ti-chevron-up' : 'ti-chevron-down'" aria-hidden="true"></i>
          </button>
        </div>

        <!-- Collapsible help panel — explains × Unloaded vs × Unloaded + Overhead -->
        <div v-if="infoOpen" class="oh-info-drop">
          <p>
            Each overhead item has a <strong>base</strong> — the dollar number its
            percentage multiplies against. Two options:
          </p>
          <div class="oh-info-drop-grid">
            <div class="oh-info-item">
              <div class="oh-info-pill oh-info-pill--unloaded">× Unloaded</div>
              <p>
                Multiplied by the <strong>unloaded project total</strong>
                (Labor + Travel + Material). Use this for most overhead lines.
              </p>
              <p class="oh-info-example"><strong>Ex:</strong> 2% × $100,000 = <strong>$2,000</strong></p>
            </div>
            <div class="oh-info-item">
              <div class="oh-info-pill oh-info-pill--withoh">× Unloaded + Overhead</div>
              <p>
                Multiplied by <strong>unloaded + all enabled "× Unloaded" items</strong>.
                It compounds. SCR uses this pattern.
              </p>
              <p class="oh-info-example"><strong>Ex:</strong> ($100k + $4.5k) × 12% = <strong>$12,540</strong></p>
            </div>
          </div>
          <div class="oh-info-note">
            <strong>Default:</strong> first four items use × Unloaded; SCR uses × Unloaded + Overhead.
          </div>
        </div>

        <div
          v-for="(item, idx) in (rom.overhead.items || [])"
          :key="item.id"
          class="oh-row"
          :class="{
            'oh-row--dragging':  dragState.dragId === item.id,
            'oh-row--drag-over': dragState.overId === item.id && dragState.dragId !== item.id,
          }"
          :draggable="dragState.armedId === item.id"
          @dragstart="dragState.dragId = item.id"
          @dragend="resetDrag()"
          @dragover.prevent="dragState.overId = item.id"
          @dragleave="dragState.overId = null"
          @drop.prevent="rom.reorderOverheadItem(rom.activeCoaId, dragState.dragId, item.id); resetDrag()"
        >
          <span class="oh-drag-handle"
            title="Drag to reorder"
            @mousedown="dragState.armedId = item.id"
            @mouseup="dragState.armedId = null">⠿</span>
          <input type="checkbox" class="oh-tick"
            :checked="item.enabled"
            @change="rom.updateOverheadItem(rom.activeCoaId, item.id, { enabled: $event.target.checked })" />
          <div class="oh-label-wrap">
            <input type="text" class="oh-label-input"
              :value="item.label"
              :placeholder="placeholderFor(idx)"
              @input="rom.updateOverheadItem(rom.activeCoaId, item.id, { label: $event.target.value })" />
          </div>
          <div class="oh-pct-wrap">
            <input type="number" min="0" max="100" step="0.1"
              :value="pctDisplay(item.pct)"
              class="oh-input oh-input--pct"
              @input="rom.updateOverheadItem(rom.activeCoaId, item.id, { pct: (+$event.target.value || 0) / 100 })" />
            <span class="oh-suffix">%</span>
          </div>
          <select class="oh-base-select"
            :value="item.base"
            @change="rom.updateOverheadItem(rom.activeCoaId, item.id, { base: $event.target.value })"
            title="Which base is this percentage applied to?">
            <option value="unloaded">× Unloaded</option>
            <option value="withOverhead">× Unloaded + Overhead</option>
            <option value="labor">× Labor only</option>
            <option value="travel">× Travel only</option>
            <option value="material">× Material only</option>
          </select>
          <div class="oh-computed">{{ fmt(computeItemCost(item)) }}</div>
          <button class="oh-row-del" type="button"
            @click="rom.removeOverheadItem(rom.activeCoaId, item.id)"
            title="Remove this overhead item">
            <i class="ti ti-trash" aria-hidden="true"></i>
          </button>
        </div>

        <div class="oh-row oh-row--add">
          <button class="oh-add-btn" type="button" @click="rom.addOverheadItem(rom.activeCoaId)">
            <i class="ti ti-plus" aria-hidden="true"></i> Add overhead item
          </button>
        </div>

        <div class="oh-row oh-row--fee">
          <div></div>
          <div></div>
          <div class="oh-label-wrap"><strong class="oh-fee-label">Contract Fee</strong></div>
          <div class="oh-pct-wrap">
            <span class="oh-fee-total-pct">{{ totalPctDisplay }}%</span>
          </div>
          <div></div>
          <div class="oh-computed oh-computed--fee">{{ fmt(rom.contractFee) }}</div>
          <div></div>
        </div>
      </div>


      <!-- Grand total — the Contract Fee box above already sums overhead;
           this just shows the final loaded number for quick reference -->
      <div class="oh-section oh-totals">
        <div class="totals-row totals-row--grand">
          <span>Grand Total (Loaded)</span>
          <span>{{ fmt(rom.totalLoadedCost) }}</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRomStore } from '../stores/rom'
const rom = useRomStore()

const totalEnabledPct = computed(() =>
  (rom.overhead?.items || []).filter(i => i.enabled).reduce((s, i) => s + (i.pct || 0), 0)
)
const totalPctDisplay = computed(() => (totalEnabledPct.value * 100).toFixed(1))

const escalationDelta = computed(() => rom.engineeringTotal * (rom.escalationFactor - 1))

// Whether the "How the base column works" help dropdown is open
const infoOpen = ref(false)

// Drag-to-reorder state — only armed when mouse goes down on the grip handle,
// so clicking anywhere else in a row doesn't start a drag.
const dragState = reactive({ dragId: null, overId: null, armedId: null })
function resetDrag() {
  dragState.dragId  = null
  dragState.overId  = null
  dragState.armedId = null
}
function fmt(n) { return '$' + Math.round(n || 0).toLocaleString() }
function pctDisplay(v) { return ((v || 0) * 100).toFixed(1) }

// Cost of one overhead item — accounts for master toggle, per-item enable,
// and the item's base (unloaded vs unloaded + overhead).
function computeItemCost(item) {
  if (!rom.overhead?.overheadEnabled || !item.enabled) return 0
  if (item.base === 'unloaded')     return rom.unloadedProjectTotal * (item.pct || 0)
  if (item.base === 'labor')        return rom.engineeringTotal     * (item.pct || 0)
  if (item.base === 'travel')       return rom.travelTotal          * (item.pct || 0)
  if (item.base === 'material')     return rom.materialTotal        * (item.pct || 0)
  if (item.base === 'withOverhead') return rom.projectWithOverhead  * (item.pct || 0)
  return 0
}

// Placeholder text mirrors the legacy default contract-fee line labels.
// Shows up faintly when the user clears or hasn't filled the field.
const DEFAULT_OH_LABELS = [
  'PM/Financial Support',
  'Material Tracking',
  'Government PM Labor',
  'Management Reserve',
  'Support Cost Rate (SCR)',
]
function placeholderFor(idx) {
  return DEFAULT_OH_LABELS[idx] ?? 'Overhead item name'
}
</script>

<style scoped>
.overhead-view { padding: 0 0 48px; }

/* Summary strip */
.summary-strip {
  display: flex; align-items: center;
  padding: 0 20px; min-height: 44px;
  border-bottom: 1px solid var(--rom-border);
  background: var(--rom-surface);
  flex-wrap: wrap; gap: 0;
}
.sstat { display: flex; align-items: baseline; gap: 6px; padding: 10px 16px; white-space: nowrap; }
.sstat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--rom-text-muted); }
.sstat strong { font-size: 15px; font-weight: 600; color: var(--rom-text); font-variant-numeric: tabular-nums; }
.sstat-div { width: 1px; height: 20px; background: var(--rom-border); flex-shrink: 0; }
.sstat--accent strong { color: var(--rom-accent); }
.sstat--total { margin-left: auto; }
.sstat--total strong { font-size: 17px; color: var(--rom-accent); }

/* Body — single column, capped width so it reads nicely */
.oh-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1000px;
}

/* Info trigger that sits inside the "Overhead items" section head */
.oh-section-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
}
.oh-info-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 14px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.9);
  font-size: 11px; font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  text-transform: none; letter-spacing: 0;
  flex-shrink: 0;
}
.oh-info-btn:hover { background: rgba(255,255,255,0.16); border-color: rgba(255,255,255,0.45); }
.oh-info-btn i { font-size: 13px; }
.oh-info-btn-label { white-space: nowrap; }
.oh-info-btn-chevron { font-size: 12px; opacity: .8; }

/* Collapsible help drop — sits between section head and the items list */
.oh-info-drop {
  padding: 14px 18px;
  background: var(--rom-accent-bg);
  border-bottom: 1px solid var(--rom-border);
  font-size: 13px; color: var(--rom-text); line-height: 1.5;
}
.oh-info-drop p {
  margin: 0 0 8px;
  color: var(--rom-text-muted);
}
.oh-info-drop strong { color: var(--rom-text); font-weight: 600; }
.oh-info-drop-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 8px 0;
}
@media (max-width: 760px) {
  .oh-info-drop-grid { grid-template-columns: 1fr; }
}
.oh-info-item {
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: 6px;
  padding: 10px 12px;
}
.oh-info-item p { margin: 0 0 4px; font-size: 12px; }
.oh-info-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 11px; font-weight: 700;
  margin-bottom: 6px;
  letter-spacing: .02em;
}
.oh-info-pill--unloaded { background: var(--rom-accent-bg); color: var(--rom-accent-dark); }
.oh-info-pill--withoh   { background: #fdf6e3; color: #8a6508; }
.oh-info-example {
  font-size: 11.5px !important;
  background: var(--rom-surface-alt);
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 3px solid var(--rom-accent);
  margin-top: 4px !important;
}
.oh-info-note {
  margin-top: 8px;
  padding: 6px 10px;
  background: var(--rom-surface);
  border-left: 3px solid var(--rom-accent);
  font-size: 12px;
  color: var(--rom-text);
}

/* Sections */
.oh-section {
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: var(--rom-radius-lg);
  overflow: hidden;
}
.oh-section-head {
  padding: 9px 16px;
  background: var(--rom-header-bg);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .04em;
  display: flex;
  align-items: center;
  gap: 10px;
}
.oh-section-note {
  font-size: 10px;
  font-weight: 400;
  color: rgba(255,255,255,.6);
}

/* Rows — drag handle, checkbox, label, percent, base, computed amount, delete */
.oh-row {
  display: grid;
  grid-template-columns: 20px 22px 1fr 110px 160px 120px 32px;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--rom-border);
}

/* Drag handle (⠿) — same pattern as the Labor line rows */
.oh-drag-handle {
  display: block; text-align: center;
  font-size: 14px; color: var(--rom-text-faint, #8a9ab8);
  cursor: grab; user-select: none; line-height: 1;
  padding: 2px 0;
}
.oh-drag-handle:active { cursor: grabbing; }
.oh-row--dragging  { opacity: .45; }
.oh-row--drag-over { border-top: 2px solid var(--rom-accent) !important; background: var(--rom-accent-bg); }
.oh-row:last-child { border-bottom: none; }
.oh-row:hover { background: var(--rom-surface-alt); }
.oh-tick { width: 16px; height: 16px; margin: 0; cursor: pointer; }

/* Master toggle section */
.oh-master {
  padding: 14px 18px;
  background: var(--rom-accent-bg);
  border-color: var(--rom-accent);
}
.oh-master-toggle {
  display: flex; align-items: center; gap: 12px;
  cursor: pointer;
}
.oh-master-toggle input[type="checkbox"] {
  width: 18px; height: 18px; margin: 0; cursor: pointer;
  accent-color: var(--rom-accent-dark);
}
.oh-master-text { display: flex; flex-direction: column; gap: 2px; }
.oh-master-text strong { font-size: 14px; color: var(--rom-accent-dark); }
.oh-master-sub { font-size: 12px; color: var(--rom-text-muted); }

/* When master is off, the items section dims */
.oh-section--off { opacity: 0.55; }
.oh-section--off .oh-row:hover { background: transparent; }

/* Contract Fee summary row — higher specificity avoids needing !important */
.oh-section .oh-row--fee {
  background: var(--rom-header-bg);
  border-top: 2px solid var(--rom-accent);
  padding-top: 14px; padding-bottom: 14px;
}
.oh-section .oh-row--fee:hover { background: var(--rom-header-bg); }
.oh-fee-label { font-size: 14px; color: #fff; text-transform: uppercase; letter-spacing: .06em; }
.oh-fee-hint  { font-size: 11px; color: rgba(255,255,255,.6); font-style: italic; }
.oh-computed--fee {
  font-size: 18px !important; font-weight: 800 !important;
  color: #7dd3fc !important;
}

/* Base-type dropdown for each overhead item */
.oh-base-select {
  width: 100%;
  padding: 5px 8px;
  font-size: 11px;
  border: 1px solid var(--rom-border);
  border-radius: 4px;
  background: var(--rom-surface);
  color: var(--rom-text);
  font-family: inherit;
}
.oh-base-select:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: var(--rom-accent); }

/* Delete (trash) icon at the end of each row */
.oh-row-del {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  background: transparent; border: none; border-radius: 4px;
  color: var(--rom-text-faint, #8a9ab8);
  cursor: pointer; font-size: 14px;
}
.oh-row-del:hover { background: #fff0f0; color: var(--rom-danger, #c0392b); }

/* Add-row affordance — matches the solid primary "+ Add" buttons used
   across the app (Add row, Add traveler, Add Government, Add Subcontractor) */
.oh-row--add { grid-template-columns: 1fr; padding: 10px 16px; }
.oh-add-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px;
  font-size: 12px; font-weight: 600; letter-spacing: .01em;
  border: 1px solid var(--rom-accent, #1a5fb4);
  border-radius: var(--rom-radius, 6px);
  background: var(--rom-accent, #1a5fb4);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  transition: background-color .12s, box-shadow .12s, transform .04s;
  white-space: nowrap;
  font-family: inherit;
}
.oh-add-btn:hover {
  background: var(--rom-accent-dark, #1248a0);
  border-color: var(--rom-accent-dark, #1248a0);
  box-shadow: 0 2px 4px rgba(0,0,0,0.10);
}
.oh-add-btn:active { transform: translateY(1px); box-shadow: 0 1px 1px rgba(0,0,0,0.10); }
.oh-add-btn .ti { font-size: 14px; }

/* "On printed quote" radio options — section-head stays as the navy banner;
   the radio body sits below it inside the white surface of the section */
.oh-display-body {
  display: flex; flex-direction: column; gap: 6px;
  padding: 12px 16px;
}
.oh-display-opt {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 6px 8px; cursor: pointer;
  border: 1px solid transparent;
  border-radius: var(--rom-radius);
  transition: background .12s, border-color .12s;
}
.oh-display-opt:hover { background: var(--rom-surface-alt); }
.oh-display-opt:has(input:checked) {
  background: var(--rom-accent-bg);
  border-color: var(--rom-accent);
}
.oh-display-opt input[type="radio"] {
  margin-top: 2px; cursor: pointer; flex-shrink: 0;
  accent-color: var(--rom-accent-dark);
}
.oh-display-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.oh-display-text strong { font-size: 13px; color: var(--rom-text); font-weight: 600; }
.oh-display-sub { font-size: 12px; color: var(--rom-text-muted); line-height: 1.4; }

.oh-label-wrap { display: flex; align-items: center; }
.oh-label { font-size: 13px; font-weight: 500; color: var(--rom-text); }
.oh-label-input {
  width: 100%;
  font-size: 13px; font-weight: 500;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 3px 6px;
  background: transparent;
  color: var(--rom-text);
}
.oh-label-input:hover { border-color: var(--rom-border); }
.oh-label-input:focus { border-color: var(--rom-accent); outline: none; background: var(--rom-surface); }

.oh-desc { font-size: 12px; color: var(--rom-text-muted); }

.oh-pct-wrap { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
.oh-input {
  border: 1px solid var(--rom-border);
  border-radius: 4px;
  background: var(--rom-surface);
  color: var(--rom-text);
  padding: 3px 5px;
  font-size: 12px;
  text-align: right;
}
.oh-input:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: transparent; }
.oh-input--pct { width: 56px; }
.oh-input--wide { width: 100px; }
.oh-prefix { font-size: 13px; color: var(--rom-text-muted); }
.oh-suffix { font-size: 12px; color: var(--rom-text-muted); }

.oh-computed {
  font-size: 13px; font-weight: 600;
  color: var(--rom-accent);
  text-align: right;
}

/* Totals */
.oh-totals { }
.totals-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px;
  font-size: 13px; color: var(--rom-text-muted);
  border-bottom: 1px solid var(--rom-border);
}
.totals-row:last-child { border-bottom: none; }
.totals-row span:last-child { font-weight: 500; color: var(--rom-text); }
.totals-row--sub {
  background: var(--rom-surface-alt);
  font-weight: 600; color: var(--rom-text);
}
.totals-row--sub span:last-child { color: var(--rom-accent); font-size: 14px; }
.totals-row--grand {
  background: var(--rom-accent-bg);
  font-size: 14px; font-weight: 700; color: var(--rom-accent-dark);
}
.totals-row--grand span:last-child { font-size: 16px; color: var(--rom-accent-dark); }

/* Labor escalation section */
.oh-esc-section { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.oh-esc-label { font-size: 12px; font-weight: 600; color: var(--rom-text-muted); white-space: nowrap; min-width: 110px; }
.oh-esc-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.oh-esc-badge {
  padding: 2px 10px; border-radius: 12px; margin-left: 4px;
  font-size: 11px; font-weight: 700;
  background: #fef3c7; color: #92400e;
  white-space: nowrap;
}
:root[data-theme="dark"] .oh-esc-badge { background: #3a2d12; color: #fac775; }
.oh-esc-num {
  width: 60px; padding: 5px 8px; font-size: 13px; text-align: right; font-family: inherit;
  border: 1px solid var(--rom-border); border-radius: var(--rom-radius);
  background: var(--rom-surface); color: var(--rom-text);
}
.oh-esc-num--sm { width: 48px; }
.oh-esc-num:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: transparent; }
.oh-esc-unit { font-size: 12px; color: var(--rom-text-muted); }
.oh-esc-x { font-size: 14px; font-weight: 300; color: var(--rom-text-faint); }

/* Total % shown in Contract Fee row and summary strip */
.oh-fee-total-pct {
  font-size: 12px; font-weight: 700;
  color: var(--rom-accent-dark);
}
</style>
