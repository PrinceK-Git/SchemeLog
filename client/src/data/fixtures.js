export const assessmentGroups = [
  {
    id: 'potential',
    title: 'Potential match',
    icon: 'check',
    description: 'Example of all evaluated conditions being satisfied.',
  },
  {
    id: 'verification',
    title: 'Needs verification',
    icon: 'clock',
    description: 'Example of a requirement that still needs checking.',
  },
  {
    id: 'unmet',
    title: 'Does not meet a known condition',
    icon: 'minus',
    description: 'Example of an unmet mandatory condition.',
  },
  {
    id: 'unavailable',
    title: 'Information unavailable',
    icon: 'info',
    description: 'Example of insufficient scheme information.',
  },
];
export const schemes = [
  {
    id: 'learning-pathways',
    name: 'Learning Pathways Scholarship',
    short: 'LP',
    classification: 'Central · illustrative',
    category: 'Higher education',
    status: 'potential',
    summary:
      'An example of how support for tuition and study expenses could appear in your results.',
    benefit: 'Tuition & study support',
    amount: 'Amount not verified',
    authority: 'Fictional Education Council',
    applicationStatus: 'Unknown',
    deadline: 'Not verified',
    explanation:
      'This example shows the potential-match layout. Its prewritten assessment is not calculated from your answers and does not establish eligibility.',
    conditions: ['Illustrative course requirement', 'Illustrative household-income requirement'],
    exclusion: 'No real exclusions have been verified for this fictional example.',
    rules: [
      {
        label: 'Course requirement',
        state: 'pass',
        text: 'Example satisfied condition — not a comparison with your course.',
      },
      {
        label: 'Household-income requirement',
        state: 'pass',
        text: 'Example satisfied condition — no real income threshold is applied.',
      },
    ],
    documents: [
      {
        id: 'admission',
        title: 'Admission or bonafide certificate',
        status: 'Confirmed in demo',
        note: 'Illustrates a confirmed requirement; not verified for a real scheme.',
      },
      {
        id: 'income',
        title: 'Income certificate',
        status: 'Confirmed in demo',
        note: 'Illustrative preparation task. No upload is needed.',
      },
      {
        id: 'marks',
        title: 'Previous examination marksheet',
        status: 'Needs verification',
        note: 'Check which examination and document format the official guidance specifies.',
      },
    ],
  },
  {
    id: 'next-chapter',
    name: 'Next Chapter Education Grant',
    short: 'NC',
    classification: 'State · illustrative',
    category: 'Continuing education',
    status: 'verification',
    summary: 'An example with an institution requirement that needs a little more information.',
    benefit: 'Education assistance',
    amount: 'Amount not verified',
    authority: 'Fictional Student Support Department',
    applicationStatus: 'Unknown',
    deadline: 'Not verified',
    explanation:
      'This example illustrates an unresolved institution condition. It does not evaluate your institution, domicile, or personal eligibility.',
    conditions: [
      'Illustrative domicile requirement',
      'Institution recognition requires an official check',
    ],
    exclusion: 'Exclusions require verification against applicable guidelines.',
    rules: [
      {
        label: 'Domicile requirement',
        state: 'pass',
        text: 'Illustrative satisfied condition, not a finding about your domicile.',
      },
      {
        label: 'Institution recognition',
        state: 'unknown',
        text: 'A real assessment would require verified institution criteria.',
      },
    ],
    documents: [
      {
        id: 'domicile',
        title: 'Domicile or residence certificate',
        status: 'Confirmed in demo',
        note: 'The applicable certificate must be checked in real guidelines.',
      },
      {
        id: 'category',
        title: 'Category certificate',
        status: 'Conditional',
        note: 'May be required if the relevant category condition applies. Applicability is unverified in this demo.',
      },
      {
        id: 'admission',
        title: 'Institution recognition / admission evidence',
        status: 'Needs verification',
        note: 'Confirm the official requirements before preparing documents.',
      },
    ],
  },
  {
    id: 'foundation-award',
    name: 'Foundation Study Award',
    short: 'FS',
    classification: 'State · illustrative',
    category: 'School education',
    status: 'unmet',
    summary: 'An example showing how an unmet study-level condition would be explained.',
    benefit: 'Study materials support',
    amount: 'Amount not verified',
    authority: 'Fictional School Education Board',
    applicationStatus: 'Closed · demo only',
    deadline: 'No real date verified',
    explanation:
      'The unmet condition is part of this fictional scenario. It is not a judgment about your answers or your eligibility for real scholarships.',
    conditions: ['Illustrative school-stage condition'],
    exclusion: 'This fixture demonstrates a study-stage exclusion only.',
    rules: [
      {
        label: 'Current study stage',
        state: 'fail',
        text: 'Example unmet condition — no real stage requirement is being applied to your profile.',
      },
    ],
    documents: [
      {
        id: 'marks',
        title: 'School marksheet',
        status: 'Needs verification',
        note: 'The real document requirements are unknown.',
      },
    ],
  },
  {
    id: 'open-horizons',
    name: 'Open Horizons Study Support',
    short: 'OH',
    classification: 'Classification unknown',
    category: 'Further opportunities',
    status: 'unavailable',
    summary: 'An example of a record with too little verified information to assess.',
    benefit: 'Benefit information unavailable',
    amount: 'Not verified',
    authority: 'Authority not verified · fictional record',
    applicationStatus: 'Unknown',
    deadline: 'Not verified',
    explanation:
      'There is not enough information in this example to demonstrate a meaningful assessment. Missing information must never be treated as satisfied.',
    conditions: ['Eligibility information is unavailable'],
    exclusion: 'Exclusions are unknown.',
    rules: [
      {
        label: 'Scheme requirements',
        state: 'unknown',
        text: 'No verified rule set is available for this fictional entry.',
      },
    ],
    documents: [
      {
        id: 'guidelines',
        title: 'Check the applicable document list',
        status: 'Needs verification',
        note: 'Use the real scheme’s official guidelines when available.',
      },
    ],
  },
];
