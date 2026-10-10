import { loadVocabularies } from './vocab.js';
import { validateProfile as validateSharedProfile } from '../../../../client/src/domain/validation/profile.js';

/** Server compatibility wrapper; filesystem access never enters the shared validator. */
export function validateProfile(profile, { vocab = loadVocabularies() } = {}) {
  return validateSharedProfile(profile, { vocab });
}
