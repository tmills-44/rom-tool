<template>
  <div class="ss-wrap" ref="wrapper">
    <div class="ss-control" :class="{ 'ss-open': open, 'ss-filled': !!modelValue }">
      <input
        ref="inputEl"
        type="text"
        class="ss-input"
        :placeholder="placeholder"
        v-model="query"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.enter.prevent="selectFirst"
        @keydown.escape="close"
        @keydown.arrow-down.prevent="moveDown"
        @keydown.arrow-up.prevent="moveUp"
        autocomplete="off"
      />
      <span class="ss-arrow" @mousedown.prevent="toggleOpen">▾</span>
    </div>

    <div v-if="open && filtered.length" class="ss-dropdown" ref="dropdownEl">
      <div
        v-for="(opt, i) in filtered"
        :key="opt.value"
        class="ss-option"
        :class="{ 'ss-option--active': i === cursor, 'ss-option--selected': opt.value === modelValue }"
        @mousedown.prevent="pick(opt)"
        @mouseover="cursor = i"
      >
        {{ opt.label }}
      </div>
    </div>
    <div v-else-if="open && query && !filtered.length" class="ss-dropdown ss-empty">
      No matches for "{{ query }}"
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options:    { type: Array,  default: () => [] },  // [{ value, label }] or string[]
  placeholder:{ type: String, default: 'Search…' },
})
const emit = defineEmits(['update:modelValue'])

const open      = ref(false)
const query     = ref('')
const cursor    = ref(0)
const inputEl   = ref(null)
const wrapper   = ref(null)

// Normalize options to { value, label }
const normalized = computed(() =>
  props.options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
)

// Filter by query — if query matches the current label exactly, show all
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return normalized.value
  return normalized.value.filter(o => o.label.toLowerCase().includes(q))
})

// Keep the input text in sync with the selected value when not typing
watch(() => props.modelValue, val => {
  if (!open.value) {
    const match = normalized.value.find(o => o.value === val)
    query.value = match?.label ?? ''
  }
}, { immediate: true })

function onFocus() {
  open.value = true
  cursor.value = 0
  // Select all text so user can immediately type a new search
  nextTick(() => inputEl.value?.select())
}

function onBlur() {
  // Short delay so mousedown on option fires first
  setTimeout(() => {
    open.value = false
    // Restore the label for the current value (in case user typed partial text)
    const match = normalized.value.find(o => o.value === props.modelValue)
    query.value = match?.label ?? ''
  }, 150)
}

function toggleOpen() {
  if (open.value) { close() } else { inputEl.value?.focus() }
}

function close() {
  open.value = false
  const match = normalized.value.find(o => o.value === props.modelValue)
  query.value = match?.label ?? ''
}

function pick(opt) {
  emit('update:modelValue', opt.value)
  query.value = opt.label
  open.value  = false
}

function selectFirst() {
  if (filtered.value.length) pick(filtered.value[cursor.value] ?? filtered.value[0])
}

function moveDown() {
  cursor.value = Math.min(cursor.value + 1, filtered.value.length - 1)
}
function moveUp() {
  cursor.value = Math.max(cursor.value - 1, 0)
}
</script>

<style scoped>
.ss-wrap {
  position: relative;
  width: 100%;
}

.ss-control {
  display: flex; align-items: center;
  border: 1px solid var(--rom-border);
  border-radius: 5px;
  background: var(--rom-surface);
  transition: border-color .15s;
}
.ss-control.ss-open { border-color: var(--rom-accent); }
.ss-control:focus-within { border-color: var(--rom-accent); outline: 2px solid var(--rom-accent); outline-offset: -1px; }

.ss-input {
  flex: 1; border: none; background: transparent;
  padding: 5px 6px 5px 8px;
  font-size: 13px; color: var(--rom-text);
  min-width: 0;
}
.ss-input:focus { outline: none; }
.ss-input::placeholder { color: var(--rom-text-faint); }

.ss-arrow {
  padding: 0 8px; color: var(--rom-text-muted);
  font-size: 11px; cursor: pointer; flex-shrink: 0;
  user-select: none;
}

.ss-dropdown {
  position: absolute; top: calc(100% + 3px); left: 0; right: 0;
  background: var(--rom-surface);
  border: 1px solid var(--rom-border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
  max-height: 220px; overflow-y: auto;
  z-index: 200;
}

.ss-option {
  padding: 7px 12px;
  font-size: 13px; color: var(--rom-text);
  cursor: pointer;
}
.ss-option--active  { background: var(--rom-accent-bg); }
.ss-option--selected { font-weight: 600; color: var(--rom-accent-dark); }
.ss-option:not(:last-child) { border-bottom: 1px solid var(--rom-border); }

.ss-empty {
  padding: 10px 12px;
  font-size: 12px; color: var(--rom-text-faint); font-style: italic;
}
</style>
