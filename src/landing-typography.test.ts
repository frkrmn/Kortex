import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./views/LandingPage.tsx', import.meta.url), 'utf8');

test('landing primary and supporting copy use readable type sizes', () => {
  assert.match(source, /text-\[17px\] sm:text-lg[^\n]+leading-7/);
  assert.match(source, /text-base sm:text-lg[^\n]+leading-7/);

  const readableBodyBlocks = source.match(/text-base text-\[#5C5C58\] leading-7/g) ?? [];
  assert.ok(readableBodyBlocks.length >= 10, 'feature and card body copy should remain at 16px with 28px line-height');

  assert.doesNotMatch(
    source,
    /<p className="text-xs text-\[#70706B\] leading-relaxed">/,
    'primary landing paragraphs must not regress to 12px',
  );
});

test('landing controls, FAQ, and footer remain readable', () => {
  assert.match(source, /hidden md:flex items-center gap-6 text-sm/);
  assert.match(source, /justify-between gap-4 text-base leading-6 font-semibold/);
  assert.match(source, /text-base text-\[#5C5C58\] leading-7 bg-\[#FAFAF8\]\/50/);
  assert.match(source, /<footer[^>]+text-sm leading-6 text-\[#70706B\]/);
  assert.match(source, /uppercase tracking-wider text-\[#70706B\]/);
});

test('typography pass preserves semantic heading hierarchy', () => {
  assert.equal((source.match(/<h1\b/g) ?? []).length, 1);
  assert.ok((source.match(/<h2\b/g) ?? []).length >= 4);
  assert.ok((source.match(/<h3\b/g) ?? []).length >= 8);
});
