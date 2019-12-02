// @flow

import { REHYDRATE_REDUCER } from './actions'

export default function remotePersistReducer<State: Object, Action: Object>(
  config: { key: string },
  baseReducer: (State, Action) => State
): (State, Action) => State {
  return (state: State, action) => {
    if (action.type === REHYDRATE_REDUCER) {
      // @NOTE if key does not match, will continue to default else below
      if (action.key === config.key) {
        // payload contains merged state (is this really the best behaviour?)
        let newState = action.payload
        return newState
      }
    }

    let newState = baseReducer(state, action)
    return newState
  }
}
