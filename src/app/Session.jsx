import { createContext, useContext, useReducer } from 'react';
import { normalizeProfile, updateAnswer } from '../data/questions';

const SessionContext = createContext(null);
const initialState = { draftProfile: {}, submittedProfile: null, checklistProgress: {} };
function reducer(state, action) {
  switch (action.type) {
    case 'answer':
      return {
        ...state,
        draftProfile: updateAnswer(state.draftProfile, action.field, action.value),
      };
    case 'submit':
      return { ...state, submittedProfile: normalizeProfile(state.draftProfile) };
    case 'check':
      return {
        ...state,
        checklistProgress: { ...state.checklistProgress, [action.key]: action.checked },
      };
    case 'reset':
      return initialState;
    default:
      return state;
  }
}
export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stale =
    state.submittedProfile !== null &&
    JSON.stringify(normalizeProfile(state.draftProfile)) !== JSON.stringify(state.submittedProfile);
  return (
    <SessionContext.Provider value={{ ...state, dispatch, stale }}>
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  return useContext(SessionContext);
}
