<template>
  <div class="overhead-view">

    <!-- Summary strip -->
    <div class="summary-strip">
      <div class="summary-card">
        <div class="summary-label">Unloaded Total</div>
        <div class="summary-value">{{ fmt(rom.unloadedProjectTotal) }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Overhead</div>
        <div class="summary-value">{{ fmt(rom.totalOverhead) }}</div>
      </div>
      <div class="summary-card summary-card--accent">
        <div class="summary-label">Grand Total (Loaded)</div>
        <div class="summary-value">{{ fmt(rom.totalLoadedCost) }}</div>
      </div>
    </div>

    <div class="oh-body">

      <!-- FY Funds input -->
      <div class="oh-section">
        <div class="oh-section-head">Program Reference</div>
        <div class="oh-row">
          <div class="oh-label">Anticipated FY Funds</div>
          <div class="oh-desc">Base used to calculate SCP, Global, and Gov Labor costs</div>
          <div class="oh-input-wrap">
            <span class="oh-prefix">$</span>
            <input
              type="number" min="0" step="10000"
              :value="rom.project.anticipatedFYFunds"
              @input="rom.project.anticipatedFYFunds = +$event.target.value"
              class="oh-input oh-input--wide"
            />
          </div>
        </div>
      </div>

      <!-- Program overhead items (% of FY Funds) -->
      <div class="oh-section">
        <div class="oh-section-head">Program Overhead <span class="oh-section-note">% of Anticipated FY Funds</span></div>

        <div class="oh-row">
          <div class="oh-label-wrap">
            <input type="text" :value="rom.overhead.scpLabel" @input="rom.overhead.scpLabel = $event.target.value" class="oh-label-input" />
          </div>
          <div class="oh-desc">SCP / PM Financial Support</div>
          <div class="oh-pct-wrap">
            <input
              type="number" min="0" max="100" step="0.1"
              :value="pctDisplay(rom.overhead.scpPct)"
              @input="rom.overhead.scpPct = +$event.target.value / 100"
              class="oh-input oh-input--pct"
            />
            <span class="oh-suffix">%</span>
          </div>
          <div class="oh-computed">{{ fmt(rom.scpCost) }}</div>
        </div>

        <div class="oh-row">
          <div class="oh-label-wrap">
            <input type="text" :value="rom.overhead.globalLabel" @input="rom.overhead.globalLabel = $event.target.value" class="oh-label-input" />
          </div>
          <div class="oh-desc">Global program overhead</div>
          <div class="oh-pct-wrap">
            <input
              type="number" min="0" max="100" step="0.1"
              :value="pctDisplay(rom.overhead.globalPct)"
              @input="rom.overhead.globalPct = +$event.target.value / 100"
              class="oh-input oh-input--pct"
            />
            <span class="oh-suffix">%</span>
          </div>
          <div class="oh-computed">{{ fmt(rom.globalCost) }}</div>
        </div>

        <div class="oh-row">
          <div class="oh-label-wrap">
            <input type="text" :value="rom.overhead.govLaborLabel" @input="rom.overhead.govLaborLabel = $event.target.value" class="oh-label-input" />
          </div>
          <div class="oh-desc">Government PM Labor</div>
          <div class="oh-pct-wrap">
            <input
              type="number" min="0" max="100" step="0.1"
              :value="pctDisplay(rom.overhead.govLaborPct)"
              @input="rom.overhead.govLaborPct = +$event.target.value / 100"
              class="oh-input oh-input--pct"
            />
            <span class="oh-suffix">%</span>
          </div>
          <div class="oh-computed">{{ fmt(rom.govLaborCost) }}</div>
        </div>
      </div>

      <!-- Project-based overhead (% of unloaded total) -->
      <div class="oh-section">
        <div class="oh-section-head">Project Overhead <span class="oh-section-note">% of Unloaded Project Total</span></div>

        <div class="oh-row">
          <div class="oh-label-wrap">
            <span class="oh-label">Management Reserve</span>
          </div>
          <div class="oh-desc">Buffer for scope creep / unforeseen costs</div>
          <div class="oh-pct-wrap">
            <input
              type="number" min="0" max="100" step="0.1"
              :value="pctDisplay(rom.overhead.managementReservePct)"
              @input="rom.overhead.managementReservePct = +$event.target.value / 100"
              class="oh-input oh-input--pct"
            />
            <span class="oh-suffix">%</span>
          </div>
          <div class="oh-computed">{{ fmt(rom.managementReserveCost) }}</div>
        </div>
      </div>

      <!-- SCR (% of subtotal with overhead) -->
      <div class="oh-section">
        <div class="oh-section-head">SCR <span class="oh-section-note">% of (Unloaded + Program Overhead)</span></div>

        <div class="oh-row">
          <div class="oh-label-wrap">
            <span class="oh-label">Support Cost Rate (SCR)</span>
          </div>
          <div class="oh-desc">Applied to project + overhead subtotal</div>
          <div class="oh-pct-wrap">
            <input
              type="number" min="0" max="100" step="0.1"
              :value="pctDisplay(rom.overhead.scrPct)"
              @input="rom.overhead.scrPct = +$event.target.value / 100"
              class="oh-input oh-input--pct"
            />
            <span class="oh-suffix">%</span>
          </div>
          <div class="oh-computed">{{ fmt(rom.scrCost) }}</div>
        </div>
      </div>

      <!-- Totals table -->
      <div class="oh-section oh-totals">
        <div class="totals-row">
          <span>Engineering Labor</span>
          <span>{{ fmt(rom.engineeringTotal) }}</span>
        </div>
        <div class="totals-row">
          <span>Travel</span>
          <span>{{ fmt(rom.travelTotal) }}</span>
        </div>
        <div class="totals-row">
          <span>Material &amp; Shipping</span>
          <span>{{ fmt(rom.materialTotal) }}</span>
        </div>
        <div class="totals-row totals-row--sub">
          <span>Unloaded Total</span>
          <span>{{ fmt(rom.unloadedProjectTotal) }}</span>
        </div>
        <div class="totals-row">
          <span>{{ rom.overhead.scpLabel }}</span>
          <span>{{ fmt(rom.scpCost) }}</span>
        </div>
        <div class="totals-row" v-if="rom.overhead.globalPct > 0">
          <span>{{ rom.overhead.globalLabel }}</span>
          <span>{{ fmt(rom.globalCost) }}</span>
        </div>
        <div class="totals-row">
          <span>{{ rom.overhead.govLaborLabel }}</span>
          <span>{{ fmt(rom.govLaborCost) }}</span>
        </div>
        <div class="totals-row">
          <span>Management Reserve</span>
          <span>{{ fmt(rom.managementReserveCost) }}</span>
        </div>
        <div class="totals-row">
          <span>SCR</span>
          <span>{{ fmt(rom.scrCost) }}</span>
        </div>
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

/* Rows */
.oh-row {
  display: grid;
  grid-template-columns: 220px 1fr 120px 110px;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--rom-border);
}
.oh-row:last-child { border-bottom: none; }
.oh-row:hover { background: var(--rom-surface-alt); }

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
