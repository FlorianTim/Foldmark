import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('unsafe DOM baseline', () => {
  it('does not use prohibited DOM or dynamic-code sinks in production source', () => {
    const files = globSync('src/**/*.{ts,vue}');
    // The paths come from a local glob rooted in src; no user-controlled filename reaches the API.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const source = files.map((file) => readFileSync(file, 'utf8')).join('\n');
    for (const prohibited of [
      'v-html',
      'innerHTML',
      'outerHTML',
      'insertAdjacentHTML',
      'eval(',
      'new Function(',
    ]) {
      expect(source).not.toContain(prohibited);
    }
  });
});
