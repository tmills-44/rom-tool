<!--
  TEMP-MATERIAL-TAB — this entire file is the temporary Material & Shipping tab.
  When the real workflow lands, delete this file and search the rest of the
  codebase for "TEMP-MATERIAL-TAB" to find every related piece to remove:
    - src/views/MaterialView.vue                  (this file)
    - src/views/AdminView.vue                     (Material Categories editor)
    - src/stores/rom.js                           (categories, mutations, item fields, migration)
    - src/App.vue and rom.TABS                    (tab registration)
    - src/utils/pdfExport.js / excelExport.js / wordExport.js
        — currently NOT touched for the new material fields/categories,
          which keeps the temp work isolated.
-->
<template>
  <div class="material-view">

    <!-- Placeholder notice — this tab is a temporary stand-in while the
         shipping/BOM flow is being designed. Remove once the real workflow
         lands. -->
    <div class="material-placeholder-notice" role="note">
      <i class="ti ti-alert-triangle" aria-hidden="true"></i>
      <div class="material-placeholder-text">
        <strong>Temporary placeholder</strong> — this Material &amp; Shipping tab
        is a work-in-progress stand-in. The full workflow is still being designed.
      </div>
    </div>

    <!-- Baseline template picker — single dropdown at the top of the tab.
         Picking a baseline loads that template's MEL into the active scope.
         "Custom (empty)" wipes the whole tool to start from scratch. -->
    <div class="baseline-picker">
      <label class="baseline-picker-label" for="baseline-template-select">Baseline template:</label>
      <select
        id="baseline-template-select"
        class="baseline-picker-select"
        v-model="baselineDropdownValue"
      >
        <option v-for="t in rom.MATERIAL_TEMPLATES" :key="t.id" :value="t.id">
          {{ t.label }}
        </option>
      </select>
    </div>

    <!-- Summary strip -->
    <div class="summary-strip">
      <div class="summary-card">
        <div class="sc-label">Line Items</div>
        <div class="sc-value">{{ rom.activeMaterialItems.length }}</div>
      </div>
      <div class="summary-card">
        <div class="sc-label">Hardware Subtotal</div>
        <div class="sc-value">{{ fmt(hardwareSubtotal) }}</div>
      </div>
      <div class="summary-card">
        <div class="sc-label">Shipping ({{ rom.material.shippingPct * 100 }}%)</div>
        <div class="sc-value">{{ fmt(shippingAmount) }}</div>
      </div>
      <div class="summary-card highlight">
        <div class="sc-label">Material Total</div>
        <div class="sc-value">{{ fmt(rom.materialTotal) }}</div>
      </div>
    </div>

    <!-- BOM Table — grouped by category -->
    <div class="section-card">
      <div class="section-header">
        <h3>Bill of Materials</h3>
        <div class="section-header-hint">
          Categories are managed in <strong>Admin → Material Categories</strong>
        </div>
      </div>

      <div class="bom-table-wrap">
        <table class="bom-table">
          <thead>
            <tr>
              <th class="col-expand"></th>
              <th class="col-desc">Description</th>
              <th class="col-qty">Qty</th>
              <th class="col-unitmeas">Unit</th>
              <th class="col-unit">Unit Cost</th>
              <th class="col-ext">Extended</th>
              <th class="col-del"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="cat in rom.material.categories" :key="cat.id">
              <!-- Category header row -->
              <tr class="cat-header-row">
                <td :colspan="totalColumns">
                  <div class="cat-header-content">
                    <div class="cat-header-label">
                      <i class="ti ti-folder" aria-hidden="true"></i>
                      <span class="cat-header-name">{{ cat.label }}</span>
                      <span class="cat-header-count">
                        {{ itemsForCategory(cat.id).length }}
                        {{ itemsForCategory(cat.id).length === 1 ? 'item' : 'items' }}
                      </span>
                    </div>
                    <div class="cat-header-right">
                      <span class="cat-header-subtotal">{{ fmt(categorySubtotal(cat.id)) }}</span>
                      <button class="btn-add-row" @click="rom.addMaterialItem(cat.id)">
                        + Add Item
                      </button>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Empty state inside an empty category -->
              <tr v-if="itemsForCategory(cat.id).length === 0" class="cat-empty-row">
                <td :colspan="totalColumns">
                  <em>No items in {{ cat.label }} yet.</em>
                </td>
              </tr>

              <!-- Item rows for this category — each is a bundle parent + an
                   expandable sub-component sub-table inside the same <tr> sequence. -->
              <template v-for="item in itemsForCategory(cat.id)" :key="item.id">
                <tr class="bom-row" :class="{ 'bom-row--expanded': isExpanded(item.id) }">
                  <td class="col-expand">
                    <button
                      class="btn-expand"
                      @click="toggleExpand(item.id)"
                      :title="isExpanded(item.id) ? 'Collapse components' : 'Expand components'"
                      :aria-expanded="isExpanded(item.id)"
                    >
                      <i class="ti" :class="isExpanded(item.id) ? 'ti-chevron-down' : 'ti-chevron-right'" aria-hidden="true"></i>
                    </button>
                  </td>
                  <td class="col-desc">
                    <input
                      class="cell-input desc-input"
                      type="text"
                      :value="item.description"
                      placeholder="Item description…"
                      @input="rom.updateMaterialItem(item.id, { description: $event.target.value })"
                    />
                    <span v-if="item.components?.length" class="component-count">
                      {{ item.components.length }} {{ item.components.length === 1 ? 'part' : 'parts' }}
                    </span>
                  </td>
                  <td class="col-qty">
                    <input
                      class="cell-input num-input"
                      type="number"
                      min="0"
                      :value="item.qty ?? 0"
                      @input="rom.updateMaterialItem(item.id, { qty: parseFloat($event.target.value) || 0 })"
                    />
                  </td>
                  <td class="col-unitmeas">
                    <select
                      class="cell-input"
                      :value="item.unit"
                      @change="rom.updateMaterialItem(item.id, { unit: $event.target.value })"
                    >
                      <option v-for="u in UNIT_OPTIONS" :key="u" :value="u">{{ u }}</option>
                    </select>
                  </td>
                  <td class="col-unit">
                    <!-- If bundled, unit cost is computed (read-only). If flat, editable as before. -->
                    <template v-if="item.components?.length">
                      <div class="bundle-unit-cost" :title="'Auto-summed from ' + item.components.length + ' component(s)'">
                        {{ fmt(rom.bundleUnitCost(item)) }}
                      </div>
                    </template>
                    <template v-else>
                      <div class="dollar-wrap">
                        <span class="dollar-sign">$</span>
                        <input
                          class="cell-input num-input"
                          type="number"
                          min="0"
                          :value="item.unitCost"
                          @input="rom.updateMaterialItem(item.id, { unitCost: parseFloat($event.target.value) || 0 })"
                        />
                      </div>
                    </template>
                  </td>
                  <td class="col-ext">{{ fmt(rom.itemActiveQty(item) * rom.bundleUnitCost(item)) }}</td>
                  <td class="col-del">
                    <button class="btn-del" @click="rom.removeMaterialItem(item.id)" title="Remove">✕</button>
                  </td>
                </tr>

                <!-- Sub-component table — shown when this row is expanded -->
                <tr v-if="isExpanded(item.id)" class="bom-subrow">
                  <td></td>
                  <td :colspan="totalColumns - 1" class="bom-subrow-cell">
                    <div class="components-wrap">
                      <table class="components-table">
                        <thead>
                          <tr>
                            <th class="ccol-part">Part #</th>
                            <th class="ccol-desc">Description</th>
                            <th class="ccol-mfr">Manufacturer</th>
                            <th class="ccol-qpu">Qty / unit</th>
                            <th class="ccol-price">Unit Price</th>
                            <th class="ccol-sub">Per-bundle</th>
                            <th class="ccol-tot">Total ({{ rom.material.activeTemplate }})</th>
                            <th class="ccol-del"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-if="!item.components?.length" class="components-empty">
                            <td colspan="8">
                              No components yet. The parent uses the flat Unit Cost field. Click <strong>+ Add component</strong> below to switch to a bundled BOM.
                            </td>
                          </tr>
                          <tr v-for="cp in item.components" :key="cp.id" class="component-row">
                            <td class="ccol-part">
                              <input class="cell-input mono-input" type="text"
                                :value="cp.partNumber" placeholder="Part #"
                                @input="rom.updateMaterialComponent(item.id, cp.id, { partNumber: $event.target.value })" />
                            </td>
                            <td class="ccol-desc">
                              <input class="cell-input" type="text"
                                :value="cp.description" placeholder="Description"
                                @input="rom.updateMaterialComponent(item.id, cp.id, { description: $event.target.value })" />
                            </td>
                            <td class="ccol-mfr">
                              <input class="cell-input" type="text"
                                :value="cp.manufacturer" placeholder="Manufacturer"
                                @input="rom.updateMaterialComponent(item.id, cp.id, { manufacturer: $event.target.value })" />
                            </td>
                            <td class="ccol-qpu">
                              <input class="cell-input num-input" type="number" min="0" step="0.25"
                                :value="cp.qtyPerUnit"
                                @input="rom.updateMaterialComponent(item.id, cp.id, { qtyPerUnit: parseFloat($event.target.value) || 0 })" />
                            </td>
                            <td class="ccol-price">
                              <div class="dollar-wrap">
                                <span class="dollar-sign">$</span>
                                <input class="cell-input num-input" type="number" min="0"
                                  :value="cp.unitPrice"
                                  @input="rom.updateMaterialComponent(item.id, cp.id, { unitPrice: parseFloat($event.target.value) || 0 })" />
                              </div>
                            </td>
                            <td class="ccol-sub mono-cell">{{ fmt((cp.qtyPerUnit || 0) * (cp.unitPrice || 0)) }}</td>
                            <td class="ccol-tot mono-cell">{{ fmt(rom.itemActiveQty(item) * (cp.qtyPerUnit || 0) * (cp.unitPrice || 0)) }}</td>
                            <td class="ccol-del">
                              <button class="btn-del" @click="rom.removeMaterialComponent(item.id, cp.id)" title="Remove component">✕</button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <button class="btn-add-row btn-add-component" @click="rom.addMaterialComponent(item.id)">
                        + Add component
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </template>

            <!-- Whole-tab empty state if no items at all -->
            <tr v-if="rom.activeMaterialItems.length === 0 && allCatsEmpty" class="empty-row-wrap">
              <td :colspan="totalColumns" class="empty-row">
                <div class="empty-cta">
                  <div>No items in this scope yet.</div>
                  <div class="empty-hint">
                    Pick a class above (<strong>A · Huddle</strong>, <strong>B · Classroom</strong>,
                    <strong>C · Conference</strong>, <strong>D · Operations</strong>) to load a MEL,
                    or click <strong>+ Add Item</strong> in any category to start manually.
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="rom.activeMaterialItems.length > 0">
            <tr class="subtotal-row">
              <td :colspan="totalColumns - 2">Hardware Subtotal</td>
              <td>{{ fmt(hardwareSubtotal) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Shipping section -->
    <div class="section-card shipping-card">
      <div class="section-header">
        <h3>Shipping &amp; Freight</h3>
      </div>
      <div class="shipping-row">
        <label class="ship-label">Shipping markup (% of hardware)</label>
        <div class="pct-wrap">
          <input
            class="pct-input"
            type="number"
            min="0"
            max="100"
            step="0.5"
            :value="(rom.material.shippingPct * 100).toFixed(1)"
            @input="rom.material.shippingPct = (parseFloat($event.target.value) || 0) / 100"
          />
          <span class="pct-sign">%</span>
        </div>
        <div class="ship-calc">
          {{ fmt(hardwareSubtotal) }} × {{ (rom.material.shippingPct * 100).toFixed(1) }}% = <strong>{{ fmt(shippingAmount) }}</strong>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRomStore } from '../stores/rom'

const rom = useRomStore()

// Unit-of-measure dropdown options
const UNIT_OPTIONS = ['ea', 'ft', 'm', 'ft²', 'm²', 'lot', 'set', 'kit', 'pkg', 'hr']

// Total column count for colspan use in category-header / empty / subtotal rows.
// 1 expand chevron + 1 description + 1 qty + 3 (unit/unit-cost/extended) + 1 delete.
const totalColumns = computed(() => 7)

// Track which parent rows have their sub-component table expanded.
const expandedItemIds = ref(new Set())
function isExpanded(id)   { return expandedItemIds.value.has(id) }
function toggleExpand(id) {
  const s = new Set(expandedItemIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expandedItemIds.value = s
}

const hardwareSubtotal = computed(() =>
  rom.activeMaterialItems.reduce((s, i) => s + rom.itemActiveQty(i) * rom.bundleUnitCost(i), 0)
)

const shippingAmount = computed(() =>
  hardwareSubtotal.value * (rom.material.shippingPct || 0)
)

// Filter active scope's items down to a single category
function itemsForCategory(catId) {
  return rom.activeMaterialItems.filter(it => (it.categoryId || rom.material.categories[0]?.id) === catId)
}

// Per-category subtotal of unloaded hardware cost — uses the active template & bundle pricing
function categorySubtotal(catId) {
  return itemsForCategory(catId).reduce((s, i) => s + rom.itemActiveQty(i) * rom.bundleUnitCost(i), 0)
}

// True when every category has zero items in it (used for the whole-tab empty state)
const allCatsEmpty = computed(() =>
  rom.material.categories.every(c => itemsForCategory(c.id).length === 0)
)

function fmt(n) {
  return '$' + Math.round(n || 0).toLocaleString()
}

// v-model binding for the baseline-template dropdown. Getter returns the
// store's active template id; setter routes through pickClass which gates
// destructive actions behind confirm() dialogs. If the user cancels, the
// setter doesn't update the store, so the next render syncs the <select>
// back to the previous value automatically.
const baselineDropdownValue = computed({
  get: () => rom.material.activeTemplate,
  set: (newId) => {
    const t = rom.MATERIAL_TEMPLATES.find(t => t.id === newId)
    pickClass(t)
  },
})

// Handler invoked by the dropdown setter. Picking a class (A-D) loads
// that class's MEL into the active scope. Picking "Custom (empty)" wipes
// the WHOLE TOOL (every scope's BOM, engineering, travel, project info,
// overhead) — effectively a "start from scratch" button.
function pickClass(t) {
  if (!t || t.id === rom.material.activeTemplate) return  // no-op
  if (t.id === 'X') {
    if (!confirm(
      "START FROM SCRATCH?\n\n" +
      "This RESETS THE ENTIRE TOOL — all Project info, ALL Engineering line items, ALL Travel trips, ALL Material BOMs, Overhead settings, AND wipes all custom scopes (resets to a single 'Scope 1 — Primary').\n\n" +
      "Configuration (rates, WBS templates, material categories) is preserved.\n\n" +
      "This cannot be undone. Continue?"
    )) return  // computed setter no-ops → dropdown reverts on next render
    rom.resetAll()
    rom.setActiveMaterialTemplate('X')
    return
  }
  // Class A-D: replace the current scope's MEL with that class's bundles
  const cnt = rom.activeMaterialItems.length
  if (cnt > 0) {
    if (!confirm(
      `REPLACE the ${cnt} item${cnt === 1 ? '' : 's'} in this scope with the "${t.label}" MEL?`
    )) return
  }
  rom.loadMELForClass(t.id)
}
</script>

<style scoped>
.material-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Temporary placeholder notice at top of tab */
.material-placeholder-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fff6e0;
  border: 1px solid #f0b95a;
  border-left: 4px solid #d97706;
  border-radius: 6px;
  color: #6b4708;
  font-size: 13px;
  line-height: 1.4;
}
.material-placeholder-notice .ti {
  font-size: 20px;
  color: #d97706;
  flex-shrink: 0;
}
.material-placeholder-text {
  flex: 1;
}
.material-placeholder-text strong {
  font-weight: 700;
}
:root[data-theme="dark"] .material-placeholder-notice {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(240, 185, 90, 0.5);
  border-left-color: #f59e0b;
  color: #fbd28a;
}
:root[data-theme="dark"] .material-placeholder-notice .ti {
  color: #f59e0b;
}

/* Summary strip */
.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.summary-card {
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: 8px;
  padding: 14px 16px;
  text-align: center;
}
.summary-card.highlight {
  background: var(--rom-accent-bg);
  border-color: var(--rom-accent);
}
.sc-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--rom-text-muted);
  margin-bottom: 6px;
}
.sc-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--rom-text);
}
.summary-card.highlight .sc-value {
  color: var(--rom-accent);
}

/* Section card */
.section-card {
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: 10px;
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--rom-border);
  background: var(--rom-surface-alt);
}
.section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--rom-accent);
}

/* Baseline picker — slim dropdown row at the top of the tab */
.baseline-picker {
  display: flex;
  align-items: center;
  gap: 10px;
}
.baseline-picker-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--rom-text-muted);
  letter-spacing: 0.02em;
}
.baseline-picker-select {
  min-width: 220px;
  padding: 7px 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--rom-text);
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color .12s, box-shadow .12s;
}
.baseline-picker-select:hover  { border-color: var(--rom-accent); }
.baseline-picker-select:focus  { outline: none; border-color: var(--rom-accent); box-shadow: 0 0 0 2px var(--rom-accent-bg); }

/* Section header right side — categories hint */
.section-header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.section-header-hint {
  font-size: 12px;
  color: var(--rom-text-muted);
}
.section-header-hint strong {
  color: var(--rom-text);
  font-weight: 600;
}

/* Empty-state CTA wrapper */
.empty-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 0;
}
.empty-cta > div:first-child {
  font-size: 14px;
  color: var(--rom-text-muted);
}
.empty-hint {
  font-size: 11px;
  color: var(--rom-text-faint);
}

/* Add button */
.btn-add {
  background: var(--rom-accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.btn-add:hover { background: var(--rom-accent-dark); }

/* Smaller add button used inside the category-header row */
.btn-add-row {
  background: transparent;
  color: var(--rom-accent);
  border: 1px solid var(--rom-accent);
  border-radius: 5px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.btn-add-row:hover {
  background: var(--rom-accent);
  color: #fff;
}

/* Category header row inside the BOM table */
.cat-header-row td {
  background: var(--rom-surface-alt);
  border-top: 2px solid var(--rom-border);
  border-bottom: 1px solid var(--rom-border);
  padding: 8px 12px;
}
.cat-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.cat-header-label {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cat-header-label .ti {
  color: var(--rom-text-muted);
  font-size: 14px;
}
.cat-header-name {
  font-weight: 700;
  font-size: 13px;
  color: var(--rom-text);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.cat-header-count {
  font-size: 11px;
  color: var(--rom-text-muted);
  background: var(--rom-bg);
  padding: 1px 8px;
  border-radius: 10px;
}
.cat-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cat-header-subtotal {
  font-size: 13px;
  font-weight: 700;
  color: var(--rom-accent);
  font-variant-numeric: tabular-nums;
}

/* Empty-state row INSIDE an empty category */
.cat-empty-row td {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--rom-text-faint);
  text-align: center;
  background: transparent;
}

/* BOM table */
.bom-table-wrap {
  overflow-x: auto;
}
.bom-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.bom-table thead tr {
  background: var(--rom-surface-alt);
  border-bottom: 1px solid var(--rom-border);
}
.bom-table th {
  padding: 9px 12px;
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--rom-text-muted);
  font-weight: 600;
}
.bom-table th.col-ext,
.bom-table td.col-ext { text-align: right; }
.bom-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--rom-border);
  color: var(--rom-text);
}
.bom-row:hover td { background: var(--rom-surface-alt); }

/* Column widths */
.col-expand   { width: 28px; text-align: center; }
.col-desc     { width: auto; min-width: 240px; }
.col-qty      { width: 80px; text-align: center; }
.col-unitmeas { width: 70px; }
.col-unit     { width: 130px; }
.col-ext      { width: 130px; font-weight: 600; }
.col-del      { width: 36px; text-align: center; }

/* Inputs */
.cell-input {
  border: 1px solid var(--rom-border);
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 13px;
  color: var(--rom-text);
  background: var(--rom-surface);
  width: 100%;
  box-sizing: border-box;
  transition: border-color .15s, box-shadow .15s;
}
.cell-input:focus {
  outline: none;
  border-color: var(--rom-accent);
  box-shadow: 0 0 0 2px var(--rom-accent-bg);
}
.num-input { text-align: right; }
.desc-input { text-align: left; }

.dollar-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}
.dollar-sign {
  color: var(--rom-text-muted);
  font-size: 13px;
  flex-shrink: 0;
}

/* Delete button */
.btn-del {
  background: none;
  border: none;
  color: #c33;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background .15s, color .15s;
}
.btn-del:hover { background: rgba(204, 51, 51, 0.12); color: #a22; }
:root[data-theme="dark"] .btn-del { color: #ff8888; }
:root[data-theme="dark"] .btn-del:hover { background: rgba(255, 100, 100, 0.18); color: #ffaaaa; }

/* Empty row */
.empty-row {
  text-align: center;
  color: var(--rom-text-muted);
  padding: 32px 0 !important;
  font-size: 13px;
}

/* Subtotal footer row */
.subtotal-row td {
  background: var(--rom-accent-bg);
  font-weight: 700;
  color: var(--rom-accent);
  border-top: 2px solid var(--rom-accent);
  padding: 8px 12px;
}
.subtotal-row td:nth-child(4) { text-align: right; }

/* Shipping card */
.shipping-card .section-header { border-bottom: none; }
.shipping-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px 18px;
  flex-wrap: wrap;
}
.ship-label {
  font-size: 13px;
  color: var(--rom-text);
  font-weight: 500;
  flex-shrink: 0;
}
.pct-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pct-input {
  width: 70px;
  border: 1px solid var(--rom-border);
  border-radius: 5px;
  padding: 6px 8px;
  font-size: 13px;
  text-align: right;
  color: var(--rom-text);
  background: var(--rom-surface);
  transition: border-color .15s, box-shadow .15s;
}
.pct-input:focus {
  outline: none;
  border-color: var(--rom-accent);
  box-shadow: 0 0 0 2px var(--rom-accent-bg);
}
.pct-sign {
  color: var(--rom-text-muted);
  font-size: 13px;
}
.ship-calc {
  font-size: 13px;
  color: var(--rom-text-muted);
  margin-left: auto;
}
.ship-calc strong {
  color: var(--rom-accent);
  font-weight: 700;
}

@media (max-width: 640px) {
  .summary-strip { grid-template-columns: repeat(2, 1fr); }
}

/* ── Bundle / expand / component sub-table ────────────────────────────── */

/* Expand chevron in the leftmost column of each parent row */
.btn-expand {
  background: transparent;
  border: none;
  color: var(--rom-text-muted);
  cursor: pointer;
  width: 22px; height: 22px;
  border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background .1s, color .1s;
}
.btn-expand:hover { background: var(--rom-surface-alt); color: var(--rom-text); }
.btn-expand .ti { font-size: 14px; }

.bom-row--expanded > td { background: var(--rom-accent-bg); }
.bom-row--expanded .btn-expand { color: var(--rom-accent); }

/* Pill showing "N parts" next to the description on a bundled row */
.component-count {
  display: inline-block;
  margin-left: 8px;
  font-size: 10px;
  font-weight: 600;
  color: var(--rom-text-muted);
  background: var(--rom-bg);
  padding: 1px 8px;
  border-radius: 10px;
  vertical-align: middle;
}

/* Unit-cost read-only display when row is bundled */
.bundle-unit-cost {
  font-weight: 700;
  color: var(--rom-text);
  text-align: right;
  padding: 5px 8px;
  background: var(--rom-bg);
  border-radius: 5px;
  font-variant-numeric: tabular-nums;
  cursor: help;
}

/* Sub-component table container — sits inside the table inside an expanded row */
.bom-subrow > td { padding: 0; background: var(--rom-bg); }
.bom-subrow-cell {
  padding: 12px 14px 14px !important;
  border-bottom: 1px solid var(--rom-border) !important;
}
.components-wrap {
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: 8px;
  padding: 10px 12px;
}
.components-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.components-table thead tr {
  border-bottom: 1px solid var(--rom-border);
}
.components-table th {
  padding: 6px 8px;
  text-align: left;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--rom-text-muted);
  font-weight: 600;
}
.components-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--rom-border);
  color: var(--rom-text);
  vertical-align: middle;
}
.component-row:hover td { background: var(--rom-surface-alt); }

/* Sub-table column widths */
.ccol-part   { width: 130px; }
.ccol-desc   { width: auto; min-width: 240px; }
.ccol-mfr    { width: 130px; }
.ccol-qpu    { width: 80px;  text-align: right; }
.ccol-price  { width: 110px; }
.ccol-sub    { width: 100px; text-align: right; font-weight: 600; }
.ccol-tot    { width: 110px; text-align: right; font-weight: 700; color: var(--rom-accent); }
.ccol-del    { width: 32px;  text-align: center; }

/* Monospace inputs / cells for parts and numbers */
.mono-input { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
.mono-cell  { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }

.components-empty td {
  text-align: center;
  font-size: 12px;
  color: var(--rom-text-faint);
  padding: 14px 0;
}

.btn-add-component {
  margin-top: 10px;
}
</style>
