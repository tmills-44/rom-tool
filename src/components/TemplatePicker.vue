<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-labelledby="picker-title">
      <header class="modal-head">
        <div>
          <h3 id="picker-title">Start a new quote</h3>
          <p class="modal-sub">Pick a template to begin — you can edit any line once it's loaded.</p>
        </div>
        <button v-if="canDismiss" class="close-btn" @click="$emit('close')" aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
      </header>

      <div class="template-grid">
        <button
          v-for="tmpl in rom.TEMPLATES"
          :key="tmpl.id"
          class="template-card"
          @click="pick(tmpl.id)"
        >
          <i class="ti template-icon" :class="iconFor(tmpl.id)"></i>
          <div class="template-name">{{ tmpl.name }}</div>
          <div class="template-desc">{{ tmpl.description }}</div>
        </button>
      </div>

      <footer class="modal-foot">
        <span class="footer-hint">Templates can be saved and edited from the Settings menu (coming soon).</span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { useRomStore } from '../stores/rom'

const props = defineProps({
  canDismiss: { type: Boolean, default: true },
})
const emit = defineEmits(['close'])

const rom = useRomStore()

function pick(id) {
  rom.applyTemplate(id)
  rom.selectedTabId = 'engineering'
  emit('close')
}

function iconFor(id) {
  switch (id) {
    case 'baseline-a': return 'ti-square-letter-a'
    case 'baseline-b': return 'ti-square-letter-b'
    case 'baseline-c': return 'ti-square-letter-c'
    case 'baseline-d': return 'ti-square-letter-d'
    case 'baseline-x': return 'ti-pencil'
    default: return 'ti-folder'
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 20, 20, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal {
  background: var(--rom-surface, #fff);
  border-radius: 12px;
  width: 100%;
  max-width: 640px;
  box-shadow: 0 12px 48px rgba(0,0,0,0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.modal-head {
  padding: 20px 24px 16px;
  border-bottom: 0.5px solid var(--rom-border, #d8d6cd);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.modal-head h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--rom-text, #1a1a1a);
}
.modal-sub {
  font-size: 13px;
  color: var(--rom-text-muted, #6f6f6a);
  margin: 0;
}
.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  color: var(--rom-text-muted, #6f6f6a);
  font-size: 18px;
  display: flex;
}
.close-btn:hover { background: rgba(0,0,0,0.06); color: var(--rom-text, #1a1a1a); }

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
  padding: 20px 24px;
  overflow-y: auto;
}
.template-card {
  position: relative;
  padding: 18px 16px;
  border: 0.5px solid var(--rom-border, #d8d6cd);
  border-radius: 10px;
  background: var(--rom-surface, #fff);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: border-color 100ms ease, transform 100ms ease;
}
.template-card:hover {
  border-color: #1d9e75;
  transform: translateY(-1px);
}
.template-card-recommended {
  border: 2px solid #1d9e75;
}
.template-badge {
  position: absolute;
  top: -8px;
  right: 12px;
  background: #1d9e75;
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
  letter-spacing: 0.3px;
}
.template-icon { font-size: 22px; color: #1d9e75; margin-bottom: 4px; }
.template-name { font-size: 14px; font-weight: 500; color: var(--rom-text, #1a1a1a); }
.template-desc { font-size: 12px; color: var(--rom-text-muted, #6f6f6a); line-height: 1.5; }

.modal-foot {
  padding: 12px 24px;
  border-top: 0.5px solid var(--rom-border, #d8d6cd);
  background: var(--rom-surface-alt, #f7f5ee);
}
.footer-hint { font-size: 11px; color: var(--rom-text-muted, #6f6f6a); }
</style>
