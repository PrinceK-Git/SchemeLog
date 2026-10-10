import { Link } from 'react-router-dom';
import Icon from './Icon';
import { assessmentGroups, formatAnswer, formatRequirement } from '../presentation/scheme.js';
import { explanationContext, explanationReason } from '../presentation/explanation.js';
import { catalogueMode } from '../data/catalogue-mode.js';
import { useSession } from '../app/Session.jsx';
import { fieldLabels } from '../data/questions.js';

export function Button({ children, variant = 'primary', to, className = '', ...props }) {
  const classes = `button button--${variant} ${className}`;
  return to ? (
    <Link to={to} className={classes} {...props}>
      {children}
    </Link>
  ) : (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
export function Notice({ children, tone = 'neutral', title }) {
  return (
    <div className={`notice notice--${tone}`}>
      <Icon name={tone === 'success' ? 'shield' : 'info'} />
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}
export function Badge({ status }) {
  const group = assessmentGroups.find((g) => g.id === status);
  if (!group) return null;
  return (
    <span className={`badge badge--${status}`}>
      <Icon name={group.icon} size={15} />
      {group.title}
    </span>
  );
}
export function SourceLink({ destination, compact = false }) {
  if (!destination) return null;
  return (
    <a
      className={compact ? 'text-link' : 'button button--secondary'}
      href={destination.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${destination.label} (opens in a new tab)`}
    >
      {destination.label}
      <Icon name="external" size={16} />
    </a>
  );
}
export function StatePanel({ icon = 'search', title, children, action }) {
  return (
    <section className="state-panel">
      <span className="state-panel__icon">
        <Icon name={icon} size={30} />
      </span>
      <h2>{title}</h2>
      <div>{children}</div>
      {action}
    </section>
  );
}
export function RuleExplanation({ rows = [], mode }) {
  const byId = new Map(rows.map((row) => [row.ruleId, row]));
  function renderRow(row, contextual = null) {
    return (
      <li key={row.ruleId} data-outcome={row.outcome}>
        <div className="rule-row">
          <strong>{formatRequirement(row)}</strong>
          <span className={`rule-state rule-state--${contextual ? 'context' : row.outcome}`}>
            {' · '}
            {contextual ? 'Alternative/exclusion context: ' : ''}
            {{ pass: 'Satisfied', fail: 'Not satisfied', unknown: 'Unknown' }[row.outcome]}
          </span>
          {row.providedAnswer && <p>Your submitted answer: {formatAnswer(row.providedAnswer)}</p>}
          <p>{explanationReason(row, mode, contextual)}</p>
          {row.evidence.map((evidence) => (
            <p className="small muted" key={evidence.reference}>
              {evidence.kind === 'fictional-test-condition'
                ? `Fictional test condition: ${evidence.text}`
                : `${evidence.title} · ${evidence.authority}${evidence.locator ? ` · ${evidence.locator}` : ''}`}
              {' · '}
              {mode === 'demo'
                ? `Test-condition freshness: ${evidence.freshness?.state || 'unknown'} at the disclosed demo date`
                : `Evidence freshness: ${evidence.freshness?.state || 'unknown'}`}
            </p>
          ))}
        </div>
        {row.childRuleIds.length > 0 && (
          <ul className="logical-rules">
            {row.childRuleIds.map((id) =>
              renderRow(byId.get(id), explanationContext(row, byId.get(id), contextual)),
            )}
          </ul>
        )}
      </li>
    );
  }
  return (
    <div className="rule-explanation">
      {rows.length ? (
        <ul className="logical-rules">
          {rows.filter((row) => row.parentRuleId === null).map((row) => renderRow(row))}
        </ul>
      ) : (
        <p>No usable conditions are available for an assessment.</p>
      )}
    </div>
  );
}

export function AssessmentActions({ assessment }) {
  return (
    <>
      {assessment.missingFields.length > 0 && (
        <p>
          More information could clarify this result:{' '}
          {assessment.missingFields.map((field) => fieldLabels[field]).join(', ')}.{' '}
          <Link to="/questionnaire">Edit answers</Link>.
        </p>
      )}
      {assessment.manualChecks.map((check) => (
        <Notice key={check.ruleId} title="Manual check required">
          <p>{check.reason}</p>
          <p>{check.checkHint}</p>
        </Notice>
      ))}
      {assessment.dataWarnings.map((warning) => (
        <p className="small muted" key={`${warning.path}:${warning.code}`}>
          {warning.message}
        </p>
      ))}
    </>
  );
}

export function ModeDisclosure({ mode, coverage, evaluatedAt, quarantined = [] }) {
  return (
    <Notice
      title={
        mode === 'demo' ? 'Demo · Fictional scholarships' : 'Reviewed catalogue · Limited coverage'
      }
    >
      <p>
        {mode === 'demo'
          ? catalogueMode.disclosure
          : 'Only the published records in this catalogue are covered. A potential match is not an award guarantee.'}
      </p>
      {coverage && <p>{coverage.statement}</p>}
      {mode === 'demo' ? (
        <p>{catalogueMode.dateDisclosure}</p>
      ) : (
        evaluatedAt && <p>Evaluated at {evaluatedAt}.</p>
      )}
      {quarantined.length > 0 && (
        <>
          <p>{quarantined.length} records withheld from publication.</p>
          <ul>
            {quarantined.map((item) => (
              <li key={item.id}>{item.reason}</li>
            ))}
          </ul>
        </>
      )}
    </Notice>
  );
}

export function CatalogueState() {
  const { catalogueStatus, catalogueLoad, retryCatalogue, mode } = useSession();
  if (catalogueStatus === 'ready') return null;
  if (catalogueStatus === 'loading') return <p role="status">Loading catalogue…</p>;
  if (catalogueStatus === 'error')
    return (
      <StatePanel
        title="We couldn’t load the catalogue."
        action={<Button onClick={retryCatalogue}>Try again</Button>}
      >
        <p>
          Your answers and any previous submission are kept. No alternative data mode has been
          loaded.
        </p>
        <Link to="/">Back to home</Link>
      </StatePanel>
    );
  return (
    <StatePanel
      title="No scholarships in this catalogue."
      action={<Button to="/">Back to home</Button>}
    >
      <ModeDisclosure
        mode={mode}
        coverage={catalogueLoad.coverage}
        quarantined={catalogueLoad.quarantined}
      />
      <p>This is a limitation of catalogue coverage, not a finding about your eligibility.</p>
    </StatePanel>
  );
}

export function StaleNotice({ stale }) {
  return stale ? (
    <Notice tone="warning" title="Your answers have changed.">
      <p>
        This page uses your last submitted answers.{' '}
        <Link to="/questionnaire">Review and resubmit your answers</Link>.
      </p>
    </Notice>
  ) : null;
}
