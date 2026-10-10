import { Link } from 'react-router-dom';
import { Badge, RuleExplanation, SourceLink, AssessmentActions } from './UI';
import { safeDestinations, presentFacts } from '../presentation/scheme.js';
import './SchemeCard.css';

export default function SchemeCard({ record, assessment, context }) {
  if (!record || record.recordVersion !== assessment.schemeVersion) return null;
  const facts = presentFacts(record, context);
  return (
    <article className="scheme-card" data-scheme-id={record.id}>
      <div className="scheme-card__top">
        <div>
          <span className="eyebrow">
            {context.mode === 'demo' ? 'Demo · Fictional scholarship' : 'Published scholarship'}
          </span>
          <h3>
            <Link to={`/scholarships/${record.slug}`}>{record.officialName}</Link>
          </h3>
        </div>
      </div>
      <div className="scheme-card__badges">
        <Badge status={assessment.status} />
      </div>
      <p>{facts.summary || 'Current scheme summary is unconfirmed. Check the source.'}</p>
      <div className="scheme-card__facts">
        <div>
          <span className="fact-label">Applications</span>
          <strong>
            {assessment.applicationStatus.status === 'unknown'
              ? 'Unknown — check current information'
              : assessment.applicationStatus.status}
          </strong>
        </div>
      </div>
      <details className="explanation">
        <summary>Why this result</summary>
        <RuleExplanation rows={assessment.ruleResults} mode={context.mode} />
        <AssessmentActions assessment={assessment} />
      </details>
      <div className="scheme-card__actions">
        <Link className="text-link" to={`/scholarships/${record.slug}`}>
          View requirements
        </Link>
        {safeDestinations(record, context).map((destination) => (
          <SourceLink key={destination.id} destination={destination} compact />
        ))}
      </div>
    </article>
  );
}
