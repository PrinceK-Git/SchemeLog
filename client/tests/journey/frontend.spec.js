import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function accessibility(page) {
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    report.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map((node) => node.target) })),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
const card = (page, name) =>
  page.locator('.scheme-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
const learning = 'Learning Pathways Demo Scholarship';
async function profile(page, income = 'middle', level = 'Undergraduate degree') {
  await page.goto('/questionnaire');
  await page.getByRole('radio', { name: level, exact: true }).check();
  await expect(page.getByLabel('State or union territory of domicile')).toHaveCount(0);
  await expect(page.getByLabel('Category', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const select = page.getByLabel('Annual household income', { exact: true });
  if (income === 'declined') await select.selectOption('declined');
  else {
    const options = await select.locator('option').allTextContents();
    const label = options.find((text) =>
      income === 'low'
        ? /^Up to/.test(text)
        : income === 'high'
          ? /^Above/.test(text) && !/up to/i.test(text)
          : /^Above/.test(text) && /up to/i.test(text),
    );
    expect(label).toBeTruthy();
    await select.selectOption({ label });
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Does everything look right?' })).toBeVisible();
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await expect(page.locator('.scheme-card')).toHaveCount(4);
}

test('answer-driven discovery, grouped reasons, edit/stale/resubmit and privacy', async ({
  page,
}) => {
  const pageErrors = [];
  const externalRequests = [];
  const consoleMessages = [];
  const personalRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => consoleMessages.push(message.text()));
  page.on('request', (request) => {
    if (
      request.method() !== 'GET' ||
      /undergraduate|annualHouseholdIncome|250000|draftProfile/.test(request.url())
    )
      personalRequests.push(request.url());
    if (!request.url().startsWith('http://127.0.0.1:4173/')) externalRequests.push(request.url());
  });
  await page.goto('/');
  await expect(
    page.getByText('Demo rules evaluated as of 10 October 2026.', { exact: true }),
  ).toBeVisible();
  await accessibility(page);
  await page.getByRole('link', { name: 'Try the demo', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/questionnaire/);
  await accessibility(page);
  await profile(page);
  await expect(card(page, learning).locator('.badge')).toHaveText('Potential match');
  await expect(page.getByText('1 potential match among 4 fictional scholarships.')).toBeVisible();
  await card(page, learning).getByText('Why this result', { exact: true }).click();
  await expect(
    card(page, learning)
      .getByText(/Your submitted answer:/)
      .first(),
  ).toBeVisible();
  await expect(
    card(page, learning)
      .getByText(/Fictional test condition:/)
      .first(),
  ).toBeVisible();
  await accessibility(page);
  await page.getByRole('link', { name: 'Edit answers', exact: true }).first().click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const select = page.getByLabel('Annual household income', { exact: true });
  const label = (await select.locator('option').allTextContents()).find(
    (text) => /^Above/.test(text) && !/up to/i.test(text),
  );
  await select.selectOption({ label });
  await page.getByRole('link', { name: 'Back to results', exact: true }).click();
  await expect(page.getByText('Your answers have changed.', { exact: true })).toBeVisible();
  await expect(card(page, learning).locator('.badge')).toHaveText('Potential match');
  await page.getByRole('link', { name: 'Review and resubmit your answers' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await expect(card(page, learning).locator('.badge')).toHaveText(
    'Does not meet a known condition',
  );
  await expect(page.getByText('Your answers have changed.', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Preview scenario')).toHaveCount(0);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
    })),
  ).toEqual({ local: 0, session: 0, cookie: '' });
  expect(externalRequests).toEqual([]);
  expect(personalRequests).toEqual([]);
  expect(consoleMessages.join(' ')).not.toMatch(
    /undergraduate|annualHouseholdIncome|250000|draftProfile/,
  );
  expect(pageErrors).toEqual([]);
});

test('honest uncertainty, manual alternatives, conditional documents and unknown dates', async ({
  page,
}) => {
  await profile(page, 'declined');
  await expect(card(page, learning).locator('.badge')).toHaveText('Needs verification');
  const next = card(page, 'Next Chapter Demo Grant');
  await next.getByText('Why this result', { exact: true }).click();
  await expect(
    next.getByText('An alternative is satisfied; the other alternatives are not required.'),
  ).toBeVisible();
  await expect(next.getByText('Manual check required')).toBeVisible();
  await expect(next.getByText(/Alternative\/exclusion context: Not satisfied/)).toBeVisible();
  await accessibility(page);
  await card(page, learning).getByRole('link', { name: 'View requirements' }).click();
  await expect(page.getByText('May be required — check this condition')).toBeVisible();
  await expect(page.getByText('Unknown — no confirmed deadline')).toBeVisible();
  await page.getByRole('checkbox').check();
  await expect(page.getByText('You marked 0 preparation tasks as done.')).toBeVisible();
  await accessibility(page);
});

test('preparation persists in memory, applicability changes and direct routes recover honestly', async ({
  page,
}) => {
  await profile(page, 'low');
  await card(page, learning).getByRole('link', { name: 'View requirements' }).click();
  await expect(page).toHaveURL(/scholarships\/demo-learning-pathways/);
  await expect(page.getByText('Required for the supplied answers', { exact: true })).toBeVisible();
  await page.getByRole('checkbox').check();
  await expect(page.getByText('You marked 1 preparation task as done.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to results' }).click();
  await card(page, learning).getByRole('link', { name: 'View requirements' }).click();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await accessibility(page);
  for (const link of await page.locator('a[target="_blank"]').all()) {
    expect(await link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(await link.getAttribute('href')).not.toMatch(/income|undergraduate|profile|\?/);
  }
  await page.getByRole('link', { name: 'Back to results' }).click();
  await page.getByRole('link', { name: 'Edit answers', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const select = page.getByLabel('Annual household income', { exact: true });
  const label = (await select.locator('option').allTextContents()).find(
    (text) => /^Above/.test(text) && /up to/i.test(text),
  );
  await select.selectOption({ label });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await card(page, learning).getByRole('link', { name: 'View requirements' }).click();
  await expect(page.getByRole('checkbox')).toBeDisabled();
  await expect(page.getByText('You marked 0 preparation tasks as done.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('No personal assessment in this session.')).toBeVisible();
  await expect(page.locator('.badge')).toHaveCount(0);
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await expect(page.getByRole('checkbox')).toBeDisabled();
  await accessibility(page);
  await page.goto('/results');
  await expect(page.getByRole('heading', { name: 'Let’s get to know you first.' })).toBeVisible();
  await page.goto('/scholarships/not-a-scheme');
  await expect(page.getByRole('heading', { name: 'We couldn’t find that page.' })).toBeVisible();
  await page.goto('/missing-page');
  await expect(page.getByRole('link', { name: 'Back to home', exact: true })).toBeVisible();
});

test('unknown answers, filters, school reset and responsive landing regressions', async ({
  page,
}) => {
  await page.goto('/questionnaire');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await page.getByRole('button', { name: /^Needs verification/ }).click();
  await expect(page.locator('.scheme-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Reset session' }).click();
  await expect(page.getByRole('heading', { name: 'Let’s get to know you first.' })).toBeVisible();
  await profile(page, 'low', 'School');
  await expect(card(page, 'New Horizons Demo Award').locator('.badge')).toHaveText(
    'Potential match',
  );
  await expect(card(page, 'Next Chapter Demo Grant').locator('.badge')).toHaveText(
    'Does not meet a known condition',
  );
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

test('isolated reviewed empty/error/quarantine and retry never switch to demo', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4174/questionnaire');
  await expect(
    page.getByRole('heading', { name: 'No scholarships in this catalogue.' }),
  ).toBeVisible();
  await page.getByLabel('Isolated test scenario').selectOption('invalid');
  await expect(
    page.getByRole('heading', { name: 'We couldn’t load the catalogue.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByRole('heading', { name: 'We couldn’t load the catalogue.' }),
  ).toBeVisible();
  await expect(page.locator('.scheme-card')).toHaveCount(0);
  await expect(
    page.getByText('Interactive demo · Fictional scholarships', { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('Isolated test scenario').selectOption('quarantine');
  await expect(page.getByText('Independent review is missing.')).toBeVisible();
  await page.getByLabel('Isolated test scenario').selectOption('retry');
  await expect(
    page.getByRole('heading', { name: 'We couldn’t load the catalogue.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByRole('heading', { name: 'No scholarships in this catalogue.' }),
  ).toBeVisible();
});

test('isolated strict income boundaries and score companions never invent certainty', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4174/questionnaire');
  await page.getByLabel('Isolated test scenario').selectOption('strict');
  await page.getByRole('radio', { name: 'Undergraduate degree', exact: true }).check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByLabel('Annual household income', { exact: true })
    .selectOption('income-open-100000-250000');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await expect(card(page, learning).locator('.badge')).toHaveText('Needs verification');
  await card(page, learning).getByText('Why this result', { exact: true }).click();
  await expect(
    card(page, learning).getByText(/Your selected range crosses the limit/),
  ).toBeVisible();
  await page.getByLabel('Isolated test scenario').selectOption('companions');
  await page.getByRole('link', { name: 'Start the questionnaire', exact: true }).click();
  await page.getByRole('radio', { name: 'Undergraduate degree', exact: true }).check();
  await page.getByLabel('Total course duration in years', { exact: true }).fill('3');
  await page.getByLabel('Current year of study', { exact: true }).selectOption('Year 2');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByLabel('Annual household income', { exact: true })
    .selectOption('income-closed-0-100000');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Examination score format', { exact: true }).selectOption('cgpa');
  await page.getByLabel('CGPA scale', { exact: true }).selectOption('cgpa-4');
  await page
    .getByLabel('Which examination does this score describe?', { exact: true })
    .selectOption('class-12-board');
  await page.getByLabel('Examination score', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert').first()).toContainText('from 0 to 4');
  await page.getByLabel('Examination score', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('0 out of 4', { exact: true })).toBeVisible();
  await accessibility(page);
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await expect(card(page, learning).locator('.badge')).toHaveText('Needs verification');
  await card(page, learning).getByText('Why this result', { exact: true }).click();
  await expect(
    card(page, learning).getByText('Your score uses a different scale; it has not been converted.'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Edit answers', exact: true }).first().click();
  await page.getByRole('radio', { name: 'School', exact: true }).check();
  await expect(page.getByLabel('Total course duration in years', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Current school class', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Examination score format', { exact: true })).toHaveValue('');
});

test('keyboard activation completes the minimal questionnaire with focused step headings', async ({
  page,
}) => {
  await page.goto('/questionnaire');
  await page.getByRole('radio', { name: 'Undergraduate degree', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Continue', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'A little about your household.' })).toBeFocused();
  await page.getByLabel('Annual household income', { exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Continue', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Does everything look right?' })).toBeFocused();
  await page.getByRole('button', { name: 'Show My Scholarships' }).focus();
  await page.keyboard.press('Enter');
  await expect(card(page, learning).locator('.badge')).toHaveText('Potential match');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});
