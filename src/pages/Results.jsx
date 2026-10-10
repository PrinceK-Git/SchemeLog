import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../app/Session';
import { answerLabel } from '../data/questions';
import { assessmentGroups } from '../data/fixtures';
import { getCatalogue } from '../repositories/catalogue';
import SchemeCard from '../components/SchemeCard';
import { Button, Notice, StatePanel } from '../components/UI';
import Icon from '../components/Icon';
import './Results.css';

export default function Results() {
  const { submittedProfile, stale } = useSession();
  const [scenario, setScenario] = useState('complete');
  const [filter, setFilter] = useState('all');
  const [assessmentResults, setAssessmentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getCatalogue(scenario)
      .then((records) => {
        if (active) setAssessmentResults(records);
      })
      .catch(() => {
        if (active) {
          setError(true);
          setAssessmentResults([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scenario]);
  if (!submittedProfile)
    return (
      <div className="container page">
        <span className="eyebrow">Start with your story</span>
        <h1>Let’s get to know you first.</h1>
        <StatePanel
          title="Your profile starts here."
          icon="book"
          action={
            <Button to="/questionnaire">
              Start the questionnaire <Icon name="arrow" />
            </Button>
          }
        >
          <p>
            No submitted answers are available in this session. Refreshing the page clears your
            profile and checklist.
          </p>
        </StatePanel>
      </div>
    );
  const potentialCount = assessmentResults.filter((s) => s.status === 'potential').length;
  return (
    <div className="container page">
      <Link to="/questionnaire" className="back-link">
        <Icon name="arrow" size={16} />
        Back to your answers
      </Link>
      <div className="results-heading">
        <div className="page-intro">
          <span className="eyebrow">Your next chapter starts here</span>
          <h1>Possibilities, with a little clarity.</h1>
          <p>Explore how scholarship results will look. Every example below is fictional.</p>
        </div>
        <span className="demo-stamp">
          <span className="preview-dot" />
          Demo preview
        </span>
      </div>
      <Notice title="A preview, not a personal eligibility decision.">
        <p>
          These prewritten examples do not depend on your answers. Real scholarship records and
          eligibility matching arrive in later phases.
        </p>
      </Notice>
      {stale && (
        <div className="stale-notice">
          <Notice tone="warning" title="Your answers have changed.">
            <p>
              This summary uses your last submitted profile.{' '}
              <Link to="/questionnaire">Review and resubmit your answers</Link> before continuing.
            </p>
          </Notice>
        </div>
      )}
      <div className="results-layout">
        <aside className="results-sidebar">
          <section className="profile-card">
            <div className="profile-card__heading">
              <span className="profile-avatar">
                <Icon name="book" size={22} />
              </span>
              <div>
                <h2>Your answer summary</h2>
                <p>Kept in this session only</p>
              </div>
            </div>
            <dl>
              {[
                ['educationLevel', 'Study level'],
                ['domicile', 'Domicile'],
                ['income', 'Household income'],
              ].map(([field, label]) => (
                <div key={field}>
                  <dt>{label}</dt>
                  <dd>{answerLabel(submittedProfile, field)}</dd>
                </div>
              ))}
            </dl>
            <Button to="/questionnaire" variant="secondary">
              Edit answers
              <Icon name="edit" size={15} />
            </Button>
          </section>
          <section className="sidebar-note">
            <Icon name="shield" size={24} />
            <h2>Keep the full picture.</h2>
            <p>
              A potential match is guidance, not a promise of approval. Always check the official
              guidelines.
            </p>
            <p>
              Coverage in this preview: four fictional examples. No real scholarships have been
              verified.
            </p>
          </section>
        </aside>
        <div className="results-main">
          <div className="results-toolbar">
            <div aria-live="polite">
              <strong>
                {loading
                  ? 'Loading examples…'
                  : error
                    ? 'Preview unavailable'
                    : `${potentialCount} potential match example${potentialCount === 1 ? '' : 's'}`}
              </strong>
              <p>{assessmentResults.length} total examples · Not an exhaustive catalogue</p>
            </div>
            <div className="scenario-control">
              <label htmlFor="scenario">Preview scenario</label>
              <select
                id="scenario"
                value={scenario}
                onChange={(e) => {
                  setScenario(e.target.value);
                  setFilter('all');
                }}
              >
                <option value="complete">All result types</option>
                <option value="empty">No results</option>
                <option value="error">Unavailable catalogue</option>
              </select>
            </div>
          </div>
          <div className="result-filters" aria-label="Filter result examples">
            <button onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>
              All examples <span>{assessmentResults.length}</span>
            </button>
            {assessmentGroups.map((group) => (
              <button
                key={group.id}
                aria-pressed={filter === group.id}
                onClick={() => setFilter(group.id)}
              >
                {group.title}
                <span>{assessmentResults.filter((s) => s.status === group.id).length}</span>
              </button>
            ))}
          </div>
          {loading ? (
            <div className="loading-state" role="status">
              Loading demo examples…
            </div>
          ) : error ? (
            <StatePanel
              title="We couldn’t load the preview."
              icon="info"
              action={
                <Button onClick={() => setScenario('complete')}>
                  Try again
                  <Icon name="arrow" />
                </Button>
              }
            >
              <p>
                This scenario demonstrates a catalogue error. Your answers are still available. Try
                again to restore the demo examples.
              </p>
            </StatePanel>
          ) : assessmentResults.length === 0 ? (
            <StatePanel
              title="No results in this preview."
              action={
                <Button onClick={() => setScenario('complete')}>
                  Restore demo examples
                  <Icon name="arrow" />
                </Button>
              }
            >
              <p>
                This demonstrates an empty catalogue result, not a lack of opportunities for you.
                Review your answers or explore{' '}
                <a href="https://www.myscheme.gov.in/" target="_blank" rel="noopener noreferrer">
                  myScheme (opens in a new tab)
                </a>
                .
              </p>
            </StatePanel>
          ) : (
            <div className="result-groups">
              {assessmentGroups
                .filter((g) => filter === 'all' || filter === g.id)
                .map((group) => (
                  <section key={group.id} className="result-group" aria-label={group.title}>
                    <div className="result-group__heading">
                      <h2>{group.title}</h2>
                      <span>
                        {assessmentResults.filter((s) => s.status === group.id).length} example
                      </span>
                    </div>
                    {assessmentResults
                      .filter((s) => s.status === group.id)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((scheme) => (
                        <SchemeCard scheme={scheme} key={scheme.id} />
                      ))}
                  </section>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
