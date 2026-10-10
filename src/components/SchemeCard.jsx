import { Link } from 'react-router-dom';
import { Badge, RuleExplanation, SourceLink } from './UI';
import Icon from './Icon';
import './SchemeCard.css';

export default function SchemeCard({ scheme }) {
  return (
    <article className="scheme-card">
      <div className="scheme-card__top">
        <span className="scheme-card__monogram">{scheme.short}</span>
        <div>
          <span className="eyebrow">{scheme.category}</span>
          <h3>
            <Link to={`/scholarships/${scheme.id}`}>{scheme.name}</Link>
          </h3>
          <p className="small muted">{scheme.authority} · Demo data</p>
        </div>
      </div>
      <div className="scheme-card__badges">
        <Badge status={scheme.status} />
        <span className="small muted">{scheme.classification}</span>
      </div>
      <p>{scheme.summary}</p>
      <div className="scheme-card__facts">
        <div>
          <span className="fact-label">Assistance</span>
          <strong>{scheme.benefit}</strong>
          <span className="small muted">{scheme.amount}</span>
        </div>
        <div>
          <span className="fact-label">Applications</span>
          <strong>{scheme.applicationStatus}</strong>
          <span className="small muted">Deadline: {scheme.deadline}</span>
        </div>
      </div>
      <details className="explanation">
        <summary>
          {scheme.status === 'potential' ? 'Why this matches' : 'Why this result'}
          <Icon name="chevron" size={16} />
        </summary>
        <RuleExplanation scheme={scheme} />
      </details>
      <div className="scheme-card__actions">
        <Link className="text-link" to={`/scholarships/${scheme.id}`}>
          View requirements
          <Icon name="arrow" size={17} />
        </Link>
        <SourceLink compact />
      </div>
      <p className="source-note">
        Official link opens a general resource, not this fictional scheme.
      </p>
    </article>
  );
}
