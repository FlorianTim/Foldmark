<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import type { IconName } from '@/presentation/icons/iconNames.generated';

/**
 * A classic application menu bar (R13-015): File, Edit, Insert, Format,
 * View, Help. The bar is data — the parent hands in the menus and receives
 * a command id back — so the workspace decides what every entry does and the
 * bar only knows how to be a menu.
 *
 * Follows the WAI-ARIA menubar pattern: Left and Right move between menus
 * (and open the neighbour when one is open), Down opens, Up and Down walk
 * the items, Home and End jump, Enter and Space activate, Escape closes and
 * returns focus to the menu button. A click outside closes as well.
 */
export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly shortcut?: string;
  readonly disabled?: boolean;
  /** Rendered as a checked item (`menuitemcheckbox`). */
  readonly checked?: boolean;
  /** A divider before this item. */
  readonly dividerBefore?: boolean;
}

export interface Menu {
  readonly id: string;
  readonly label: string;
  readonly items: readonly MenuItem[];
}

const props = defineProps<{ menus: readonly Menu[]; label: string }>();
const emit = defineEmits<{ command: [id: string] }>();

const openId = ref<string | null>(null);
const activeIndex = ref(-1);
const root = ref<HTMLElement | null>(null);

function menuIndex(id: string): number {
  return props.menus.findIndex((menu) => menu.id === id);
}

function open(id: string, focusIndex = -1): void {
  openId.value = id;
  activeIndex.value = focusIndex;
  void nextTick(() => focusItem());
}

function close(returnFocus = true): void {
  const id = openId.value;
  openId.value = null;
  activeIndex.value = -1;
  if (returnFocus && id) {
    root.value?.querySelector<HTMLElement>(`[data-menu="${id}"]`)?.focus();
  }
}

function toggle(id: string): void {
  if (openId.value === id) close();
  else open(id);
}

function focusItem(): void {
  if (!openId.value || activeIndex.value < 0) return;
  const items = root.value?.querySelectorAll<HTMLElement>(
    `[data-menu-panel="${openId.value}"] [role^="menuitem"]`,
  );
  items?.[activeIndex.value]?.focus();
}

function enabledItems(): readonly MenuItem[] {
  return props.menus.find((menu) => menu.id === openId.value)?.items ?? [];
}

function move(step: number): void {
  const items = enabledItems();
  if (!items.length) return;
  let next = activeIndex.value;
  for (let tries = 0; tries < items.length; tries += 1) {
    next = (next + step + items.length) % items.length;
    if (!items[next]?.disabled) break;
  }
  activeIndex.value = next;
  focusItem();
}

function activate(item: MenuItem): void {
  if (item.disabled) return;
  close();
  emit('command', item.id);
}

function onButtonKeydown(event: KeyboardEvent, id: string): void {
  const index = menuIndex(id);
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowLeft': {
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const neighbour = props.menus[(index + step + props.menus.length) % props.menus.length];
      if (!neighbour) return;
      const button = root.value?.querySelector<HTMLElement>(`[data-menu="${neighbour.id}"]`);
      button?.focus();
      if (openId.value) open(neighbour.id, 0);
      break;
    }
    case 'ArrowDown':
    case 'Enter':
    case ' ':
      open(id, 0);
      break;
    case 'Escape':
      close();
      break;
    default:
      return;
  }
  event.preventDefault();
}

function onPanelKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowDown':
      move(1);
      break;
    case 'ArrowUp':
      move(-1);
      break;
    case 'Home':
      activeIndex.value = -1;
      move(1);
      break;
    case 'End':
      activeIndex.value = 0;
      move(-1);
      break;
    case 'ArrowRight':
    case 'ArrowLeft': {
      const index = menuIndex(openId.value ?? '');
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const neighbour = props.menus[(index + step + props.menus.length) % props.menus.length];
      if (neighbour) open(neighbour.id, 0);
      break;
    }
    case 'Escape':
      close();
      break;
    case 'Tab':
      close(false);
      return;
    default:
      return;
  }
  event.preventDefault();
}

function onDocumentPointerDown(event: Event): void {
  if (openId.value && root.value && !root.value.contains(event.target as Node)) close(false);
}

onMounted(() => globalThis.document.addEventListener('pointerdown', onDocumentPointerDown));
onBeforeUnmount(() =>
  globalThis.document.removeEventListener('pointerdown', onDocumentPointerDown),
);
</script>

<template>
  <div ref="root" class="app-menu" role="menubar" :aria-label="label">
    <div v-for="menu in menus" :key="menu.id" class="app-menu-entry">
      <button
        type="button"
        class="app-menu-button"
        :class="{ 'is-open': openId === menu.id }"
        role="menuitem"
        aria-haspopup="menu"
        :aria-expanded="openId === menu.id"
        :data-menu="menu.id"
        :tabindex="openId === null && menu === menus[0] ? 0 : openId === menu.id ? 0 : -1"
        @click="toggle(menu.id)"
        @keydown="onButtonKeydown($event, menu.id)"
        @pointerenter="openId && openId !== menu.id ? open(menu.id) : undefined"
      >
        {{ menu.label }}
      </button>
      <ul
        v-if="openId === menu.id"
        class="app-menu-panel"
        role="menu"
        :aria-label="menu.label"
        :data-menu-panel="menu.id"
        @keydown="onPanelKeydown"
      >
        <template v-for="item in menu.items" :key="item.id">
          <li v-if="item.dividerBefore" role="separator" class="app-menu-divider" />
          <li
            :role="item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'"
            :aria-checked="item.checked === undefined ? undefined : item.checked"
            :aria-disabled="item.disabled || undefined"
            class="app-menu-item"
            :class="{ 'is-disabled': item.disabled, 'is-checked': item.checked }"
            tabindex="-1"
            @click="activate(item)"
            @keydown.enter.prevent="activate(item)"
            @keydown.space.prevent="activate(item)"
          >
            <span class="app-menu-check" aria-hidden="true">{{ item.checked ? '✓' : '' }}</span>
            <AppIcon v-if="item.icon" :name="item.icon" size="sm" />
            <span class="app-menu-label">{{ item.label }}</span>
            <kbd v-if="item.shortcut" class="app-menu-shortcut">{{ item.shortcut }}</kbd>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>
