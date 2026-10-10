import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADDITIONAL_FIELDS, PROFILE_FIELDS } from '../../src/domain/profile/fields.js';
import { fieldLabels } from '../../src/data/questions.js';
import { vocabularies } from '../../src/data/vocabularies.js';

const learning = 'Learning Pathways Demo Scholarship';
const control = (page, label) => page.getByLabel(label, { exact: true });
const next = (page) => page.getByRole('button', { name: 'Continue', exact: true }).click();
const review = (page) => page.getByRole('heading', { name: 'Does everything look right?' });
const displayedAnswer = (container, label) =>
  container.getByText(label, { exact: true }).locator('..').locator('dd');
const declarations = Object.entries(ADDITIONAL_FIELDS);
const progress = (page) => page.getByRole('list', { name: 'Questionnaire progress' });

async function start(page, scenario = 'all-fields') {
  await page.goto('http://127.0.0.1:4174/questionnaire');
  await page
    .getByRole('combobox', { name: 'Isolated test scenario', exact: true })
    .selectOption(scenario);
  await expect(progress(page)).toBeVisible();
}

async function accessibility(page) {
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    report.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

async function numericStatuses(page, label) {
  const number = control(page, label);
  const status = control(page, `${label} answer status`);
  await expect(number).toBeVisible();
  await expect(status.locator('option')).toHaveText([
    'Enter a value',
    "I'm not sure",
    'Prefer not to answer',
  ]);
  for (const value of ['unknown', 'declined']) {
    await status.selectOption(value);
    await expect(number).toBeDisabled();
    await expect(number).toHaveValue('');
  }
  await status.selectOption('known');
  await expect(number).toBeEnabled();
  await expect(number).toHaveValue('');
}

async function knownEducation(page) {
  await page.getByRole('radio', { name: 'Undergraduate degree', exact: true }).check();
  await control(page, 'Course or stream').selectOption('ug-arts');
  await control(page, 'Total course duration in years').fill('3');
  await control(page, 'Current year of study').selectOption('Year 2');
  await next(page);
  await control(page, 'Home state / domicile').selectOption('IN-AS');
  await next(page);
  await control(page, 'Annual household income').selectOption({
    label: 'Up to ₹2,50,000 per year',
  });
  await next(page);
}

async function knownDetails(page, score = '75') {
  await control(page, 'Institution type').selectOption('govt');
  await control(page, 'Category').selectOption('general');
  await control(page, 'Examination score format').selectOption('percentage');
  await expect(control(page, 'CGPA scale')).toHaveCount(0);
  await control(page, 'Which examination does this score describe?').selectOption('class-12-board');
  await control(page, 'Examination score').fill(score);
  for (const [key, declaration] of declarations)
    await control(page, declaration.label).selectOption(
      key === 'isRegularFullTimeStudent' ? 'yes' : 'no',
    );
  await next(page);
  await expect(review(page)).toBeVisible();
}

test('planned controls remain reachable with blank, unknown and declined parent answers', async ({
  page,
}) => {
  await start(page);
  await expect(progress(page).locator('li')).toHaveCount(5);
  await expect(progress(page).locator('[aria-current="step"]')).toContainText('Education');
  for (const state of ['', 'unknown', 'declined']) {
    if (state) await page.locator(`input[name="educationLevel"][value="${state}"]`).check();
    await expect(control(page, 'Course or stream')).toBeVisible();
    const courses = await control(page, 'Course or stream')
      .locator('option')
      .evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    expect(courses).toEqual([...vocabularies.codes.courses, 'unknown', 'declined']);
    await expect(control(page, 'Current year or school class')).toBeVisible();
    const years = await control(page, 'Current year or school class')
      .locator('option')
      .allTextContents();
    for (const value of ['Class 9', 'Class 12', 'Year 1', 'Year 12'])
      expect(years).toContain(value);
    await expect(control(page, 'Total course duration in years')).toBeVisible();
  }
  await numericStatuses(page, 'Total course duration in years');
  await accessibility(page);
  await next(page);
  await expect(control(page, 'Home state / domicile')).toBeVisible();
  await next(page);
  await expect(control(page, 'Annual household income')).toBeVisible();
  await next(page);
  for (const label of [
    'Institution type',
    'Category',
    'Which examination does this score describe?',
    ...declarations.map(([, declaration]) => declaration.label),
  ])
    await expect(control(page, label)).toBeVisible();
  for (const state of ['', 'unknown', 'declined', 'cgpa']) {
    await control(page, 'Examination score format').selectOption(state);
    await expect(control(page, 'CGPA scale')).toBeVisible();
    await expect(control(page, 'Examination score')).toBeVisible();
    await expect(page.getByText('points (scale unconfirmed)', { exact: true })).toBeVisible();
  }
  await numericStatuses(page, 'Examination score');
  for (const state of ['unknown', 'declined']) {
    await control(page, 'CGPA scale').selectOption(state);
    await expect(control(page, 'Examination score')).toBeVisible();
    await expect(page.getByText('points (scale unconfirmed)', { exact: true })).toBeVisible();
  }
  for (const state of ['percentage', 'percentile']) {
    await control(page, 'Examination score format').selectOption(state);
    await expect(control(page, 'CGPA scale')).toHaveCount(0);
    await expect(control(page, 'Examination score')).toBeVisible();
  }
  await accessibility(page);
});

test('review includes every unanswered active control and back/edit preserves progress', async ({
  page,
}) => {
  await start(page);
  for (let step = 0; step < 4; step++) await next(page);
  await expect(review(page)).toBeFocused();
  await expect(progress(page).locator('[aria-current="step"]')).toContainText('Review answers');
  const labels = [
    'Current level of study',
    'Course or stream',
    'Total course duration in years',
    'Current year or school class',
    'Home state / domicile',
    'Annual household income',
    'Institution type',
    'Category',
    'Examination score format',
    'CGPA scale',
    'Which examination does this score describe?',
    'Examination score',
    ...declarations.map(([, declaration]) => declaration.label),
  ];
  await expect(page.locator('.answer-review dt')).toHaveCount(labels.length);
  for (const label of labels)
    await expect(displayedAnswer(page.locator('.answer-review'), label)).toHaveText('Not answered');
  await accessibility(page);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(progress(page).locator('[aria-current="step"]')).toContainText('Other details');
  await control(page, 'Category').selectOption('general');
  await next(page);
  await page.getByRole('button', { name: 'Edit education answers', exact: true }).click();
  await expect(progress(page).locator('[aria-current="step"]')).toContainText('Education');
  await expect(control(page, 'Course or stream')).toBeVisible();
  await expect(control(page, 'Total course duration in years')).toHaveValue('');
  for (let step = 0; step < 4; step++) await next(page);
  await expect(displayedAnswer(page.locator('.answer-review'), 'Category')).toHaveText('General');
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await expect(page.locator('.scheme-card')).toHaveCount(1);
  await expect(page.locator('.scheme-card .badge')).toHaveText('Needs verification');
  for (const field of Object.keys(PROFILE_FIELDS))
    await expect(displayedAnswer(page.locator('.profile-card'), fieldLabels[field])).toHaveText(
      field === 'category' ? 'General' : 'Not sure',
    );
  for (const [, declaration] of declarations)
    await expect(displayedAnswer(page.locator('.profile-card'), declaration.label)).toHaveText(
      'Not sure',
    );
  await accessibility(page);
});

test('explicit numeric uncertainty survives review and submission without inventing zero', async ({
  page,
}) => {
  await start(page);
  await page.getByRole('radio', { name: 'Undergraduate degree', exact: true }).check();
  await control(page, 'Total course duration in years answer status').selectOption('unknown');
  await control(page, 'Current year of study').selectOption('Year 2');
  await next(page);
  await next(page);
  await next(page);
  await control(page, 'Examination score format').selectOption('percentage');
  await control(page, 'Which examination does this score describe?').selectOption('class-12-board');
  await control(page, 'Examination score answer status').selectOption('declined');
  await next(page);
  await expect(
    displayedAnswer(page.locator('.answer-review'), 'Total course duration in years'),
  ).toHaveText("I'm not sure");
  await expect(displayedAnswer(page.locator('.answer-review'), 'Examination score')).toHaveText(
    'Prefer not to answer',
  );
  await page.getByRole('button', { name: 'Edit other details answers', exact: true }).click();
  await expect(control(page, 'Examination score answer status')).toHaveValue('declined');
  await expect(control(page, 'Examination score')).toBeDisabled();
  await next(page);
  await page.getByRole('button', { name: 'Show My Scholarships' }).click();
  await expect(
    displayedAnswer(page.locator('.profile-card'), 'Academic examination score'),
  ).toHaveText('Prefer not to answer');
  await expect(
    displayedAnswer(page.locator('.profile-card'), 'Current year or school class'),
  ).toHaveText('Not sure');
  await expect(page.locator('.scheme-card .badge')).toHaveText('Needs verification');
  await accessibility(page);
});

for (const score of ['75', '0']) {
  test(`known answers normalize and assess without missing fields, including score ${score}`, async ({
    page,
  }) => {
    await start(page);
    await knownEducation(page);
    await knownDetails(page, score);
    await expect(displayedAnswer(page.locator('.answer-review'), 'Examination score')).toHaveText(
      `${score}%`,
    );
    await page.getByRole('button', { name: 'Show My Scholarships' }).click();
    await expect(page.locator('.scheme-card')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: learning, exact: true })).toBeVisible();
    await expect(page.locator('.scheme-card .badge')).toHaveText(
      score === '0' ? 'Does not meet a known condition' : 'Potential match',
    );
    await expect(page.getByText('Answer needs clarification', { exact: true })).toHaveCount(0);
    const answers = page.locator('.profile-card');
    await expect(answers.locator('dt')).toHaveCount(
      Object.keys(PROFILE_FIELDS).length + declarations.length,
    );
    await expect(displayedAnswer(answers, 'Course or stream')).toHaveText(
      'Undergraduate arts or humanities',
    );
    await expect(displayedAnswer(answers, 'Current year or school class')).toHaveText(
      'Year 2 of 3',
    );
    await expect(displayedAnswer(answers, 'Academic examination score')).toContainText(`${score}%`);
    for (const [label, value] of [
      ['Current level of study', 'Undergraduate degree'],
      ['Home state / domicile', 'Assam'],
      ['Annual household income', 'At least ₹0 and up to ₹2,50,000 per year'],
      ['Institution type', 'Government institution'],
      ['Category', 'General'],
      ...declarations.map(([key, declaration]) => [
        declaration.label,
        key === 'isRegularFullTimeStudent' ? 'Yes' : 'No',
      ]),
    ])
      await expect(displayedAnswer(answers, label)).toHaveText(value);
    await accessibility(page);
    await page.getByRole('link', { name: 'View requirements' }).click();
    await expect(
      page.getByText('Fictional questionnaire supporting document', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Required for the supplied answers', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('checkbox')).toBeEnabled();
    await accessibility(page);
    if (score === '75') {
      await page.getByRole('link', { name: 'Back to results', exact: true }).click();
      await page.getByRole('link', { name: 'Edit answers', exact: true }).click();
      for (let step = 0; step < 3; step++) await next(page);
      await control(page, 'Category').selectOption('sc');
      await next(page);
      await page.getByRole('button', { name: 'Show My Scholarships' }).click();
      await expect(page.locator('.scheme-card .badge')).toHaveText('Potential match');
      await page.getByRole('link', { name: 'View requirements' }).click();
      await expect(page.getByRole('checkbox')).toBeDisabled();
    }
  });
}

test('school transition clears dependent year and duration but retains unrelated answers', async ({
  page,
}) => {
  await start(page);
  await knownEducation(page);
  await knownDetails(page);
  await page.getByRole('button', { name: 'Edit education answers', exact: true }).click();
  await page.getByRole('radio', { name: 'School', exact: true }).check();
  await expect(control(page, 'Total course duration in years')).toHaveCount(0);
  await expect(control(page, 'Total course duration in years answer status')).toHaveCount(0);
  await expect(control(page, 'Current school class')).toHaveValue('');
  await expect(control(page, 'Course or stream')).toHaveValue('');
  await control(page, 'Course or stream').selectOption('school-higher-secondary');
  await control(page, 'Current school class').selectOption('Class 12');
  await next(page);
  await expect(control(page, 'Home state / domicile')).toHaveValue('IN-AS');
  await next(page);
  await expect(control(page, 'Annual household income')).not.toHaveValue('');
  await next(page);
  await expect(control(page, 'Institution type')).toHaveValue('govt');
  await expect(control(page, 'Category')).toHaveValue('general');
  for (const [key, declaration] of declarations)
    await expect(control(page, declaration.label)).toHaveValue(
      key === 'isRegularFullTimeStudent' ? 'yes' : 'no',
    );
  await expect(control(page, 'Examination score format')).toHaveValue('');
  await expect(control(page, 'Examination score')).toBeVisible();
  await next(page);
  await expect(displayedAnswer(page.locator('.answer-review'), 'Current school class')).toHaveText(
    'Class 12',
  );
  await expect(
    page.locator('.answer-review').getByText('Total course duration in years', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit education answers', exact: true }).click();
  await page.getByRole('radio', { name: 'Undergraduate degree', exact: true }).check();
  await expect(control(page, 'Total course duration in years')).toHaveValue('');
  await expect(control(page, 'Current year of study')).toHaveValue('');
  await accessibility(page);
});

test('minimal catalogue asks exactly education and income, with no unrelated controls', async ({
  page,
}) => {
  await start(page, 'minimal');
  await expect(progress(page).locator('li')).toHaveCount(3);
  await expect(page.locator('.fields select, .fields input[type="number"]')).toHaveCount(0);
  await page.getByRole('radio', { name: 'Undergraduate degree', exact: true }).check();
  await expect(page.locator('.fields select, .fields input[type="number"]')).toHaveCount(0);
  await accessibility(page);
  await next(page);
  await expect(page.locator('.fields select')).toHaveCount(1);
  await expect(control(page, 'Annual household income')).toBeVisible();
  await next(page);
  await expect(page.locator('.answer-review dt')).toHaveText([
    'Current level of study',
    'Annual household income',
  ]);
  await accessibility(page);
});

test('document-only fields create their own controls without unrelated eligibility questions', async ({
  page,
}) => {
  await start(page, 'documents-only');
  await expect(progress(page).locator('li')).toHaveCount(2);
  await expect(page.locator('.fields select')).toHaveCount(4);
  await expect(page.locator('.fields input')).toHaveCount(0);
  for (const label of [
    'Institution type',
    'Category',
    ADDITIONAL_FIELDS.receivesOtherStateScholarship.label,
    ADDITIONAL_FIELDS.isParentGovernmentEmployee.label,
  ])
    await expect(control(page, label)).toBeVisible();
  await next(page);
  await expect(page.locator('.answer-review dt')).toHaveCount(4);
  await accessibility(page);
});

test('empty reviewed catalogue does not collect unrelated answers', async ({ page }) => {
  await page.goto('http://127.0.0.1:4174/questionnaire');
  await page
    .getByRole('combobox', { name: 'Isolated test scenario', exact: true })
    .selectOption('empty');
  await expect(
    page.getByRole('heading', { name: 'No scholarships in this catalogue.' }),
  ).toBeVisible();
  await expect(progress(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show My Scholarships' })).toHaveCount(0);
  await expect(page.locator('.questionnaire-card input, .questionnaire-card select')).toHaveCount(
    0,
  );
  await expect(page.locator('.answer-review dt')).toHaveCount(0);
  await accessibility(page);
});
