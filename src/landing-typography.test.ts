import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./views/LandingPage.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./views/LandingPage.css', import.meta.url), 'utf8');

test('landing primary and supporting copy use readable type sizes', () => {
  assert.match(styles, /\.mi-hero-lede[^}]+font-size: clamp\(1\.05rem/);
  assert.match(styles, /\.mi-section-heading > p:last-child[^}]+font-size: 17px/);
  assert.match(styles, /\.mi-feature-card p[^}]+font-size: 15px[^}]+line-height: 1\.65/);
  assert.doesNotMatch(styles, /\.mi-hero-lede[^}]+font-size:\s*1[012]px/);
});

test('landing controls, FAQ, and footer remain readable', () => {
  assert.match(styles, /\.mi-button[^}]+min-height: 44px/);
  assert.match(styles, /\.mi-faq-item h3 button[^}]+min-height: 62px/);
  assert.match(styles, /\.mi-faq-answer p[^}]+font-size: 14px[^}]+line-height: 1\.7/);
  assert.match(styles, /\.mi-footer nav[^}]+font-size: 13px/);
  assert.match(source, /aria-expanded=\{menuOpen\}/);
  assert.match(source, /aria-expanded=\{isOpen\}/);
});

test('typography pass preserves semantic heading hierarchy', () => {
  assert.equal((source.match(/<h1\b/g) ?? []).length, 1);
  assert.ok((source.match(/<h2\b/g) ?? []).length >= 4);
  assert.ok((source.match(/<h3\b/g) ?? []).length >= 4);
});

test('landing has a scoped responsive theme and reduced-motion behavior', () => {
  assert.match(styles, /:root\[data-theme='dark'\] \.landing-mi/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(source, /Live Index|2,847|Semantic Search|natural-language/i);
});
