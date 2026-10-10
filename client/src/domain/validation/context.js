import { assertValid, isObject, issue, validInstant } from './common.js';

export const ENGINE_VERSION = '1.0.0';

export function validateContext(context) {
  const errors = [];
  if (!isObject(context))
    return [issue('context', 'context-shape', 'Evaluation context is required.')];
  if (!validInstant(context.evaluatedAt))
    errors.push(
      issue('context.evaluatedAt', 'timestamp', 'An ISO instant with an offset is required.'),
    );
  if (context.engineVersion !== ENGINE_VERSION)
    errors.push(issue('context.engineVersion', 'engine-version', 'Unsupported engine version.'));
  if (typeof context.catalogueVersion !== 'string' || !context.catalogueVersion.trim())
    errors.push(
      issue('context.catalogueVersion', 'catalogue-version', 'Catalogue version is required.'),
    );
  if (!['demo', 'reviewed'].includes(context.mode))
    errors.push(issue('context.mode', 'mode', 'Select demo or reviewed mode explicitly.'));
  if (
    context.currentCycles !== undefined &&
    (!isObject(context.currentCycles) ||
      Object.values(context.currentCycles).some(
        (value) => typeof value !== 'string' || !value.trim(),
      ))
  )
    errors.push(
      issue(
        'context.currentCycles',
        'cycle-policy',
        'Cycle policy must map scheme IDs to explicit cycles.',
      ),
    );
  if (
    context.currentCycle !== undefined &&
    (typeof context.currentCycle !== 'string' || !context.currentCycle.trim())
  )
    errors.push(issue('context.currentCycle', 'cycle-policy', 'Current cycle must be explicit.'));
  return errors;
}

export function assertContext(context) {
  assertValid('context', validateContext(context));
}
