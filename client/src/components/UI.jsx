import { Link } from 'react-router-dom';
import Icon from './Icon';
import { assessmentGroups } from '../data/fixtures';

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
  return (
    <span className={`badge badge--${status}`}>
      <Icon name={group.icon} size={15} />
      {group.title}
    </span>
  );
}
export function SourceLink({ compact = false }) {
  return (
    <a
      className={compact ? 'text-link' : 'button button--secondary'}
      href="https://scholarships.gov.in/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Visit official source: National Scholarship Portal, general resource, opens in a new tab"
    >
      Visit official source
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
export function RuleExplanation({ scheme }) {
  return (
    <div className="rule-explanation">
      <p>{scheme.explanation}</p>
      <ul className="rule-list">
        {scheme.rules.map((rule) => (
          <li key={rule.label}>
            <span className={`rule-symbol rule-symbol--${rule.state}`}>
              <Icon
                name={rule.state === 'pass' ? 'check' : rule.state === 'fail' ? 'minus' : 'info'}
                size={17}
              />
            </span>
            <div>
              <strong>
                {rule.label}{' '}
                <span className="rule-state">
                  ·{' '}
                  {rule.state === 'pass'
                    ? 'Example satisfied'
                    : rule.state === 'fail'
                      ? 'Example unmet'
                      : 'Unknown'}
                </span>
              </strong>
              <p>{rule.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
