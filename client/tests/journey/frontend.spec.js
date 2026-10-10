import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

async function accessibility(page) {
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    report.violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
async function screenshot(page, name, project) {
  await mkdir('../docs/screenshots', { recursive: true });
  await page.locator('h1').focus();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: `../docs/screenshots/${name}-${project}.png`, fullPage: true });
}
async function enterProfile(page) {
  await page.goto('/questionnaire');
  await page.getByRole('radio', { name: 'Undergraduate degree', exact: true }).check();
  await page.getByLabel('Course or stream').selectOption('Science');
  await page.getByLabel('Current year of study').selectOption('Year 2');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('State or union territory of domicile').selectOption('Assam');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Annual household income').selectOption('1-2.5');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Institution type').selectOption('Government');
  await page.getByLabel('Category', { exact: false }).selectOption('unknown');
  await page.getByLabel('Previous examination score format').selectOption('percentage');
  await page.getByLabel('Previous examination percentage').fill('75');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Does everything look right?' })).toBeVisible();
}

test('complete journey, accessible layouts, official links, and memory-only preparation', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find scholarships');
  await accessibility(page);
  await screenshot(page, '01-landing', testInfo.project.name);
  await page.getByRole('link', { name: 'Find My Scholarships' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/questionnaire/);
  await accessibility(page);
  await screenshot(page, '02-questionnaire', testInfo.project.name);
  await enterProfile(page);
  await accessibility(page);
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await expect(page.getByRole('heading', { name: 'Potential match', exact: true })).toBeVisible();
  await expect(page.locator('.scheme-card')).toHaveCount(4);
  await expect(
    page.getByRole('heading', { name: 'Needs verification', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Does not meet a known condition', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Information unavailable', exact: true }),
  ).toBeVisible();
  await page.getByText('Why this matches', { exact: true }).click();
  await expect(page.getByText(/prewritten assessment is not calculated/)).toBeVisible();
  await accessibility(page);
  await screenshot(page, '03-results', testInfo.project.name);
  await page.getByRole('link', { name: 'View requirements' }).first().click();
  await expect(
    page.getByRole('heading', { name: 'Learning Pathways Scholarship', exact: true }),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: /Admission or bonafide/ }).check();
  await expect(page.getByRole('status')).toHaveText('1 of 3 example tasks marked prepared');
  await accessibility(page);
  await screenshot(page, '04-details', testInfo.project.name);
  const official = page.getByRole('link', { name: /Visit official source:/ });
  await expect(official).toHaveAttribute('href', 'https://scholarships.gov.in/');
  await expect(official).toHaveAttribute('rel', 'noopener noreferrer');
  await page.getByRole('link', { name: 'Back to results', exact: true }).click();
  await page.getByRole('link', { name: 'View requirements' }).first().click();
  await expect(page.getByRole('checkbox', { name: /Admission or bonafide/ })).toBeChecked();
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
  await expect(page).not.toHaveURL(/Assam|75|Science/);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: /Admission or bonafide/ })).not.toBeChecked();
  await expect(page.getByText('No profile submitted in this session.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('validation, correction, conditional answers, and stale-profile messaging', async ({
  page,
}) => {
  await enterProfile(page);
  await page.getByRole('button', { name: 'Edit other details answers' }).click();
  await page.getByLabel('Previous examination percentage').fill('101');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('between 0 and 100');
  await expect(page.getByLabel('Previous examination percentage')).toBeFocused();
  await page.getByLabel('Previous examination percentage').fill('0');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('0%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await page.getByRole('link', { name: 'Edit answers', exact: true }).click();
  await page.getByRole('radio', { name: 'School', exact: true }).check();
  await expect(page.getByLabel('Course or stream')).toHaveValue('');
  await page.getByRole('link', { name: 'Back to preview results' }).click();
  await expect(page.getByText('Your answers have changed.')).toBeVisible();
  await page.getByRole('link', { name: 'Review and resubmit your answers' }).click();
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Previous examination percentage', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Assam', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await expect(page.getByText('Your answers have changed.')).toHaveCount(0);
  await expect(page.locator('.profile-card')).toContainText('School');
});

test('incomplete answers, empty/error scenarios, filters, direct entry, and unknown routes', async ({
  page,
}) => {
  await page.goto('/results');
  await expect(page.getByRole('heading', { name: 'Let’s get to know you first.' })).toBeVisible();
  await page.getByRole('link', { name: 'Start the questionnaire' }).click();
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await expect(page.locator('.profile-card')).toContainText('Not answered');
  await page.getByRole('button', { name: /Needs verification/ }).click();
  await expect(page.locator('.scheme-card')).toHaveCount(1);
  await expect(page.locator('.scheme-card')).toContainText('Next Chapter');
  await page.getByLabel('Preview scenario').selectOption('empty');
  await expect(page.getByRole('heading', { name: 'No results in this preview.' })).toBeVisible();
  await accessibility(page);
  await page.getByLabel('Preview scenario').selectOption('error');
  await expect(page.getByRole('heading', { name: 'We couldn’t load the preview.' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.scheme-card')).toHaveCount(4);
  await page.goto('/scholarships/next-chapter');
  await expect(page.getByRole('heading', { name: 'Next Chapter Education Grant' })).toBeVisible();
  await expect(page.getByText('Conditional', { exact: true })).toBeVisible();
  await page.goto('/scholarships/not-a-scheme');
  await expect(page.getByRole('heading', { name: 'We couldn’t find that page.' })).toBeVisible();
  await page.goto('/missing-page');
  await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible();
});

test('tablet and narrow reflow, reduced motion, and landing anchors', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  await accessibility(page);
  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page).toHaveURL(/#privacy/);
  await expect(page.locator('#privacy')).toBeInViewport();
  await page.setViewportSize({ width: 640, height: 500 });
  await accessibility(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    'auto',
  );
});
