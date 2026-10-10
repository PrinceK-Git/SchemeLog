import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '../app/Session';
import { getScheme } from '../repositories/catalogue';
import { preparationKey, preparationCounts } from '../app/submission.js';
import { safeDestinations, presentFacts, displayedLastVerified } from '../presentation/scheme.js';
import { catalogueMode } from '../data/catalogue-mode.js';
import { applicationDisplay } from '../presentation/application.js';
import {
  Badge,
  Button,
  Notice,
  RuleExplanation,
  SourceLink,
  CatalogueState,
  ModeDisclosure,
  StaleNotice,
  AssessmentActions,
} from '../components/UI';
import NotFound from './NotFound';
import ChapterArt from '../components/ChapterArt';
import Icon from '../components/Icon';
import './ScholarshipDetail.css';

export default function ScholarshipDetail() {
  const { slug } = useParams();
  const { submission, catalogueLoad, catalogueStatus, mode, checklistProgress, dispatch, stale } =
    useSession();
  const [viewedAt] = useState(() => new Date().toISOString());
  if (catalogueStatus !== 'ready' && catalogueStatus !== 'empty')
    return (
      <div className="container page">
        <h1>Scholarship information</h1>
        <CatalogueState />
      </div>
    );
  const savedRecord =
    submission?.context.mode === mode ? getScheme(slug, submission.catalogueSnapshot) : null;
  const record = savedRecord || getScheme(slug, catalogueLoad.catalogue);
  if (!record) return <NotFound />;
  const assessment =
    savedRecord &&
    submission.assessments.find(
      (item) => item.schemeId === record.id && item.schemeVersion === record.recordVersion,
    );
  const context = assessment
    ? submission.context
    : { mode, evaluatedAt: mode === 'demo' ? catalogueMode.evaluatedAt : viewedAt };
  const applicability = assessment ? submission.documentApplicability : {};
  const counts = preparationCounts(record, applicability, checklistProgress);
  const application = assessment?.applicationStatus;
  const destinations = safeDestinations(record, context);
  const facts = presentFacts(record, context);
  const applicationView = applicationDisplay(application);
  const lastVerified = displayedLastVerified(record, context, {
    includeAssessment: Boolean(assessment),
    includeApplication: Boolean(
      applicationView.deadlineConfirmed || (application && application.status !== 'unknown'),
    ),
    includeDocuments: true,
    includeApplicationSteps: facts.applicationSteps.length > 0,
    links: destinations,
  });
  return (
    <div className="container page">
      <Link className="back-link" to={submission ? '/results' : '/'}>
        {submission ? 'Back to results' : 'Back to home'}
      </Link>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">
            {mode === 'demo' ? 'Demo · Fictional scholarship' : 'Published scholarship'}
          </span>
          <h1>{record.officialName}</h1>
          <p>Record version {record.recordVersion}</p>
        </div>
        <ChapterArt compact />
      </div>
      <ModeDisclosure
        mode={mode}
        coverage={(assessment ? submission.catalogueSnapshot : catalogueLoad.catalogue).coverage}
        evaluatedAt={assessment ? context.evaluatedAt : undefined}
        quarantined={
          (assessment ? submission.catalogueSnapshot : catalogueLoad.catalogue).coverage.quarantined
        }
      />
      {assessment && <StaleNotice stale={stale} />}
      {savedRecord &&
        submission.context.catalogueVersion !== catalogueLoad.catalogue.catalogueVersion && (
          <Notice title="Previous catalogue snapshot">
            <p>
              This detail uses the record from your last submission. Resubmit to use the current
              catalogue.
            </p>
          </Notice>
        )}
      <div className="detail-layout">
        <div className="detail-main">
          <section className="detail-section">
            <h2>The opportunity</h2>
            <p>{facts.summary || 'Current scheme summary is unconfirmed. Check the source.'}</p>
            {facts.authority && <p>{facts.authority}</p>}
            {facts.benefits.length ? (
              <ul>
                {facts.benefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
            ) : (
              <p>
                Assistance:{' '}
                {mode === 'demo'
                  ? 'Not specified in this fictional example.'
                  : 'Check current verified benefit information with the source.'}
              </p>
            )}
          </section>
          <section className="detail-section">
            <div className="detail-section__heading">
              <h2>{assessment ? 'Understanding this result' : 'Public scheme information'}</h2>
              {assessment && <Badge status={assessment.status} />}
            </div>
            {assessment ? (
              <>
                <RuleExplanation rows={assessment.ruleResults} mode={mode} />
                <AssessmentActions assessment={assessment} />
                <p className="small muted">
                  Catalogue {context.catalogueVersion} · Engine {context.engineVersion} · Evaluated
                  at {context.evaluatedAt}
                </p>
              </>
            ) : (
              <Notice title="No personal assessment in this session.">
                <p>
                  <Link to="/questionnaire">Answer a few questions</Link> to see how the conditions
                  apply to your supplied answers. No reference profile has been assumed.
                </p>
              </Notice>
            )}
          </section>
          <section className="detail-section">
            <h2>Your preparation checklist</h2>
            <p>
              These are preparation reminders, not document verification or application completion.
            </p>
            {assessment && (
              <>
                <p className="checklist-count">
                  You marked {counts.completed} preparation{' '}
                  {counts.completed === 1 ? 'task' : 'tasks'} as done.
                </p>
                <p>
                  {counts.applicable
                    ? `${counts.applicable} tasks apply to your submitted answers.`
                    : 'No confirmed applicable preparation tasks.'}{' '}
                  {counts.unknown > 0 && `${counts.unknown} tasks may be required.`}
                </p>
              </>
            )}
            {!record.documents.length && (
              <p>No preparation documents are specified in this record.</p>
            )}
            {record.documents.map((document) => {
              const key = preparationKey(record, document);
              const result = applicability[key];
              const text = !assessment
                ? `Requirement: ${document.requirement}. Submit answers to check applicability.`
                : {
                    pass: 'Required for the supplied answers',
                    fail: 'Not applicable for the supplied answers',
                    unknown: 'May be required — check this condition',
                  }[result?.outcome];
              return (
                <div className="checklist-item" key={key}>
                  <label>
                    <input
                      type="checkbox"
                      disabled={!assessment || result?.outcome === 'fail'}
                      checked={Boolean(assessment && checklistProgress[key])}
                      onChange={(event) =>
                        dispatch({ type: 'check', key, checked: event.target.checked })
                      }
                    />
                    <span>
                      <strong>{document.title}</strong>
                      <span className="checklist-item__action">{text}</span>
                    </span>
                  </label>
                  {result?.ruleResults.length > 0 && (
                    <details>
                      <summary>Why this preparation condition</summary>
                      <RuleExplanation rows={result.ruleResults} mode={mode} />
                    </details>
                  )}
                </div>
              );
            })}
          </section>
          {facts.applicationSteps.length > 0 && (
            <section className="detail-section">
              <h2>Application guidance</h2>
              <ol>
                {facts.applicationSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          )}
        </div>
        <aside className="detail-sidebar">
          <section className="application-card">
            <span className="eyebrow">
              <Icon name="book" size={18} /> Your next step
            </span>
            <h2>Application information</h2>
            <dl>
              <div>
                <dt>Application status</dt>
                <dd>{applicationView.status}</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>{applicationView.deadline}</dd>
              </div>
              <div>
                <dt>Last verified</dt>
                <dd>
                  {mode === 'demo'
                    ? 'No verified date · fictional record'
                    : lastVerified || 'No verified facts displayed'}
                </dd>
              </div>
            </dl>
            {destinations.map((destination) => (
              <SourceLink key={destination.id} destination={destination} />
            ))}
            {!destinations.length && <p>No verified application destination is available here.</p>}
          </section>
          <section className="sources-card">
            <h2>General discovery resources</h2>
            <a href="https://www.myscheme.gov.in/" target="_blank" rel="noopener noreferrer">
              Explore myScheme (opens in a new tab)
            </a>
            <p className="small muted">
              General resource, not an application link for this record.
            </p>
          </section>
          {!assessment && <Button to="/questionnaire">Try the questionnaire</Button>}
        </aside>
      </div>
    </div>
  );
}
