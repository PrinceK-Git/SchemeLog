// Static data only. No server loader, source record, filesystem or publication code enters Vite.
import states from '../../../server/src/data/vocab/states.json' with { type: 'json' };
import levels from '../../../server/src/data/vocab/education-levels.json' with { type: 'json' };
import courses from '../../../server/src/data/vocab/courses.json' with { type: 'json' };
import categories from '../../../server/src/data/vocab/categories.json' with { type: 'json' };
import institutions from '../../../server/src/data/vocab/institution-types.json' with { type: 'json' };
import scales from '../../../server/src/data/vocab/score-scales.json' with { type: 'json' };
import contexts from '../../../server/src/data/vocab/exam-contexts.json' with { type: 'json' };
import stages from '../../../server/src/data/vocab/school-stages.json' with { type: 'json' };
import documents from '../../../server/src/data/vocab/document-types.json' with { type: 'json' };

export function createVocabularies(inputs) {
  const files = Object.fromEntries(inputs.map((file) => [file.vocabulary, file]));
  return {
    version: [...new Set(inputs.map((file) => file.vocabVersion))].sort().join('+'),
    files,
    codes: Object.fromEntries(
      inputs.map((file) => [file.vocabulary, new Set(file.entries.map((entry) => entry.code))]),
    ),
  };
}

export const vocabularies = createVocabularies([
  states,
  levels,
  courses,
  categories,
  institutions,
  scales,
  contexts,
  stages,
  documents,
]);
