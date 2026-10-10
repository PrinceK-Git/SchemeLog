import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../app/Session';
import { answerLabel, fieldsFor, validateAnswers, visibleSections } from '../data/questions';
import { Button, Notice, CatalogueState, ModeDisclosure } from '../components/UI';
import Icon from '../components/Icon';
import './Questionnaire.css';

function Field({ id, definition, value, error, onChange }) {
  const hintId = `${id}-hint`;
  const describedBy =
    [definition.hint && hintId, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const shared = {
    id,
    'aria-label': definition.label,
    'aria-describedby': describedBy,
    'aria-invalid': Boolean(error),
  };
  return (
    <div className="field">
      {definition.type === 'radio' ? (
        <fieldset className="radio-field">
          <legend>{definition.label}</legend>
          <div className="radio-options">
            {definition.options.map((option) => (
              <label
                className={`radio-option ${value === option.value ? 'radio-option--selected' : ''}`}
                key={option.value}
              >
                <input
                  type="radio"
                  name={id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  aria-describedby={describedBy}
                />
                {option.label}
                <Icon name="check" size={16} />
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <>
          <label htmlFor={id}>
            {definition.label}
            <span className="field__optional" aria-hidden="true">
              Optional
            </span>
          </label>
          {definition.type === 'number' ? (
            <div className="number-wrap">
              <input
                {...shared}
                type="number"
                inputMode="decimal"
                min={definition.min}
                max={definition.max}
                step={definition.step ?? 'any'}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
              />
              <span>{definition.unit}</span>
            </div>
          ) : (
            <select {...shared} value={value || ''} onChange={(e) => onChange(e.target.value)}>
              <option value="">Select an answer, or leave unknown</option>
              {definition.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </>
      )}
      {definition.hint && (
        <p className="field__hint" id={hintId}>
          {definition.hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export default function Questionnaire() {
  const {
    draftProfile,
    dispatch,
    submission,
    questionPlan,
    catalogueStatus,
    catalogueLoad,
    mode,
    submit: submitProfile,
  } = useSession();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const stepTitle = useRef(null);
  const firstRender = useRef(true);
  const errorSummary = useRef(null);
  const navigate = useNavigate();
  const sections = questionPlan ? visibleSections(draftProfile, questionPlan) : [];
  const definitions = questionPlan ? fieldsFor(draftProfile, questionPlan) : {};
  const activeStep = Math.min(step, sections.length);
  const reviewing = activeStep === sections.length;
  const section = sections[activeStep];
  const presented = (reviewing ? sections.flatMap((s) => s.fields) : section?.fields || []).join(
    '|',
  );
  useEffect(() => {
    if (catalogueStatus === 'ready')
      dispatch({ type: 'presented', fields: presented ? presented.split('|') : [] });
  }, [catalogueStatus, presented, dispatch]);
  useEffect(() => {
    if (step > sections.length) setStep(sections.length);
  }, [step, sections.length]);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    stepTitle.current?.focus();
  }, [step]);
  function changeStep(index) {
    setErrors({});
    setStep(index);
  }
  function submit(event) {
    event.preventDefault();
    const found = validateAnswers(
      draftProfile,
      reviewing ? undefined : section.fields,
      questionPlan,
    );
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      const target = sections.findIndex((s) => s.fields.includes(first));
      if (reviewing && target >= 0) setStep(target);
      requestAnimationFrame(() =>
        (document.getElementById(first) || errorSummary.current)?.focus(),
      );
      return;
    }
    if (reviewing) {
      const result = submitProfile();
      if (result.ok) navigate('/results');
      else {
        setErrors(
          Object.fromEntries(
            result.errors.map((error) => [error.field || 'submission', error.message]),
          ),
        );
        requestAnimationFrame(() => errorSummary.current?.focus());
      }
    } else setStep(step + 1);
  }
  if (catalogueStatus !== 'ready')
    return (
      <div className="container page">
        <h1>Your student profile</h1>
        <CatalogueState />
      </div>
    );
  return (
    <div className="container page">
      <Link to={submission ? '/results' : '/'} className="back-link">
        <Icon name="arrow" size={16} />
        {submission ? 'Back to results' : 'Back to home'}
      </Link>
      <div className="questionnaire-layout">
        <aside className="questionnaire-aside">
          <span className="eyebrow">Your first step</span>
          <h1>
            A little about you.
            <br />
            <em>A clearer way forward.</em>
          </h1>
          <p>Build your student profile, one simple step at a time.</p>
          <ol className="stepper" aria-label="Questionnaire progress">
            {[...sections.map((s) => s.short), 'Review answers'].map((label, index) => (
              <li
                key={label}
                className={
                  index === step
                    ? 'stepper__item stepper__item--active'
                    : index < step
                      ? 'stepper__item stepper__item--done'
                      : 'stepper__item'
                }
                aria-current={index === step ? 'step' : undefined}
              >
                <span className="stepper__number">
                  {index < step ? (
                    <Icon name="check" size={15} />
                  ) : (
                    String(index + 1).padStart(2, '0')
                  )}
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
          <div className="questionnaire-aside__privacy">
            <Icon name="shield" />
            <p>
              Your answers stay in this tab’s memory. Refreshing or closing the tab clears your
              progress.
            </p>
          </div>
        </aside>
        <div className="questionnaire-main">
          <div className="form-progress">
            <span>
              Step {step + 1} of {sections.length + 1}
            </span>
            <span>{reviewing ? 'Ready to review' : 'Your profile, your pace'}</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${((step + 1) / (sections.length + 1)) * 100}%` }} />
          </div>
          <form className="questionnaire-card" onSubmit={submit} noValidate>
            {Object.keys(errors).length > 0 && (
              <div role="alert" tabIndex="-1" ref={errorSummary}>
                <strong>Please check these answers.</strong>
                <ul>
                  {Object.entries(errors)
                    .filter(([, message]) => message)
                    .map(([field, message]) => (
                      <li key={field}>{message}</li>
                    ))}
                </ul>
              </div>
            )}
            <span className="eyebrow">{reviewing ? 'One last look' : section.short}</span>
            <h2 tabIndex="-1" ref={stepTitle}>
              {reviewing ? 'Does everything look right?' : section.title}
            </h2>
            <p className="questionnaire-card__intro">
              {reviewing
                ? 'You can edit any answer. Unanswered questions stay unknown; you do not need to fill everything in.'
                : section.description}
            </p>
            {reviewing ? (
              <div className="answer-review">
                {sections.map((s, index) => (
                  <section className="answer-review__section" key={s.id}>
                    <div className="answer-review__heading">
                      <h3>{s.short}</h3>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => changeStep(index)}
                        aria-label={`Edit ${s.short.toLowerCase()} answers`}
                      >
                        Edit <Icon name="edit" size={14} />
                      </button>
                    </div>
                    <dl>
                      {s.fields.map((id) => (
                        <div key={id}>
                          <dt>{definitions[id].label}</dt>
                          <dd>{answerLabel(draftProfile, id, questionPlan)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            ) : (
              <div className="fields">
                {section.fields.map((id) => (
                  <Field
                    key={id}
                    id={id}
                    definition={definitions[id]}
                    value={
                      id.startsWith('additionalAnswers.')
                        ? draftProfile.additionalAnswers?.[id.split('.')[1]]
                        : draftProfile[id]
                    }
                    error={errors[id]}
                    onChange={(value) => {
                      dispatch({ type: 'answer', field: id, value });
                      setErrors((previous) => ({ ...previous, [id]: undefined }));
                    }}
                  />
                ))}
                {section.id === 'details' && draftProfile.scoreType === 'cgpa' && (
                  <Notice title="Your CGPA stays unconverted.">
                    <p>
                      Percentage-based conditions will need verification until an official
                      conversion rule is available.
                    </p>
                  </Notice>
                )}
              </div>
            )}
            {reviewing && <ModeDisclosure mode={mode} coverage={catalogueLoad.coverage} />}
            <div className="form-navigation">
              <Button
                type="button"
                variant="secondary"
                disabled={step === 0}
                onClick={() => changeStep(step - 1)}
              >
                Back
              </Button>
              <Button type="submit">
                {reviewing ? 'Show My Scholarships' : 'Continue'}
                <Icon name="arrow" size={17} />
              </Button>
            </div>
          </form>
          <p className="form-footnote">
            <Icon name="shield" size={15} />
            No account, Aadhaar, bank details, or documents needed.
          </p>
        </div>
      </div>
    </div>
  );
}
