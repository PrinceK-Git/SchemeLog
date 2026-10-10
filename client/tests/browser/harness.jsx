// Separate test-only entry. Never imported by the application or production build.
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '../../src/app/App.jsx';
import { SessionProvider } from '../../src/app/Session.jsx';
import { createCatalogueRepository } from '../../src/repositories/catalogue.js';
import { demoCatalogue } from '../../src/data/demo-catalogue.js';
import reviewed from '../../src/data/catalogue.json';
import '../../src/styles/tokens.css';
import '../../src/styles/global.css';
import '../../src/styles/layout.css';

function Harness() {
  const [scenario, setScenario] = useState('empty');
  const mode = scenario === 'companions' || scenario === 'strict' ? 'demo' : 'reviewed';
  const loader = useMemo(() => {
    let attempts = 0;
    return createCatalogueRepository({
      mode,
      loaders: {
        reviewed: async () => {
          if (scenario === 'retry' && attempts++ === 0) throw new Error('Isolated load failure');
          const catalogue = structuredClone(reviewed);
          if (scenario === 'invalid') catalogue.coverage.schemeCount = 1;
          if (scenario === 'quarantine')
            catalogue.coverage.quarantined = [
              { id: 'sch-withheld', reason: 'Independent review is missing.' },
            ];
          return catalogue;
        },
        demo: async () => {
          const catalogue = structuredClone(demoCatalogue);
          if (scenario === 'strict')
            catalogue.schemes[0].eligibility.rule.children[1].operator = 'lt';
          if (scenario === 'companions') {
            catalogue.schemes[0].eligibility.rule.children.push({
              id: 'r-test-score',
              operator: 'gte',
              field: 'academicScore',
              value: 60,
              scale: 'percentage',
              context: 'class-12-board',
              explanationKey: 'test.score',
              evidence: ['src-demo-undergraduate#loc-condition'],
            });
            catalogue.schemes[0].eligibility.rule.children.push({
              id: 'r-test-year',
              operator: 'gte',
              field: 'studyYear',
              value: 1,
              unit: 'course-year',
              explanationKey: 'test.year',
              evidence: ['src-demo-undergraduate#loc-condition'],
            });
          }
          return catalogue;
        },
      },
    }).getCatalogue;
  }, [mode, scenario]);
  return (
    <>
      <label>
        Isolated test scenario{' '}
        <select value={scenario} onChange={(event) => setScenario(event.target.value)}>
          <option value="empty">Reviewed empty</option>
          <option value="invalid">Reviewed invalid</option>
          <option value="retry">Reviewed retry</option>
          <option value="quarantine">Reviewed quarantine</option>
          <option value="companions">Companion controls</option>
          <option value="strict">Strict income boundary</option>
        </select>
      </label>
      <BrowserRouter>
        <SessionProvider key={scenario} loader={loader} mode={mode}>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </>
  );
}
createRoot(document.getElementById('root')).render(<Harness />);
