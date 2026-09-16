<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { countryName, countryOptions, searchCountries } from '@/domain/address/countries';

/**
 * One searchable country field (R13-013): the ISO code is the value, the
 * localized name is what people see and type. Typing "nie" offers the
 * Netherlands, Niger and Nigeria; arrows move, Enter chooses, Escape closes.
 * The list is local and complete — the browser names the countries in the UI
 * language, so nothing is fetched and nothing is translated by hand.
 *
 * Follows the WAI-ARIA Combobox pattern like the address picker: the input
 * owns the popup via `aria-controls` and announces the active option through
 * `aria-activedescendant`. An empty value is allowed and means "no country".
 */
const props = defineProps<{
  /** ISO 3166-1 alpha-2 code, or empty. */
  modelValue: string;
  label: string;
  /** Renders the input without the surrounding `.field` label block. */
  bare?: boolean;
  inputId?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [code: string] }>();

const { t, locale } = useI18n();
const generated = useId();
const id = computed(() => props.inputId ?? generated);
const listId = `${generated}-list`;
const query = ref('');
const open = ref(false);
const activeIndex = ref(-1);

const options = computed(() => countryOptions(locale.value));
const matches = computed(() => searchCountries(options.value, query.value));

/** What the input shows while the popup is closed. */
const displayValue = computed(() => {
  if (open.value) return query.value;
  return props.modelValue ? countryName(props.modelValue, locale.value) : '';
});

function optionId(index: number): string {
  return `${generated}-option-${index}`;
}

function openPopup(): void {
  if (open.value) return;
  open.value = true;
  query.value = '';
  activeIndex.value = Math.max(
    0,
    matches.value.findIndex((option) => option.code === props.modelValue),
  );
}

function closePopup(): void {
  open.value = false;
  activeIndex.value = -1;
  query.value = '';
}

function onInput(event: Event): void {
  query.value = (event.target as HTMLInputElement).value;
  open.value = true;
  activeIndex.value = matches.value.length ? 0 : -1;
}

function choose(code: string): void {
  emit('update:modelValue', code);
  closePopup();
}

function onKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (!open.value) openPopup();
      else activeIndex.value = Math.min(activeIndex.value + 1, matches.value.length - 1);
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
        activeIndex.value = matches.value.length - 1;
      }
      break;
    case 'Enter': {
      const active = matches.value[activeIndex.value];
      if (open.value) {
        event.preventDefault();
        if (active) choose(active.code);
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
      // Clearing the country from a closed input: one keystroke, no menu.
      if (!open.value && props.modelValue) {
        event.preventDefault();
        emit('update:modelValue', '');
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

watch(matches, (next) => {
  if (activeIndex.value >= next.length) activeIndex.value = next.length - 1;
});
</script>

<template>
  <div class="country-combobox" :class="{ field: !bare }">
    <label v-if="!bare" :for="id">{{ label }}</label>
    <input
      :id="id"
      class="input input-bordered"
      type="text"
      role="combobox"
      autocomplete="off"
      :value="displayValue"
      :placeholder="t('combobox.countryPlaceholder')"
      :aria-label="bare ? label : undefined"
      aria-autocomplete="list"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="open && activeIndex >= 0 ? optionId(activeIndex) : undefined"
      data-testid="country"
      @input="onInput"
      @focus="openPopup"
      @click="openPopup"
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <ul v-show="open" :id="listId" class="address-popup" role="listbox" :aria-label="label">
      <li
        v-for="(option, index) in matches"
        :id="optionId(index)"
        :key="option.code"
        role="option"
        class="address-option country-option"
        :class="{ active: index === activeIndex }"
        :aria-selected="option.code === modelValue"
        @mousedown.prevent="choose(option.code)"
        @mousemove="activeIndex = index"
      >
        <strong>{{ option.name }}</strong>
        <span>{{ option.code }}</span>
      </li>
      <li v-if="matches.length === 0" class="address-option empty-state" role="presentation">
        {{ t('combobox.noMatches') }}
      </li>
    </ul>
  </div>
</template>
