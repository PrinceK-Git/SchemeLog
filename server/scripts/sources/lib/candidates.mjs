import { indexDigits } from './normalise.mjs';

/**
 * Conservative patterns that flag spans for a curator (addendum §5).
 * Candidates are hints with locators. They never become rules, amounts, or
 * dates on their own, and they live outside `src/data/`.
 */
const PATTERNS = [
  {
    type: 'money',
    // ₹ / Rs. / INR / lakh near digits.
    regex:
      /(?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d+)?(?:\s?(?:lakh|lakhs|crore|crores))?|\b[\d,]+(?:\.\d+)?\s?(?:lakh|lakhs|crore|crores)\b/gi,
  },
  {
    type: 'date',
    regex:
      /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
  },
  { type: 'percentage', regex: /\b\d{1,3}(?:\.\d+)?\s?(?:%|per\s?cent|percentile)\b/gi },
  {
    type: 'keyword',
    regex:
      /\b(?:domicile|annual income|family income|not eligible|shall not|only|debarred|percentile)\b/gi,
  },
];

const DOCUMENT_HEADING = /\b(document|enclos|attach|certificate\s+required)/i;

/**
 * @param {{ text: string, locator: string }[]} lines
 * @param {string} sourceId
 * @returns {{
 *   sourceId: string,
 *   generatedAt: null,
 *   note: string,
 *   candidates: { id: string, type: string, text: string, locator: string, indexed: number|null, line: string }[]
 * }}
 */
export function findCandidates(lines, sourceId) {
  const candidates = [];
  let counter = 0;
  const add = (type, text, locator, line) => {
    counter += 1;
    candidates.push({
      id: `cand-${counter}`,
      type,
      text, // exact text as written in the source
      locator,
      indexed: type === 'money' || type === 'percentage' ? indexDigits(text) : null,
      line: line.slice(0, 300),
    });
  };

  let underDocumentHeading = false;
  for (const { text, locator } of lines) {
    if (DOCUMENT_HEADING.test(locator) || DOCUMENT_HEADING.test(text)) underDocumentHeading = true;
    else if (/^(eligibility|benefit|how to apply|selection)/i.test(text))
      underDocumentHeading = false;

    for (const { type, regex } of PATTERNS) {
      regex.lastIndex = 0;
      for (const match of text.matchAll(regex)) add(type, match[0], locator, text);
    }
    if (
      underDocumentHeading &&
      /certificate|marksheet|proof|aadhaar|passbook|photograph/i.test(text)
    )
      add('document', text.trim(), locator, text);
  }

  return {
    sourceId,
    generatedAt: null, // deliberately null: candidates are compared across runs
    note: 'Candidate facts are extraction hints for a curator. They are never published without human verification.',
    candidates,
  };
}

/** Summarise the differences between two candidate sets, for the review queue. */
export function diffCandidates(before, after) {
  const key = (candidate) => `${candidate.type}|${candidate.locator}|${candidate.text}`;
  const beforeKeys = new Set((before?.candidates ?? []).map(key));
  const afterKeys = new Set((after?.candidates ?? []).map(key));
  return {
    added: (after?.candidates ?? []).filter((c) => !beforeKeys.has(key(c))),
    removed: (before?.candidates ?? []).filter((c) => !afterKeys.has(key(c))),
  };
}
