<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  addressLines,
  canSend,
  matchesQuery,
  orderSenders,
  suggestAddresses,
  type Address,
} from '@/domain/address/Address';

/**
 * An editable combobox over the address book, for choosing a sender or a
 * recipient inside the document.
 *
 * Follows the WAI-ARIA Combobox pattern: the text input owns the popup via
 * `aria-controls`, the active option is announced through
 * `aria-activedescendant`, arrows move, Enter selects, Escape closes. With
 * nothing typed it offers what a person reaches for — primary, home and the
 * most recent addresses; typing filters the whole book locally.
 *
 * The component chooses; the caller copies. Selecting emits the address and
 * the document takes a snapshot of it (ADR 0017), so the picker never holds
 * a reference the document would depend on.
 */
const props = defineProps<{
  addresses: readonly Address[];
  /** Senders are filtered and ordered by role; recipients by recency. */
  role: 'sender' | 'recipient';
  /** The currently chosen address id, or `null`; shown as the input's text when the popup is closed. */
  selectedId: string | null;
  /** What the closed input shows when the selection is a snapshot without a source. */
  selectedLabel?: string;
  label: string;
}>();
const emit = defineEmits<{ select: [address: Address]; clear: []; openBook: [query: string] }>();

const { t, locale } = useI18n();

const id = useId();
const listId = `${id}-list`;
const query = ref('');
const open = ref(false);
const activeIndex = ref(-1);

/** Most rows the popup renders; the book itself is a click away. */
const MAX_ROWS = 50;

const selected = computed(
  () => props.addresses.find((address) => address.id === props.selectedId) ?? null,
);

const pool = computed(() =>
  props.role === 'sender' ? props.addresses.filter(canSend) : props.addresses,
);

const options = computed<readonly Address[]>(() => {
  const term = query.value.trim();
  if (!term) {
    return props.role === 'sender'
      ? orderSenders(pool.value, locale.value).slice(0, 10)
      : suggestAddresses(pool.value, locale.value, 10);
  }
  return pool.value.filter((address) => matchesQuery(address, term)).slice(0, MAX_ROWS);
});

const truncated = computed(() => {
  const term = query.value.trim();
  return term
    ? pool.value.filter((address) => matchesQuery(address, term)).length > MAX_ROWS
    : pool.value.length > options.value.length;
});

/** What the input shows while the popup is closed. */
const displayValue = computed(() => {
  if (open.value) return query.value;
  return selected.value?.displayName ?? props.selectedLabel ?? '';
});

function optionId(index: number): string {
  return `${id}-option-${index}`;
}

function openPopup(): void {
  open.value = true;
  activeIndex.value = options.value.length ? 0 : -1;
}

function closePopup(): void {
  open.value = false;
  activeIndex.value = -1;
  query.value = '';
}

function onInput(event: Event): void {
  query.value = (event.target as HTMLInputElement).value;
  if (!open.value) open.value = true;
  activeIndex.value = options.value.length ? 0 : -1;
}

function choose(address: Address): void {
  emit('select', address);
  closePopup();
}

function onKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (!open.value) openPopup();
      else activeIndex.value = Math.min(activeIndex.value + 1, options.value.length - 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      if (open.value) activeIndex.value = Math.max(activeIndex.value - 1, 0);
      break;
    case 'Home':
      if (open.value) {
        event.preventDefault();
        activeIndex.value = 0;
      }
      break;
    case 'End':
      if (open.value) {
        event.preventDefault();
        activeIndex.value = options.value.length - 1;
      }
      break;
    case 'Enter': {
      const active = options.value[activeIndex.value];
      if (open.value && active) {
        event.preventDefault();
        choose(active);
      }
      break;
    }
    case 'Escape':
      if (open.value) {
        event.preventDefault();
        closePopup();
      }
      break;
    case 'Backspace':
      // Clearing a chosen address from a closed input: one keystroke, no menu.
      if (!open.value && (selected.value || props.selectedLabel)) {
        event.preventDefault();
        emit('clear');
      }
      break;
    default:
      break;
  }
}

/** Closing on blur has to wait for a click on an option to land first. */
function onBlur(): void {
  setTimeout(() => {
    if (open.value) closePopup();
  }, 120);
}

watch(options, (next) => {
  if (activeIndex.value >= next.length) activeIndex.value = next.length - 1;
});
</script>

<template>
  <div class="address-combobox">
    <!-- The label stands alone: wrapped around the row it would swallow the
         book button's text into the combobox's accessible name. -->
    <div class="field">
      <label :for="id">{{ label }}</label>
      <div class="address-combobox-row">
        <input
          :id="id"
          class="input input-bordered"
          type="text"
          role="combobox"
          autocomplete="off"
          :value="displayValue"
          :placeholder="t('combobox.placeholder')"
          aria-autocomplete="list"
          :aria-expanded="open"
          :aria-controls="listId"
          :aria-activedescendant="open && activeIndex >= 0 ? optionId(activeIndex) : undefined"
          @input="onInput"
          @focus="openPopup"
          @click="openPopup"
          @keydown="onKeydown"
          @blur="onBlur"
        />
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          :aria-label="t('combobox.openBook')"
          :title="t('combobox.openBook')"
          @click="emit('openBook', query)"
        >
          <span aria-hidden="true">📖</span>
        </button>
      </div>
    </div>

    <ul v-show="open" :id="listId" class="address-popup" role="listbox" :aria-label="label">
      <li
        v-for="(address, index) in options"
        :id="optionId(index)"
        :key="address.id"
        role="option"
        class="address-option"
        :class="{ active: index === activeIndex }"
        :aria-selected="index === activeIndex"
        @mousedown.prevent="choose(address)"
        @mousemove="activeIndex = index"
      >
        <strong>{{ address.displayName }}</strong>
        <span>{{ addressLines(address.postal).join(', ') }}</span>
      </li>
      <li v-if="options.length === 0" class="address-option empty-state" role="presentation">
        {{ t('combobox.noMatches') }}
      </li>
      <li v-if="truncated" class="address-option address-more" role="presentation">
        <button type="button" class="link-button" @mousedown.prevent="emit('openBook', query)">
          {{ t('combobox.more') }}
        </button>
      </li>
    </ul>
  </div>
</template>
