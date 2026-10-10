import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';
import { Button } from '../components/UI';
import Landing from '../pages/Landing';
import Questionnaire from '../pages/Questionnaire';
import Results from '../pages/Results';
import ScholarshipDetail from '../pages/ScholarshipDetail';
import NotFound from '../pages/NotFound';
import { useSession } from './Session';

function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const heading = document.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    const name =
      pathname === '/'
        ? 'Your future. Your opportunities.'
        : pathname === '/questionnaire'
          ? 'Your student profile'
          : pathname === '/results'
            ? 'Scholarship results'
            : 'Scholarship requirements';
    document.title = `Schemelog — ${name}`;
  }, [pathname]);
  return null;
}
export default function App() {
  const { mode } = useSession();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="preview-strip">
        <span className="preview-dot" />
        Schemelog <span className="preview-strip__separator">/</span>{' '}
        <strong>
          {mode === 'demo'
            ? 'Interactive demo · Fictional scholarships'
            : 'Reviewed catalogue · Limited coverage'}
        </strong>
      </div>
      <header className="header">
        <div className="container header__inner">
          <Link to="/" className="brand" aria-label="Schemelog home">
            <span className="brand__mark">
              <Icon name="book" size={22} />
            </span>
            scheme<span className="brand__light">log</span>
            <span className="brand__dot">.</span>
          </Link>
          <nav aria-label="Main navigation">
            <NavLink to="/" end>
              Home
            </NavLink>
            <Link to="/#how-it-works">How it works</Link>
            <Button to="/questionnaire" variant="secondary">
              Get started <Icon name="arrow" size={16} />
            </Button>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex="-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/results" element={<Results />} />
          <Route path="/scholarships/:slug" element={<ScholarshipDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container footer__inner">
          <div>
            <Link className="brand brand--footer" to="/">
              <Icon name="book" />
              schemelog.
            </Link>
            <p>Your future. Your opportunities.</p>
          </div>
          <p className="footer__disclosure">
            An independent discovery platform, not a government website.
            <br />
            {mode === 'demo'
              ? 'Interactive demo · Fictional schemes'
              : 'Limited reviewed catalogue'}{' '}
            · No applications submitted here.
          </p>
          <div className="footer__links">
            <Link to="/#privacy">Privacy</Link>
            <Link to="/#methodology">Our approach</Link>
          </div>
        </div>
      </footer>
      <RouteFocus />
    </>
  );
}
