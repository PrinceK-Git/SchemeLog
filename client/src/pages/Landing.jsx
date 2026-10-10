import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from '../components/Icon';
import { Button } from '../components/UI';
import './Landing.css';

export default function Landing() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);
  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <span className="eyebrow hero__eyebrow">
              <span className="little-line" />A brighter next chapter
            </span>
            <h1>
              Find scholarships
              <br />
              meant for <em>you.</em>
            </h1>
            <p className="hero__description">
              Answer a few simple questions to explore government scholarships that may fit your
              academic and financial profile.
            </p>
            <div className="hero__actions">
              <Button to="/questionnaire">
                Find My Scholarships <Icon name="arrow" />
              </Button>
              <span className="hero__time">
                <Icon name="clock" size={16} />A few simple steps
              </span>
            </div>
            <div className="hero__trust">
              <span>
                <Icon name="shield" size={16} />
                No sign-up needed
              </span>
              <span>
                <Icon name="check" size={16} />
                Your answers stay in this tab
              </span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-art__orbit" />
            <span className="hero-art__spark hero-art__spark--one">✳</span>
            <span className="hero-art__spark hero-art__spark--two">✳</span>
            <div className="hero-art__paper">
              <div className="hero-art__paper-head">
                <span className="hero-art__icon">
                  <Icon name="book" size={26} />
                </span>
                <span className="hero-art__dots">•••</span>
              </div>
              <span className="eyebrow">YOUR NEXT CHAPTER</span>
              <h2>
                A little support.
                <br />A world of possibility.
              </h2>
              <div className="hero-art__line" />
              <div className="hero-art__line hero-art__line--short" />
              <div className="hero-art__rows">
                <div>
                  <span>
                    <Icon name="check" size={14} />
                  </span>
                  Understand the requirements
                </div>
                <div>
                  <span>
                    <Icon name="check" size={14} />
                  </span>
                  Prepare with confidence
                </div>
                <div>
                  <span>
                    <Icon name="check" size={14} />
                  </span>
                  Take your next step
                </div>
              </div>
              <span className="hero-art__paper-footer">
                Learning opens doors. <Icon name="arrow" />
              </span>
            </div>
            <div className="hero-art__note">
              <span className="hero-art__note-icon">
                <Icon name="leaf" size={24} />
              </span>
              <div>
                <strong>Room to grow.</strong>
                <span>Opportunities worth exploring</span>
              </div>
            </div>
            <div className="hero-art__label">
              <span className="preview-dot" />
              Made for your journey
            </div>
          </div>
        </div>
      </section>
      <div className="principles">
        <div className="container principles__grid">
          <span>
            <Icon name="search" />
            Discover relevant opportunities
          </span>
          <span>
            <Icon name="book" />
            Understand the fine print
          </span>
          <span>
            <Icon name="file" />
            Know what comes next
          </span>
        </div>
      </div>
      <section className="section container" id="how-it-works">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Less searching. More clarity.</span>
            <h2>A simpler path to support.</h2>
          </div>
          <p>
            From “where do I start?”
            <br />
            to a clear next step.
          </p>
        </div>
        <div className="steps-grid">
          {[
            {
              n: '01',
              icon: 'edit',
              title: 'Tell us a little about you',
              text: 'Share your study details and the information you’re comfortable with. Unsure answers are welcome.',
            },
            {
              n: '02',
              icon: 'search',
              title: 'Understand your options',
              text: 'Explore clear result categories, with space for what matches and what still needs checking.',
            },
            {
              n: '03',
              icon: 'file',
              title: 'Get ready for the next step',
              text: 'Review a preparation checklist, then use official sources for the latest rules and application process.',
            },
          ].map((step) => (
            <article className="step-card" key={step.n}>
              <div className="step-card__top">
                <Icon name={step.icon} size={27} />
                <span>{step.n}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="container about-grid section" id="methodology">
        <div className="about-panel">
          <span className="eyebrow">Clarity, not guesswork</span>
          <h2>
            Every answer deserves
            <br />
            an honest explanation.
          </h2>
          <p>
            The full product will compare your answers with reviewed scholarship rules and explain
            both the matches and the unknowns. Final eligibility and approval always rest with the
            responsible authority.
          </p>
          <div className="about-panel__note">
            <Icon name="info" />
            <p>
              This preview contains four fictional schemes to demonstrate the experience. It does
              not calculate eligibility or represent a verified scholarship catalogue.
            </p>
          </div>
        </div>
        <div className="privacy-panel" id="privacy">
          <span className="privacy-panel__icon">
            <Icon name="shield" size={30} />
          </span>
          <h3>
            Your information.
            <br />
            Your choice.
          </h3>
          <p>
            No account. No documents to upload. No Aadhaar, bank account numbers, government
            passwords, or OTPs.
          </p>
          <p>
            Your answers and checklist stay in memory during this session. Refreshing or closing the
            tab clears them. They aren’t sent to a server or added to links.
          </p>
          <Button to="/questionnaire" variant="text">
            Take the first step <Icon name="arrow" />
          </Button>
        </div>
      </section>
    </>
  );
}
