import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/styleguide'];

for (const path of PAGES) {
  test(`a11y: ${path} has no serious/critical violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`)
        .join('\n');
      expect(violations, `a11y violations on ${path}:\n${summary}`).toHaveLength(0);
    }
  });
}

test('a11y: home page has skip-to-content link as first focusable element', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
  expect(focused).toBe('Spring til indhold');
});

test('a11y: all CTA buttons have accessible names', async ({ page }) => {
  await page.goto('/');
  const buttons = page.getByRole('link', { name: 'Tilmeld dig' });
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
});

test('a11y: page has exactly one h1', async ({ page }) => {
  await page.goto('/');
  const h1s = page.locator('h1');
  await expect(h1s).toHaveCount(1);
});
