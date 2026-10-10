import { Link, useParams } from 'react-router-dom';
import { useSession } from '../app/Session';
import { getScheme } from '../repositories/catalogue';
import { Badge, Button, Notice, RuleExplanation, SourceLink } from '../components/UI';
import Icon from '../components/Icon';
import NotFound from './NotFound';
import './ScholarshipDetail.css';

export default function ScholarshipDetail() {
  const { slug } = useParams();
  const scheme = getScheme(slug);
  const { submittedProfile, checklistProgress, dispatch, stale } = useSession();
  if (!scheme) return <NotFound />;
  const marked = scheme.documents.filter(
    (d) => checklistProgress[`${scheme.id}:demo-v1:${d.id}`],
  ).length;
  return (
    <div className="container page">
      <Link to={submittedProfile ? '/results' : '/'} className="back-link">
        <Icon name="arrow" size={16} />
        {submittedProfile ? 'Back to results' : 'Back to home'}
      </Link>
      <div className="detail-heading">
        <span className="detail-monogram">{scheme.short}</span>
        <div>
          <span className="eyebrow">{scheme.category} · Demo data</span>
          <h1>{scheme.name}</h1>
          <p>
            {scheme.authority} · {scheme.classification}
          </p>
        </div>
      </div>
      <Notice title="This is a fictional scholarship example.">
        <p>
          No eligibility conditions, amounts, application dates, or documents here have been
          verified for a real scheme. Official links below are general discovery resources.
        </p>
      </Notice>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="detail-section">
            <span className="eyebrow">The opportunity</span>
            <h2>A little support for the road ahead.</h2>
            <p>{scheme.summary}</p>
            <div className="benefit-box">
              <Icon name="book" size={25} />
              <div>
                <span className="fact-label">Illustrative assistance</span>
                <strong>{scheme.benefit}</strong>
                <span>{scheme.amount}</span>
              </div>
            </div>
          </section>
          <section className="detail-section">
            <div className="detail-section__heading">
              <h2>Understanding this result</h2>
              <Badge status={scheme.status} />
            </div>
            {stale && (
              <Notice tone="warning" title="Your profile has changed.">
                <p>
                  <Link to="/questionnaire">Review and resubmit your answers.</Link> This page
                  continues to show a fictional scenario.
                </p>
              </Notice>
            )}
            {!submittedProfile && (
              <Notice title="No profile submitted in this session.">
                <p>
                  <Link to="/questionnaire">Answer a few questions</Link> to try the full journey.
                  This example assessment is prewritten, not personal.
                </p>
              </Notice>
            )}
            <RuleExplanation scheme={scheme} />
            <h3 className="detail-subheading">Conditions shown in this example</h3>
            <ul className="condition-list">
              {scheme.conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="small muted">
              <strong>Exclusions:</strong> {scheme.exclusion}
            </p>
          </section>
          <section className="detail-section" id="checklist">
            <span className="eyebrow">One step at a time</span>
            <h2>Your preparation checklist</h2>
            <p>
              Mark what you have prepared. A checked box is your own note, not a verified
              requirement or a completed application.
            </p>
            <div className="checklist-count" role="status">
              {marked} of {scheme.documents.length} example tasks marked prepared
            </div>
            <div className="checklist">
              {scheme.documents.map((doc) => {
                const key = `${scheme.id}:demo-v1:${doc.id}`;
                return (
                  <div className="checklist-item" key={doc.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(checklistProgress[key])}
                        onChange={(e) =>
                          dispatch({ type: 'check', key, checked: e.target.checked })
                        }
                      />
                      <span>
                        <strong>{doc.title}</strong>
                        <span className="checklist-item__action">I have prepared this</span>
                      </span>
                    </label>
                    <div className="checklist-item__info">
                      <span
                        className={`requirement-tag ${doc.status === 'Conditional' ? 'requirement-tag--conditional' : ''}`}
                      >
                        {doc.status}
                      </span>
                      <p>{doc.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="small muted">
              Checkmarks stay only during this session and clear on refresh. No files or document
              details are collected.
            </p>
          </section>
          <section className="detail-section">
            <h2>What comes next?</h2>
            <p>
              The steps below illustrate preparation. The real scheme’s official guidelines must
              specify its actual application process.
            </p>
            <ol className="application-steps">
              <li>
                <strong>Read the current official guidelines.</strong>
                <p>Confirm the scheme, application cycle, conditions, and exclusions.</p>
              </li>
              <li>
                <strong>Check the documents and dates.</strong>
                <p>
                  Verify what is required, which format is accepted, and whether applications are
                  open.
                </p>
              </li>
              <li>
                <strong>Apply through the official channel.</strong>
                <p>
                  Submit only on the verified application portal. Schemelog does not submit
                  applications.
                </p>
              </li>
            </ol>
          </section>
        </div>
        <aside className="detail-sidebar">
          <section className="application-card">
            <span className="eyebrow">Application information</span>
            <h2>Check before you apply.</h2>
            <dl>
              <div>
                <dt>Application status</dt>
                <dd>{scheme.applicationStatus}</dd>
              </div>
              <div>
                <dt>Application cycle</dt>
                <dd>Not verified</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>{scheme.deadline}</dd>
              </div>
              <div>
                <dt>Last verified</dt>
                <dd>No verified date · demo record</dd>
              </div>
            </dl>
            <SourceLink />
            <p className="source-note">
              Opens the National Scholarship Portal in a new tab. It is not an application link for
              this example.
            </p>
          </section>
          <section className="sources-card">
            <h2>Sources & guidance</h2>
            <div>
              <span>Scheme-specific guidelines</span>
              <strong>Unavailable for fictional records</strong>
            </div>
            <div>
              <span>Scheme application link</span>
              <strong>Not verified</strong>
            </div>
            <a
              href="https://www.myscheme.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Explore myScheme
              <Icon name="external" size={15} />
            </a>
            <p className="small muted">General discovery resource · Opens in a new tab.</p>
          </section>
          <div className="sidebar-note">
            <Icon name="shield" />
            <p>
              We never ask for your Aadhaar, bank account numbers, government passwords, or OTPs.
            </p>
          </div>
          {!submittedProfile && (
            <Button to="/questionnaire">
              Try the questionnaire
              <Icon name="arrow" size={16} />
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
