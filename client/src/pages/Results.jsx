import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../app/Session';
import { assessmentGroups, formatAnswer } from '../presentation/scheme.js';
import { fieldLabels } from '../data/questions.js';
import SchemeCard from '../components/SchemeCard';
import {
  Button,
  Notice,
  StatePanel,
  CatalogueState,
  ModeDisclosure,
  StaleNotice,
} from '../components/UI';
import './Results.css';

export default function Results() {
  const { submission, stale, catalogueStatus, catalogueLoad, dispatch } = useSession();
  const [filter, setFilter] = useState('all');
  if (catalogueStatus !== 'ready')
    return (
      <div className="container page">
        <h1>Scholarship results</h1>
        <CatalogueState />
        {submission && <p>Your previous submission is retained; it has not been replaced.</p>}
      </div>
    );
  if (!submission)
    return (
      <div className="container page">
        <h1>Let’s get to know you first.</h1>
        <ModeDisclosure
          mode={catalogueLoad.mode}
          coverage={catalogueLoad.coverage}
          quarantined={catalogueLoad.quarantined}
        />
        <StatePanel
          title="Your profile starts here."
          action={<Button to="/questionnaire">Start the questionnaire</Button>}
        >
          <p>
            No submitted answers are available in this session. Refreshing clears your profile and
            checklist.
          </p>
        </StatePanel>
      </div>
    );
  const { assessments, context, catalogueSnapshot: catalogue, profile } = submission;
  const records = new Map(catalogue.schemes.map((record) => [record.id, record]));
  const potential = assessments.filter((assessment) => assessment.status === 'potential').length;
  const answered = [
    ...Object.entries(profile),
    ...Object.entries(profile.additionalAnswers || {}).map(([key, answer]) => [
      `additionalAnswers.${key}`,
      answer,
    ]),
  ].filter(
    ([field, answer]) =>
      field !== 'profileVersion' && field !== 'additionalAnswers' && answer.state !== 'not-asked',
  );
  return (
    <div className="container page">
      <Link className="back-link" to="/questionnaire">
        Back to your answers
      </Link>
      <div className="results-heading">
        <div className="page-intro">
          <span className="eyebrow">Answer-driven discovery</span>
          <h1>Possibilities, with a little clarity.</h1>
          <p>
            {potential} potential {potential === 1 ? 'match' : 'matches'} among {assessments.length}{' '}
            {context.mode === 'demo' ? 'fictional scholarships' : 'published scholarships'}.
          </p>
        </div>
      </div>
      <ModeDisclosure
        mode={context.mode}
        coverage={catalogue.coverage}
        evaluatedAt={context.evaluatedAt}
        quarantined={catalogue.coverage.quarantined}
      />
      <StaleNotice stale={stale} />
      {catalogueLoad.catalogue.catalogueVersion !== catalogue.catalogueVersion && (
        <Notice title="A newer catalogue is available.">
          <p>
            These are your previous results and record versions. Review and resubmit to use the new
            catalogue.
          </p>
        </Notice>
      )}
      <div className="results-layout">
        <aside className="results-sidebar">
          <section className="profile-card">
            <h2>Your submitted answers</h2>
            <dl>
              {answered.map(([field, answer]) => (
                <div key={field}>
                  <dt>{fieldLabels[field]}</dt>
                  <dd>{formatAnswer(answer)}</dd>
                </div>
              ))}
            </dl>
            <Link className="text-link" to="/questionnaire">
              Edit answers
            </Link>
            <p className="small muted">
              Catalogue {context.catalogueVersion} · Engine {context.engineVersion}
            </p>
            <p className="small muted">Evaluated at {context.evaluatedAt}</p>
            <Button variant="secondary" onClick={() => dispatch({ type: 'reset' })}>
              Reset session
            </Button>
          </section>
        </aside>
        <div className="results-main">
          {submission.mappingIssues.map((issue) => (
            <Notice key={`${issue.field}:${issue.code}`} title="Answer needs clarification">
              <p>{issue.message}</p>
            </Notice>
          ))}
          <div className="result-filters" aria-label="Filter assessments">
            <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              All scholarships <span>{assessments.length}</span>
            </button>
            {assessmentGroups.map((group) => (
              <button
                key={group.id}
                aria-pressed={filter === group.id}
                onClick={() => setFilter(group.id)}
              >
                {group.title}{' '}
                <span>{assessments.filter((item) => item.status === group.id).length}</span>
              </button>
            ))}
          </div>
          <div className="result-groups">
            {assessmentGroups
              .filter((group) => filter === 'all' || filter === group.id)
              .map((group) => {
                const items = assessments.filter((assessment) => assessment.status === group.id);
                return (
                  <section className="result-group" key={group.id} aria-label={group.title}>
                    <div className="result-group__heading">
                      <h2>{group.title}</h2>
                      <span>{items.length} scholarships</span>
                    </div>
                    {items.length ? (
                      items.map((assessment) => (
                        <SchemeCard
                          key={assessment.schemeId}
                          record={records.get(assessment.schemeId)}
                          assessment={assessment}
                          context={context}
                        />
                      ))
                    ) : (
                      <p>No assessments in this group.</p>
                    )}
                  </section>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
