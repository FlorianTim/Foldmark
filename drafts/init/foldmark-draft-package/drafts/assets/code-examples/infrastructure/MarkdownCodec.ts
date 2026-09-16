import MarkdownIt from 'markdown-it';
import YAML from 'yaml';

const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false });

export function splitFrontMatter(source: string): { metadata: unknown; body: string } {
  if (!source.startsWith('---\n')) return { metadata: {}, body: source };
  const end = source.indexOf('\n---\n', 4);
  if (end < 0) throw new Error('Unterminated YAML front matter.');
  const metadata = YAML.parse(source.slice(4, end), { maxAliasCount: 20 });
  return { metadata, body: source.slice(end + 5) };
}

export function renderMarkdownBody(body: string): string {
  return markdown.render(body); // sanitize the result at the DOM/render adapter boundary
}
