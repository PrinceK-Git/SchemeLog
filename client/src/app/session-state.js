import { updateAnswer } from '../data/questions.js';

export const initialState = {
  draftProfile: {},
  draftRevision: 0,
  presentedFields: [],
  submission: null,
  checklistProgress: {},
  catalogueLoad: null,
  questionPlan: null,
  catalogueStatus: 'loading',
};

export function sessionReducer(state, action) {
  switch (action.type) {
    case 'catalogue-loading':
      return { ...state, catalogueStatus: 'loading' };
    case 'catalogue-ready': {
      const changed =
        state.catalogueLoad &&
        (state.catalogueLoad.mode !== action.load.mode ||
          state.catalogueLoad.catalogue.catalogueVersion !==
            action.load.catalogue.catalogueVersion);
      return {
        ...state,
        catalogueLoad: action.load,
        questionPlan: action.plan,
        catalogueStatus: action.load.catalogue.schemes.length ? 'ready' : 'empty',
        ...(changed
          ? { draftProfile: {}, presentedFields: [], draftRevision: state.draftRevision + 1 }
          : {}),
      };
    }
    case 'catalogue-error':
      return { ...state, catalogueStatus: 'error' };
    case 'presented': {
      const fields = [...new Set([...state.presentedFields, ...action.fields])];
      return fields.length === state.presentedFields.length
        ? state
        : { ...state, presentedFields: fields };
    }
    case 'answer': {
      const draftProfile = updateAnswer(state.draftProfile, action.field, action.value);
      return JSON.stringify(draftProfile) === JSON.stringify(state.draftProfile)
        ? state
        : { ...state, draftProfile, draftRevision: state.draftRevision + 1 };
    }
    case 'submit-success':
      if (
        state.catalogueStatus !== 'ready' ||
        action.submission.submittedRevision !== state.draftRevision ||
        action.submission.context.mode !== state.catalogueLoad.mode ||
        action.submission.context.catalogueVersion !==
          state.catalogueLoad.catalogue.catalogueVersion
      )
        return state;
      return { ...state, submission: structuredClone(action.submission) };
    case 'check':
      if (
        !state.submission?.documentApplicability[action.key] ||
        state.submission.documentApplicability[action.key].outcome === 'fail' ||
        typeof action.checked !== 'boolean'
      )
        return state;
      return {
        ...state,
        checklistProgress: { ...state.checklistProgress, [action.key]: action.checked },
      };
    case 'reset':
      return {
        ...initialState,
        catalogueLoad: state.catalogueLoad,
        questionPlan: state.questionPlan,
        catalogueStatus: state.catalogueStatus,
      };
    default:
      return state;
  }
}
