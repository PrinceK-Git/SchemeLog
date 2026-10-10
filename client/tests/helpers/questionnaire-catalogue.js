import { demoCatalogue } from '../../src/data/demo-catalogue.js';

/** Test-only, independently cloned catalogues; never change the shipped demo. */
export function makeQuestionnaireCatalogue(scenario = 'all-fields') {
  if (!['all-fields', 'minimal', 'documents-only', 'empty'].includes(scenario))
    throw new TypeError(`Unknown questionnaire fixture scenario: ${scenario}`);
  const catalogue = structuredClone(demoCatalogue);
  catalogue.catalogueVersion = `demo-questionnaire-${scenario}`;
  catalogue.schemes = scenario === 'empty' ? [] : [catalogue.schemes[0]];
  catalogue.coverage = {
    schemeCount: catalogue.schemes.length,
    statement: 'Isolated fictional questionnaire test conditions; not government requirements.',
  };
  if (scenario === 'empty') return catalogue;

  const record = catalogue.schemes[0];
  record.testConditions = [];
  record.documents = [];
  const group = (id, operator, children) => ({
    id: `r-questionnaire-${id}`,
    operator,
    explanationKey: `test.questionnaire.${id}`,
    ...(operator === 'not' ? { child: children[0] } : { children }),
  });
  const leaf = (id, field, value, text, extra = {}) => {
    const reference = `src-questionnaire-${id}#loc-condition`;
    record.testConditions.push({ id: reference, label: 'Fictional test condition', text });
    return {
      id: `r-questionnaire-${id}`,
      operator: 'eq',
      field,
      value,
      explanationKey: `test.questionnaire.${id}`,
      evidence: [reference],
      ...extra,
    };
  };
  const education = leaf(
    'education',
    'educationLevel',
    'undergraduate',
    'Undergraduate study satisfies this fictional questionnaire condition.',
  );
  const income = leaf(
    'income',
    'annualHouseholdIncome',
    250000,
    'Annual household income must not exceed INR 250000 in this fictional questionnaire.',
    { operator: 'lte', unit: 'INR/year' },
  );
  record.eligibility.rule = group('root', 'allOf', [education, income]);
  record.eligibility.coverage = 'complete';
  if (scenario === 'minimal') return catalogue;

  record.eligibility.rule.children.push(
    group('study', 'allOf', [
      leaf(
        'course',
        'courseCode',
        'ug-arts',
        'The undergraduate arts course code satisfies this fictional condition.',
      ),
      leaf('year', 'studyYear', 1, 'Course year one or later satisfies this fictional condition.', {
        operator: 'gte',
        unit: 'course-year',
      }),
      leaf(
        'score',
        'academicScore',
        60,
        'A Class 12 board percentage score of at least 60 satisfies this fictional condition.',
        { operator: 'gte', scale: 'percentage', context: 'class-12-board' },
      ),
    ]),
    group('domicile', 'anyOf', [
      leaf(
        'assam',
        'domicileState',
        'IN-AS',
        'Assam domicile satisfies this fictional alternative.',
      ),
      leaf(
        'bihar',
        'domicileState',
        'IN-BR',
        'Bihar domicile satisfies this fictional alternative.',
      ),
    ]),
    group('declarations', 'allOf', [
      leaf(
        'other-scholarship',
        'additionalAnswers.receivesOtherScholarship',
        'no',
        'No other scholarship satisfies this fictional condition.',
      ),
      leaf(
        'full-time',
        'additionalAnswers.isRegularFullTimeStudent',
        'yes',
        'Regular full-time enrolment satisfies this fictional condition.',
      ),
      group('not-distance', 'not', [
        leaf(
          'distance',
          'additionalAnswers.studiesThroughDistanceMode',
          'yes',
          'Distance study is excluded by this fictional condition.',
        ),
      ]),
    ]),
  );
  const appliesWhen = group('document-root', 'allOf', [
    leaf(
      'institution',
      'institutionType',
      'govt',
      'Government institution attendance activates this fictional preparation task.',
    ),
    group('document-category', 'anyOf', [
      leaf('general', 'category', 'general', 'General category activates this fictional task.'),
      leaf('obc', 'category', 'obc', 'OBC category activates this fictional task.'),
    ]),
    group('document-declarations', 'allOf', [
      leaf(
        'state-scholarship',
        'additionalAnswers.receivesOtherStateScholarship',
        'no',
        'No state scholarship activates this fictional preparation task.',
      ),
      group('not-government-parent', 'not', [
        leaf(
          'government-parent',
          'additionalAnswers.isParentGovernmentEmployee',
          'yes',
          'A government-employed parent makes this fictional preparation task inapplicable.',
        ),
      ]),
    ]),
  ]);
  record.documents = [
    {
      id: 'doc-questionnaire-support',
      type: 'income-certificate',
      title: 'Fictional questionnaire supporting document',
      requirement: 'conditional',
      appliesWhen,
      evidence: ['src-questionnaire-institution#loc-condition'],
    },
  ];
  if (scenario === 'documents-only') {
    record.eligibility.rule = null;
    record.eligibility.coverage = 'unusable';
  }
  return catalogue;
}
