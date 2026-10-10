/**
 * Schemelog Phase 2 data contracts (§6-§8 of the Phase 2 design).
 *
 * These are JSDoc typedefs only: editors get autocomplete without TypeScript, and
 * nothing here is executed. The authoritative machine-checkable contract lives in
 * `src/domain/validation/schema/*.json`; keep the two in step.
 */

/* ------------------------------------------------------------------ profile */

/**
 * @typedef {{ state: 'known', value: any }
 *          | { state: 'unsure' }
 *          | { state: 'declined' }
 *          | { state: 'not-asked' }} Answer
 */

/** @typedef {{ stage: number, of: number } | { stage: string }} StudyYearValue */

/**
 * @typedef {{
 *   min: number,
 *   max: number | null,
 *   minInclusive: boolean,
 *   maxInclusive: boolean,
 *   currency: 'INR',
 *   period: 'year'
 * }} IncomeInterval
 */

/** @typedef {{ value: number, scale: string, context: string }} AcademicScore */

/**
 * @typedef {{
 *   profileVersion: number,
 *   domicileState?: Answer,
 *   educationLevel?: Answer,
 *   courseCode?: Answer,
 *   studyYear?: Answer,
 *   annualHouseholdIncome?: Answer,
 *   academicScore?: Answer,
 *   category?: Answer,
 *   institutionType?: Answer,
 *   additionalAnswers?: Record<string, Answer>
 * }} StudentProfile
 */

/* ------------------------------------------------------------------- shared */

/**
 * @typedef {{
 *   state: 'unknown',
 *   reason: 'not-found'|'source-conflict'|'needs-interpretation'|'stale'
 * }} Unknown
 */

/**
 * @typedef {{
 *   state: 'current'|'review-due'|'superseded'|'unknown',
 *   checkedAt: string,
 *   checkedBy: string,
 *   reviewDue?: string
 * }} Freshness
 */

/**
 * @typedef {{
 *   value: string,
 *   precision: 'date'|'datetime',
 *   timezone?: string,
 *   cycle?: string,
 *   evidence: string[],
 *   checkedAt: string
 * }} DateValue
 */

/* -------------------------------------------------------------------- rules */

/**
 * The closed operator set agreed with Phase 3. Anything else is rejected.
 * @typedef {'eq'|'in'|'lte'|'lt'|'gte'|'gt'|'between'|'allOf'|'anyOf'|'not'
 *          |'manualVerification'} RuleOperator
 */

/**
 * @typedef {{
 *   id: string,
 *   operator: RuleOperator,
 *   field?: string,
 *   value?: any,
 *   min?: number,
 *   max?: number,
 *   minInclusive?: boolean,
 *   maxInclusive?: boolean,
 *   unit?: string,
 *   scale?: string,
 *   context?: string,
 *   children?: RuleNode[],
 *   child?: RuleNode,
 *   reason?: string,
 *   checkHint?: string,
 *   explanationKey: string,
 *   evidence?: string[],
 *   material?: boolean,
 *   freshness?: Freshness
 * }} RuleNode
 */

/* --------------------------------------------------------------- subrecords */

/** @typedef {{ id: string, ref: string }} Locator */

/**
 * @typedef {{
 *   id: string,
 *   url: string,
 *   title: string,
 *   authority: string,
 *   kind: 'guidelines'|'notice'|'scheme-page'|'portal-page'|'faq',
 *   edition: string | Unknown,
 *   retrievedAt: string,
 *   textSha256?: string,
 *   locators: Locator[]
 * }} Source
 */

/**
 * @typedef {{
 *   id: string,
 *   type: 'tuition-fee'|'maintenance'|'one-time-grant'|'stipend'|'other',
 *   description: string,
 *   amount: {
 *     value: number,
 *     currency: 'INR',
 *     frequency: 'year'|'month'|'one-time',
 *     cap?: string
 *   } | Unknown,
 *   conditions?: string,
 *   evidence: string[],
 *   freshness: Freshness
 * }} Benefit
 */

/**
 * @typedef {{
 *   coverage: 'complete'|'partial'|'unusable',
 *   cycle: string,
 *   rule: RuleNode | null,
 *   notes?: string,
 *   evidence: string[],
 *   freshness: Freshness
 * }} EligibilitySection
 */

/**
 * @typedef {{
 *   id: string,
 *   type: string,
 *   title: string,
 *   requirement: 'confirmed'|'conditional'|'needs-verification',
 *   appliesWhen: RuleNode | null,
 *   notes?: string,
 *   evidence: string[]
 * }} DocumentItem
 */

/**
 * @typedef {{
 *   cycle: string,
 *   opens: DateValue | Unknown,
 *   closes: DateValue | Unknown,
 *   statusOverride?: { status: 'open'|'closed', evidence: string[], checkedAt: string },
 *   freshness: Freshness
 * }} ApplicationSection
 */

/** @typedef {{ order: number, title: string, description?: string, evidence: string[] }} Step */

/**
 * @typedef {{
 *   id: string,
 *   purpose: 'scheme-info'|'guidelines'|'application',
 *   url: string,
 *   label: string,
 *   checkedAt: string,
 *   status: 'verified'|'broken'|'unverified'
 * }} Link
 */

/** @typedef {{ fact: string, sources: string[], values: string[], resolution: string }} Conflict */

/**
 * @typedef {{
 *   curatedBy: string,
 *   curatedAt: string,
 *   reviewedBy: string | null,
 *   reviewedAt: string | null,
 *   conflicts: Conflict[],
 *   notesPath: string
 * }} Verification
 */

/**
 * @typedef {{
 *   id: string,
 *   slug: string,
 *   officialName: string,
 *   shortName?: string,
 *   domain: 'student-scholarship',
 *   authority: { name: string, level: 'central'|'state'|'unknown' },
 *   jurisdiction: 'central'|'state'|'unknown',
 *   applicableStates: string[] | 'all' | Unknown,
 *   summary: string,
 *   benefits: Benefit[],
 *   eligibility: EligibilitySection,
 *   documents: DocumentItem[],
 *   application: ApplicationSection,
 *   applicationSteps?: Step[],
 *   links: Link[],
 *   sources: Source[],
 *   verification: Verification,
 *   publicationStatus: 'draft'|'published'|'archived',
 *   recordVersion: number
 * }} SchemeRecord
 */

/**
 * @typedef {{
 *   domains: string[],
 *   jurisdictions: string[],
 *   educationLevels: string[],
 *   schemeCount: number,
 *   statement: string,
 *   quarantined?: { id: string, reason: string }[]
 * }} Coverage
 */

/**
 * @typedef {{
 *   schemaVersion: string,
 *   catalogueVersion: string,
 *   publishedAt: string,
 *   vocabVersion: string,
 *   coverage: Coverage,
 *   schemes: SchemeRecord[]
 * }} Catalogue
 */

/* --------------------------------------------------------------- validation */

/**
 * @typedef {{
 *   severity: 'reject'|'quarantine'|'warn',
 *   layer: 'schema'|'referential'|'semantic',
 *   check: string,
 *   schemeId: string | null,
 *   path: string,
 *   message: string
 * }} Finding
 */

/**
 * @typedef {{
 *   ok: boolean,
 *   findings: Finding[],
 *   rejects: Finding[],
 *   quarantines: Finding[],
 *   warnings: Finding[],
 *   quarantinedIds: string[],
 *   publishable: SchemeRecord[]
 * }} ValidationReport
 */

export {};
