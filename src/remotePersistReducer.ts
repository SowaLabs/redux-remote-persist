import { Action, Reducer, AnyAction } from 'redux';
import { REHYDRATE_REDUCER } from './actions';

export default function remotePersistReducer<S = any, A extends Action = AnyAction>(
  config: { key: string },
  baseReducer: Reducer<S, A>,
): Reducer<S, A> {
  return (state, action: any) => {
    if (action.type === REHYDRATE_REDUCER) {
      // @NOTE if key does not match, will continue to default else below
      if (action.key === config.key) {
        // payload contains merged state (is this really the best behaviour?)
        const newState = action.payload;
        return newState;
      }
    }

    const newState = baseReducer(state, action);
    return newState;
  };
}
