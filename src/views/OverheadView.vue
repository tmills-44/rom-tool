<template>
  <div class="overhead-view">

    <!-- Summary strip -->
    <div class="summary-strip">
      <div class="summary-card">
        <div class="summary-label">Unloaded Total</div>
        <div class="summary-value">{{ fmt(rom.unloadedProjectTotal) }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Contract Fee</div>
        <div class="summary-value">{{ fmt(rom.contractFee) }}</div>
      </div>
      <div class="summary-card summary-card--accent">
        <div class="summary-label">Grand Total (Loaded)</div>
        <div class="summary-value">{{ fmt(rom.totalLoadedCost) }}</div>
      </div>
    </div>

    <div class="oh-body">

      <!-- Master toggle: turn off all overhead for this scope at once -->
      <div class="oh-section oh-master">
        <label class="oh-master-toggle">
          <input type="checkbox"
            :checked="rom.overhead.overheadEnabled"
            @change="rom.overhead.overheadEnabled = $event.target.checked" />
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
              @change="rom.overhead.showLineItems = true" />
            <span class="oh-display-text">
              <strong>Show all line items for contract fee</strong>
              <span class="oh-display-sub">Each overhead row appears on the printed PDF / Excel / Word with its own dollar amount.</span>
            </span>
          </label>
          <label class="oh-display-opt">
            <input type="radio" name="oh-display"
              :checked="rom.overhead.showLineItems === false"
              @change="rom.overhead.showLineItems = false" />
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
          Overhead items
          <span class="oh-section-note">% of Unloaded Project Total · tick each to include in Contract Fee</span>
        </div>

        <div v-for="(item, idx) in (rom.overhead.items || [])" :key="item.id" class="oh-row">
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
          <div class="oh-label-wrap"><strong class="oh-fee-label">Contract Fee</strong></div>
          <div class="oh-pct-wrap"><span class="oh-fee-hint">sum of ticked items</span></div>
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
import { useRomStore } from '../stores/rom'
const rom = useRomStore()
function fmt(n) { return '$' + Math.round(n || 0).toLocaleString() }
function pctDisplay(v) { return ((v || 0) * 100).toFixed(1) }

// Cost of one overhead item — accounts for master toggle, per-item enable,
// and the item's base (unloaded vs unloaded + overhead).
function computeItemCost(item) {
  if (!rom.overhead?.overheadEnabled || !item.enabled) return 0
  if (item.base === 'unloaded') {
    return rom.unloadedProjectTotal * (item.pct || 0)
  }
  if (item.base === 'withOverhead') {
    return rom.projectWithOverhead * (item.pct || 0)
  }
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
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid var(--rom-border);
  background: var(--rom-surface);
}
.summary-card {
  padding: 12px 20px;
  border-right: 1px solid var(--rom-border);
}
.summary-card:last-child { border-right: none; }
.summary-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--rom-text-muted); margin-bottom: 3px; }
.summary-value { font-size: 20px; font-weight: 500; }
.summary-card--accent { background: var(--rom-accent-bg); }
.summary-card--accent .summary-label { color: var(--rom-accent-dark); opacity: .8; }
.summary-card--accent .summary-value { color: var(--rom-accent-dark); }

/* Body */
.oh-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 860px;
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

/* Rows — checkbox, label, percent, base, computed amount, delete */
.oh-row {
  display: grid;
  grid-template-columns: 22px 1fr 110px 160px 120px 32px;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--rom-border);
}
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

/* Contract Fee summary row */
.oh-row--fee {
  background: var(--rom-header-bg) !important;
  border-top: 2px solid var(--rom-accent);
  padding-top: 14px; padding-bottom: 14px;
}
.oh-row--fee:hover { background: var(--rom-header-bg) !important; }
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

/* Add-row affordance */
.oh-row--add { grid-template-columns: 1fr; padding: 10px 16px; }
.oh-add-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px;
  font-size: 12px; font-weight: 600;
  border: 1px dashed var(--rom-accent);
  border-radius: var(--rom-radius, 6px);
  background: transparent; color: var(--rom-accent);
  cursor: pointer; font-family: inherit;
}
.oh-add-btn:hover { background: var(--rom-accent-bg); }
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
  padding: 4px 6px;
  font-size: 13px;
  text-align: right;
}
.oh-input:focus { outline: 2px solid var(--rom-accent); outline-offset: -1px; border-color: transparent; }
.oh-input--pct { width: 64px; }
.oh-input--wide { width: 130px; }
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
</style>
