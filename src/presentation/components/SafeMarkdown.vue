<script setup lang="ts">
import { computed } from 'vue';
import { parseMarkdown } from '@/presentation/markdown/parseMarkdown';

const props = defineProps<{ source: string }>();
const blocks = computed(() => parseMarkdown(props.source));

/** Heading levels map to real elements, so the document outline is real. */
const headingTag = (level: number): 'h2' | 'h3' | 'h4' =>
  level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
</script>

<template>
  <div class="safe-markdown">
    <template v-for="(block, blockIndex) in blocks" :key="blockIndex">
      <component :is="headingTag(block.level)" v-if="block.kind === 'heading'">
        <template v-for="(token, tokenIndex) in block.content" :key="tokenIndex">
          <strong v-if="token.kind === 'strong'">{{ token.value }}</strong>
          <em v-else-if="token.kind === 'emphasis'">{{ token.value }}</em>
          <code v-else-if="token.kind === 'code'">{{ token.value }}</code>
          <template v-else>{{ token.value }}</template>
        </template>
      </component>
      <p v-else-if="block.kind === 'paragraph'">
        <template v-for="(token, tokenIndex) in block.content" :key="tokenIndex">
          <strong v-if="token.kind === 'strong'">{{ token.value }}</strong>
          <em v-else-if="token.kind === 'emphasis'">{{ token.value }}</em>
          <code v-else-if="token.kind === 'code'">{{ token.value }}</code>
          <template v-else>{{ token.value }}</template>
        </template>
      </p>
      <ul v-else>
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <template v-for="(token, tokenIndex) in item" :key="tokenIndex">
            <strong v-if="token.kind === 'strong'">{{ token.value }}</strong>
            <em v-else-if="token.kind === 'emphasis'">{{ token.value }}</em>
            <code v-else-if="token.kind === 'code'">{{ token.value }}</code>
            <template v-else>{{ token.value }}</template>
          </template>
        </li>
      </ul>
    </template>
  </div>
</template>
