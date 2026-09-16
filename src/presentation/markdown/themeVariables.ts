import {
  allColorNames,
  FONT_STACKS,
  resolveColor,
  type DocumentTheme,
} from '@/domain/document/DocumentTheme';

/**
 * The document theme as CSS custom properties.
 *
 * One `--md-color-<name>` per palette name, plus the font family and the
 * highlight background. Applied through a `:style` binding (CSSOM,
 * which the strict `style-src` allows), on the paper and on the editor host,
 * so `SafeInline` and the editor's marks can say `var(--md-color-light-green)`
 * and never carry a colour value themselves. Which of the two palette values a
 * name resolves to — screen or print — is the surface's decision.
 */
export function themeVariables(
  theme: DocumentTheme,
  medium: 'screen' | 'print',
): Record<string, string> {
  const variables: Record<string, string> = {
    '--md-font-family': FONT_STACKS[theme.fontFamily],
    '--md-highlight': theme.highlight[medium],
  };
  for (const name of allColorNames()) {
    const color = resolveColor(name, theme);
    if (color) variables[`--md-color-${name}`] = color[medium];
  }
  return variables;
}
