<template>
  <div class="stub-view">
    <header class="stub-header">
      <div>
        <h2 class="stub-title">{{ title }}</h2>
        <div class="stub-sub">{{ subtitle }}</div>
      </div>
      <div class="stub-totals">
        <span class="stub-total-label">Tab total</span>
        <span class="stub-total-value">{{ fmt(total) }}</span>
      </div>
    </header>

    <div class="stub-body">
      <i class="ti ti-tools-off stub-icon"></i>
      <h3>Coming next</h3>
      <p>{{ blurb }}</p>
      <p class="stub-note">
        The data model and totals already work — try adding lines on the Engineering tab and you'll see
        this tab's total update once it's wired up.
      </p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  blurb: { type: String, default: '' },
  total: { type: Number, default: 0 },
})

function fmt(n) {
  return '$' + Math.round(n || 0).toLocaleString()
}
</script>

<style scoped>
.stub-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.stub-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 0.5px solid var(--rom-border, #d8d6cd);
}
.stub-title {
  font-size: 20px;
  font-weight: 500;
  margin: 0 0 4px 0;
  color: var(--rom-text, #1a1a1a);
}
.stub-sub { font-size: 12px; color: var(--rom-text-muted, #6f6f6a); }
.stub-totals { text-align: right; }
.stub-total-label {
  display: block;
  font-size: 11px;
  color: var(--rom-text-muted, #6f6f6a);
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}
.stub-total-value {
  font-size: 20px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--rom-text, #1a1a1a);
}

.stub-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 22px;
  text-align: center;
  color: var(--rom-text-muted, #6f6f6a);
}
.stub-icon {
  font-size: 48px;
  color: var(--rom-text-faint, #b4b2a9);
  margin-bottom: 12px;
}
.stub-body h3 {
  font-size: 16px;
  font-weight: 500;
  color: var(--rom-text, #1a1a1a);
  margin: 0 0 8px 0;
}
.stub-body p { font-size: 13px; max-width: 480px; line-height: 1.6; margin: 4px 0; }
.stub-note {
  margin-top: 20px;
  padding: 12px 16px;
  background: var(--rom-surface-alt, #f7f5ee);
  border-radius: 8px;
  font-size: 12px;
}
</style>
