<template>
  <div class="material-view">

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

    <!-- BOM Table -->
    <div class="section-card">
      <div class="section-header">
        <h3>Bill of Materials</h3>
        <button class="btn-add" @click="addItem">+ Add Item</button>
      </div>

      <div class="bom-table-wrap">
        <table class="bom-table">
          <thead>
            <tr>
              <th class="col-desc">Description</th>
              <th class="col-qty">Qty</th>
              <th class="col-unit">Unit Cost</th>
              <th class="col-ext">Extended</th>
              <th class="col-del"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rom.activeMaterialItems.length === 0">
              <td colspan="5" class="empty-row">No items yet — click <strong>+ Add Item</strong> to begin.</td>
            </tr>
            <tr v-for="item in rom.activeMaterialItems" :key="item.id" class="bom-row">
              <td class="col-desc">
                <input
                  class="cell-input desc-input"
                  type="text"
                  :value="item.description"
                  placeholder="Item description…"
                  @input="rom.updateMaterialItem(item.id, { description: $event.target.value })"
                />
              </td>
              <td class="col-qty">
                <input
                  class="cell-input num-input"
                  type="number"
                  min="0"
                  :value="item.qty"
                  @input="rom.updateMaterialItem(item.id, { qty: parseFloat($event.target.value) || 0 })"
                />
              </td>
              <td class="col-unit">
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
              </td>
              <td class="col-ext">{{ fmt(item.qty * item.unitCost) }}</td>
              <td class="col-del">
                <button class="btn-del" @click="rom.removeMaterialItem(item.id)" title="Remove">✕</button>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="rom.activeMaterialItems.length > 0">
            <tr class="subtotal-row">
              <td colspan="3">Hardware Subtotal</td>
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
import { computed } from 'vue'
import { useRomStore } from '../stores/rom'

const rom = useRomStore()

const hardwareSubtotal = computed(() =>
  rom.activeMaterialItems.reduce((s, i) => s + (i.qty || 0) * (i.unitCost || 0), 0)
)

const shippingAmount = computed(() =>
  hardwareSubtotal.value * (rom.material.shippingPct || 0)
)

function fmt(n) {
  return '$' + Math.round(n || 0).toLocaleString()
}

function addItem() {
  rom.addMaterialItem()
}
</script>

<style scoped>
.material-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Summary strip */
.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.summary-card {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  padding: 14px 16px;
  text-align: center;
}
.summary-card.highlight {
  background: var(--accent-light, #ebf2ff);
  border-color: var(--accent, #1a5fb4);
}
.sc-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--muted, #64748b);
  margin-bottom: 6px;
}
.sc-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text, #1a2133);
}
.summary-card.highlight .sc-value {
  color: var(--accent, #1a5fb4);
}

/* Section card */
.section-card {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  background: var(--header-bg, #f8fafc);
}
.section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--navy, #1a3560);
}

/* Add button */
.btn-add {
  background: var(--accent, #1a5fb4);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.btn-add:hover { background: var(--accent-dark, #1449a0); }

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
  background: var(--header-bg, #f8fafc);
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.bom-table th {
  padding: 9px 12px;
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--muted, #64748b);
  font-weight: 600;
}
.bom-table th.col-ext,
.bom-table td.col-ext { text-align: right; }
.bom-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-light, #f1f5f9);
  color: var(--text, #1a2133);
}
.bom-row:hover td { background: var(--row-hover, #f8fafc); }

/* Column widths */
.col-desc  { width: auto; min-width: 220px; }
.col-qty   { width: 80px; }
.col-unit  { width: 140px; }
.col-ext   { width: 120px; font-weight: 600; }
.col-del   { width: 40px; text-align: center; }

/* Inputs */
.cell-input {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 13px;
  color: var(--text, #1a2133);
  background: var(--input-bg, #fff);
  width: 100%;
  box-sizing: border-box;
  transition: border-color .15s;
}
.cell-input:focus {
  outline: none;
  border-color: var(--accent, #1a5fb4);
  box-shadow: 0 0 0 2px rgba(26,95,180,.15);
}
.num-input { text-align: right; }
.desc-input { text-align: left; }

.dollar-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}
.dollar-sign {
  color: var(--muted, #64748b);
  font-size: 13px;
  flex-shrink: 0;
}

/* Delete button */
.btn-del {
  background: none;
  border: none;
  color: var(--danger, #e53e3e);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background .15s;
}
.btn-del:hover { background: var(--danger-light, #fff5f5); }

/* Empty row */
.empty-row {
  text-align: center;
  color: var(--muted, #64748b);
  padding: 32px 0 !important;
  font-size: 13px;
}

/* Subtotal footer row */
.subtotal-row td {
  background: var(--accent-light, #ebf2ff);
  font-weight: 700;
  color: var(--navy, #1a3560);
  border-top: 2px solid var(--accent, #1a5fb4);
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
  color: var(--text, #1a2133);
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
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 5px;
  padding: 6px 8px;
  font-size: 13px;
  text-align: right;
  color: var(--text, #1a2133);
  background: var(--input-bg, #fff);
  transition: border-color .15s;
}
.pct-input:focus {
  outline: none;
  border-color: var(--accent, #1a5fb4);
  box-shadow: 0 0 0 2px rgba(26,95,180,.15);
}
.pct-sign {
  color: var(--muted, #64748b);
  font-size: 13px;
}
.ship-calc {
  font-size: 13px;
  color: var(--muted, #64748b);
  margin-left: auto;
}
.ship-calc strong {
  color: var(--accent, #1a5fb4);
  font-weight: 700;
}

@media (max-width: 640px) {
  .summary-strip { grid-template-columns: repeat(2, 1fr); }
}
</style>
