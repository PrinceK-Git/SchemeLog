const option = (value, label) => ({ value, label });
export const unknown = option('unknown', "I'm not sure");
export const declined = option('declined', 'Prefer not to answer');
export const educationOptions = [
  option('school', 'School'),
  option('undergraduate', 'Undergraduate degree'),
  option('postgraduate', 'Postgraduate degree'),
  option('diploma', 'Diploma / technical education'),
  option('other', 'Other'),
  unknown,
];
const courseOptions = {
  school: ['Secondary school', 'Higher secondary school'],
  undergraduate: [
    'Arts / humanities',
    'Science',
    'Commerce',
    'Engineering',
    'Medicine / health sciences',
    'Other undergraduate course',
  ],
  postgraduate: [
    'Arts / humanities',
    'Science',
    'Commerce / management',
    'Engineering',
    'Other postgraduate course',
  ],
  diploma: ['Technical diploma', 'Vocational training', 'Other diploma'],
};
const states = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];
export const sectionDefinitions = [
  {
    id: 'education',
    short: 'Education',
    title: 'Let’s start with your studies.',
    description: 'A little context helps make scholarship requirements easier to understand.',
    fields: ['educationLevel', 'course', 'studyYear'],
  },
  {
    id: 'location',
    short: 'Domicile',
    title: 'Where is your home state?',
    description:
      'Some schemes depend on your domicile, which may be different from where you study.',
    fields: ['domicile'],
  },
  {
    id: 'income',
    short: 'Household',
    title: 'A little about your household.',
    description:
      'Choose an annual income range, or leave this unknown. No income certificate is needed here.',
    fields: ['income'],
  },
  {
    id: 'details',
    short: 'Other details',
    title: 'Just a few more details.',
    description:
      'These questions demonstrate information a scheme may need. You can choose not to share.',
    fields: ['institution', 'category', 'scoreType', 'score'],
  },
];
export function fieldsFor(profile) {
  const course = courseOptions[profile.educationLevel];
  const academic = ['undergraduate', 'postgraduate', 'diploma'].includes(profile.educationLevel);
  return {
    educationLevel: { label: 'Current level of study', type: 'radio', options: educationOptions },
    course: {
      label: 'Course or stream',
      visible: Boolean(course),
      options: [...(course || []).map((v) => option(v, v)), unknown],
    },
    studyYear: {
      label: profile.educationLevel === 'school' ? 'Current school stage' : 'Current year of study',
      visible: Boolean(course),
      options: [
        ...(profile.educationLevel === 'school'
          ? ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'Other class']
          : ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5 or later']
        ).map((v) => option(v, v)),
        unknown,
      ],
      hint: 'Your current stage of education, not the scholarship application year.',
    },
    domicile: {
      label: 'State or union territory of domicile',
      options: [...states.map((v) => option(v, v)), unknown],
      hint: 'Domicile is your legally recognized home state. Check your certificate if you are unsure; do not automatically use your college’s location.',
    },
    income: {
      label: 'Annual household income',
      options: [
        option('under-1', 'Below ₹1,00,000'),
        option('1-2.5', '₹1,00,000 to ₹2,50,000'),
        option('2.5-5', 'Above ₹2,50,000 to ₹5,00,000'),
        option('over-5', 'Above ₹5,00,000'),
        unknown,
        declined,
      ],
      hint: 'Total household income over a year, not a month. These are illustrative bands for this demo, not scheme eligibility thresholds.',
    },
    institution: {
      label: 'Institution type',
      options: ['Government', 'Government-aided', 'Private', 'Other']
        .map((v) => option(v, v))
        .concat(unknown),
      hint: 'Institution type does not confirm recognition or accreditation.',
    },
    category: {
      label: 'Category',
      options: ['General', 'SC', 'ST', 'OBC', 'EWS', 'Other']
        .map((v) => option(v, v))
        .concat(unknown, declined),
      hint: 'Some schemes ask about category. This optional demo answer is kept only in this tab’s memory.',
    },
    scoreType: {
      label: 'Previous examination score format',
      visible: academic,
      options: [option('percentage', 'Percentage'), option('cgpa', 'CGPA'), unknown, declined],
      hint: 'This demo asks about your most recently completed examination. Real schemes may specify a different examination.',
    },
    score: {
      label: 'Previous examination percentage',
      type: 'number',
      visible: academic && profile.scoreType === 'percentage',
      hint: 'Enter a number from 0 to 100, or leave blank if you are unsure. CGPA is never converted automatically.',
    },
  };
}
export function visibleSections(profile) {
  const definitions = fieldsFor(profile);
  return sectionDefinitions
    .map((s) => ({ ...s, fields: s.fields.filter((id) => definitions[id].visible !== false) }))
    .filter((s) => s.fields.length);
}
export function updateAnswer(profile, field, value) {
  const next = { ...profile, [field]: value };
  if (field === 'educationLevel' && value !== profile.educationLevel) {
    for (const dependent of ['course', 'studyYear', 'scoreType', 'score']) delete next[dependent];
  }
  if (field === 'scoreType' && value !== 'percentage') delete next.score;
  return next;
}
export function validateAnswers(profile, fieldIds = Object.keys(fieldsFor(profile))) {
  const errors = {};
  const definitions = fieldsFor(profile);
  for (const id of fieldIds) {
    const field = definitions[id];
    const value = profile[id];
    if (!field || field.visible === false || value == null || value === '') continue;
    if (field.type === 'number') {
      if (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)
        errors[id] = 'Enter a percentage between 0 and 100, or leave it blank.';
    } else if (!field.options.some((o) => o.value === value))
      errors[id] = 'Choose one of the available answers, or leave this unknown.';
  }
  return errors;
}
export function answerLabel(profile, id) {
  const value = profile[id];
  if (value == null || value === '') return 'Not answered';
  const definition = fieldsFor(profile)[id];
  return (
    definition?.options?.find((o) => o.value === value)?.label ||
    (id === 'score' ? `${value}%` : value)
  );
}
export function normalizeProfile(profile) {
  const definitions = fieldsFor(profile);
  return Object.fromEntries(
    Object.entries(profile).filter(([id]) => definitions[id] && definitions[id].visible !== false),
  );
}
