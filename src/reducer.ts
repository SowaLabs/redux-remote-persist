import * as ActionTypes from './actions';
import { PersistState, PersistAction } from './types';

const initialState: PersistState = {
  isFlushing: false,
  isUpdateQueued: false,
  pendingUpdateCount: 0,
};

function root(state = initialState, action: PersistAction): PersistState {
  switch (action.type) {
    case ActionTypes.FLUSH:
      return { ...state, isFlushing: true };
    case ActionTypes.FLUSH_SUCCESS:
      return { ...state, isFlushing: false };

    case ActionTypes.STATE_UPDATE_QUEUED:
      return { ...state, isUpdateQueued: true };

    case ActionTypes.STATE_UPDATE_REQUEST:
      return {
        ...state,
        pendingUpdateCount: state.pendingUpdateCount + 1,
        isUpdateQueued: false,
      };
    case ActionTypes.STATE_UPDATE_SUCCESS:
      return { ...state, pendingUpdateCount: state.pendingUpdateCount - 1 };

    // clean state on starting / stopping persistence
    case ActionTypes.PURGE:
    case ActionTypes.PERSIST:
    case ActionTypes.REHYDRATE:
      return initialState;

    default:
      return state;
  }
}

export default root;
