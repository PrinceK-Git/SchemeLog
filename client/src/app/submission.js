import { normalizeProfile } from '../domain/profile/normalize.js';
import { evaluateCatalogue, evaluateRule, ENGINE_VERSION } from '../domain/eligibility/evaluate.js';
import { createEvidenceResolver } from '../domain/validation/scheme.js';
import { effectiveFreshness } from '../domain/freshness.js';
import { vocabularies } from '../data/vocabularies.js';
import { demoContext } from '../data/demo-catalogue.js';
import { fieldsFor } from '../data/questions.js';

export const preparationKey = (record, document) =>
  `${record.id}:${record.recordVersion}:${document.id}`;

export function evaluateDocuments(profile, catalogue, context) {
  const applicability = {};
  for (const record of catalogue.schemes) {
    const resolveEvidence = createEvidenceResolver(record, context.mode);
    for (const document of record.documents) {
      const options = {
        context,
        inheritedFreshness: record.eligibility.freshness,
        resolveEvidence,
      };
      applicability[preparationKey(record, document)] = document.appliesWhen
        ? evaluateRule(profile, document.appliesWhen, options)
        : {
            outcome:
              document.requirement === 'confirmed' &&
              effectiveFreshness(record.eligibility.freshness, context).state === 'current' &&
              document.evidence.length > 0 &&
              document.evidence.every((ref) => resolveEvidence(ref))
                ? 'pass'
                : 'unknown',
            ruleResults: [],
          };
    }
  }
  return applicability;
}

export function preparationCounts(record, applicability, progress) {
  const keys = record.documents.map((document) => preparationKey(record, document));
  const applicable = keys.filter((key) => applicability[key]?.outcome === 'pass');
  return {
    applicable: applicable.length,
    completed: applicable.filter((key) => progress[key] === true).length,
    unknown: keys.filter((key) => applicability[key]?.outcome === 'unknown').length,
  };
}

/** Event-boundary transaction. No clock, storage or reducer side effects. */
export function createSubmission(
  {
    draftProfile,
    draftRevision,
    presentedFields,
    catalogueLoad,
    questionPlan,
    evaluatedAt,
    currentCycles = {},
  },
  { evaluate = evaluateCatalogue } = {},
) {
  const { catalogue, mode } = catalogueLoad;
  if (!catalogue.schemes.length || questionPlan.catalogueVersion !== catalogue.catalogueVersion)
    throw new Error('A current, nonempty catalogue and question plan are required.');
  const definitions = fieldsFor(draftProfile, questionPlan);
  const askedFields = [...new Set(presentedFields)].filter(
    (field) => definitions[field] && definitions[field].visible !== false,
  );
  const normalized = normalizeProfile(draftProfile, {
    askedFields,
    incomeBands: questionPlan.incomeBands,
    vocab: vocabularies,
  });
  if (!normalized.ok) return normalized;
  const context = {
    mode,
    catalogueVersion: catalogue.catalogueVersion,
    engineVersion: ENGINE_VERSION,
    evaluatedAt: mode === 'demo' ? catalogue.evaluatedAt : evaluatedAt,
    currentCycles: mode === 'demo' ? demoContext.currentCycles : currentCycles,
  };
  const assessments = evaluate(normalized.profile, catalogue, context);
  const documentApplicability = evaluateDocuments(normalized.profile, catalogue, context);
  return {
    ok: true,
    submission: structuredClone({
      submittedRevision: draftRevision,
      profile: normalized.profile,
      mappingIssues: normalized.mappingIssues,
      askedFields,
      questionPlan,
      catalogueSnapshot: catalogue,
      context,
      assessments,
      documentApplicability,
    }),
  };
}
