import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { approvedTestimonials } from './content/testimonials';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('public and application identity surfaces use the shared Arctic Blue brand mark', () => {
  for (const path of [
    './views/LandingPage.tsx', './views/BlogViews.tsx', './views/LegalViews.tsx',
    './views/LoginView.tsx', './views/SignupView.tsx', './views/ForgotPasswordView.tsx',
    './views/ResetPasswordView.tsx', './views/AuthCallbackView.tsx', './views/NotFoundView.tsx',
    './views/PublicDemoView.tsx', './components/AppSidebar.tsx', './components/MobileNavigation.tsx',
  ]) assert.match(read(path), /BrandMark/, path);
  assert.match(read('./components/BrandMark.tsx'), /data-brand-mark="arctic-blue"/);
});

test('demo fixtures are synthetic, local, and do not reference private identities or remote avatar services', () => {
  const fixtures = `${read('./lib/demo-data/bookmarks.ts')}\n${read('./lib/demo-data/collections.ts')}`;
  assert.match(fixtures, /demo_sample_user/);
  assert.match(fixtures, /· Sample/);
  assert.doesNotMatch(fixtures, /user_faruk|images\.unsplash\.com|creator_name: 'Faruk'/);
  for (const realName of ['Andrej Karpathy', 'Andrew Ng', 'Brian Chesky', 'Paul Graham', 'Vitalik Buterin']) assert.doesNotMatch(fixtures, new RegExp(realName));
});

test('interactive demo remains fixture-only while covering the required public experiences', () => {
  const demo = read('./views/PublicDemoView.tsx');
  for (const copy of ['Explore Library', 'Try Search', 'View AI Insights', 'Open Reader', 'Collections', 'Download sample JSON']) assert.match(demo, new RegExp(copy));
  assert.doesNotMatch(demo, /supabase|\/api\/|fetch\(|GoogleGenAI|stripe/i);
});

test('social proof stays unpublished until approved content exists', () => {
  assert.equal(approvedTestimonials.length, 0);
  assert.match(read('./components/SocialProofSection.tsx'), /if \(!testimonials\.length && !preview\) return null/);
});

test('pricing links and demo labels use the canonical public destinations', () => {
  const publicSource = [read('./views/LandingPage.tsx'), read('./views/MarketingViews.tsx'), read('./views/BlogViews.tsx')].join('\n');
  assert.match(publicSource, /href="\/#pricing"/);
  assert.match(publicSource, /Interactive Demo/);
  assert.doesNotMatch(publicSource, /Watch Demo|Explore Demo|>Demo<|Explore the demo/);
});
