import { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { getCatalogue } from '../repositories/catalogue.js';
import { buildQuestionPlan } from '../domain/profile/question-plan.js';
import { vocabularies } from '../data/vocabularies.js';
import { catalogueMode } from '../data/catalogue-mode.js';
import { createSubmission } from './submission.js';
import { initialState, sessionReducer } from './session-state.js';

const SessionContext = createContext(null);
export function SessionProvider({ children, loader = getCatalogue, mode = catalogueMode.mode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  const [attempt, retry] = useState(0);
  const stateRef = useRef(state);
  const submitting = useRef(false);
  stateRef.current = state;
  useEffect(() => {
    let active = true;
    dispatch({ type: 'catalogue-loading' });
    Promise.resolve()
      .then(loader)
      .then((load) => {
        if (load.mode !== mode) throw new Error('Catalogue mode does not match configuration.');
        const plan = buildQuestionPlan(load.catalogue, { vocab: vocabularies });
        if (active) dispatch({ type: 'catalogue-ready', load, plan });
      })
      .catch(() => {
        if (active) dispatch({ type: 'catalogue-error' });
      });
    return () => {
      active = false;
    };
  }, [loader, mode, attempt]);
  function submit() {
    if (submitting.current || stateRef.current.catalogueStatus !== 'ready')
      return {
        ok: false,
        errors: [{ field: '', message: 'Wait for the catalogue before submitting.' }],
      };
    submitting.current = true;
    try {
      const result = createSubmission({
        ...stateRef.current,
        evaluatedAt: new Date().toISOString(),
      });
      if (result.ok) {
        const action = { type: 'submit-success', submission: result.submission };
        if (sessionReducer(stateRef.current, action) === stateRef.current)
          return {
            ok: false,
            errors: [{ field: '', message: 'Your answers changed. Please submit again.' }],
          };
        dispatch(action);
      }
      return result;
    } catch {
      return {
        ok: false,
        errors: [
          {
            field: '',
            message:
              'We could not assess this catalogue. Your answers and previous submission have been kept. Please retry or return home.',
          },
        ],
      };
    } finally {
      submitting.current = false;
    }
  }
  return (
    <SessionContext.Provider
      value={{
        ...state,
        mode,
        dispatch,
        submit,
        retryCatalogue: () => retry((value) => value + 1),
        stale: Boolean(
          state.submission && state.draftRevision !== state.submission.submittedRevision,
        ),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  return useContext(SessionContext);
}
