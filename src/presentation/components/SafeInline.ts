import { defineComponent, h, type PropType, type VNodeArrayChildren, type VNodeChild } from 'vue';
import { formatIsoDate } from '@/domain/markdown/dateToken';
import type { MarkdownInline } from '@/presentation/markdown/parseMarkdown';

/**
 * Inline tokens as VNodes — one place for the inline kinds instead of one
 * copy per block type. Text stays text: `h()` children are strings, never
 * markup, a link's `href` is only what the parser already vetted, and a colour
 * is a CSS variable *name* derived from a palette name the parser already
 * checked — the value behind it is set by the surface from the document theme.
 *
 * Images are the one element with a source, and that source is an object URL
 * for a local asset resolved by the caller, never a URL from the document.
 */
export const SafeInline = defineComponent({
  name: 'SafeInline',
  props: {
    tokens: { type: Array as PropType<readonly MarkdownInline[]>, required: true },
    /** Language for date tokens; defaults to the browser's. */
    locale: { type: String, default: undefined },
    /** Object URLs for local assets, keyed by asset id; an image without one shows its alt text. */
    assetUrls: { type: Object as PropType<Readonly<Record<string, string>>>, default: () => ({}) },
    /** Wording for an image whose asset is not available. */
    missingAssetLabel: { type: String, default: '' },
  },
  setup(props) {
    const render = (tokens: readonly MarkdownInline[]): VNodeArrayChildren =>
      tokens.map((token) => {
        // A container's content: its nested tokens when it has any, else its text.
        const inner = (): VNodeArrayChildren | string =>
          token.children ? render(token.children) : token.value;
        switch (token.kind) {
          case 'strong':
            return h('strong', inner());
          case 'emphasis':
            return h('em', inner());
          case 'code':
            return h('code', token.value);
          case 'strikethrough':
            return h('s', inner());
          case 'break':
            return h('br');
          case 'link':
            return h('a', { href: token.href, rel: 'noopener noreferrer' }, inner());
          case 'date':
            return h(
              'time',
              { datetime: token.value },
              formatIsoDate(token.value, props.locale ?? navigator.language),
            );
          case 'color':
            return h(
              'span',
              { class: 'md-color', style: { color: `var(--md-color-${token.color ?? ''})` } },
              inner(),
            );
          case 'highlight':
            return h('mark', { class: 'md-highlight' }, inner());
          case 'underline':
            return h('u', inner());
          case 'small':
            return h('small', { class: 'md-small' }, inner());
          case 'sup':
            return h('sup', inner());
          case 'sub':
            return h('sub', inner());
          case 'directive':
            // Unknown inline directive: plain content, marked so an editor can find it.
            return h('span', { class: 'md-unknown', 'data-directive': token.name }, inner());
          case 'image': {
            const url = token.assetId ? props.assetUrls[token.assetId] : undefined;
            // Width in millimetres or as a share of the text box; alignment as a
            // class, so the print stylesheet and the editor draw it alike (R14-015).
            const style = token.widthPercent
              ? { width: `${token.widthPercent}%` }
              : token.widthMm
                ? { width: `${token.widthMm}mm` }
                : undefined;
            const classes = ['md-image', token.align ? `md-image-align-${token.align}` : ''];
            return url
              ? h('img', { class: classes.filter(Boolean), src: url, alt: token.value, style })
              : h(
                  'span',
                  { class: 'md-image-missing', role: 'img', 'aria-label': token.value },
                  props.missingAssetLabel || token.value,
                );
          }
          default:
            return token.value;
        }
      });
    return (): VNodeChild => render(props.tokens);
  },
});
