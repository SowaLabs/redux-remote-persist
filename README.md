# Redux Remote Persist

Persist and rehydrate a redux store to remote and local storage.

## Usage
`yarn add redux-persist`

1. Add epic to `redux-observable`:

```js
import AsyncStorage from '@react-native-community/async-storage';

const remotePersistEpic = createRemotePersistEpic({
  getCommonHeaders: () => ({ 'X-App': 'BISON_app' }),
  getAccessToken: (state) => state.auth.tokens.accessToken,
  getBaseUrl: (accessToken) => 'https://example-url.com',
  // used internally
  getPersistState: (state) => state.persist,
  handleAjaxError: (action$, errorAction) => (error, source) => of(errorAction(error)),
  localStorageKey: 'bisonapp',
  persistDebounceTime: 5000,
  // select states which we want to persist
  persistSelectors: {
    'bisonapp-settings': (state) => state.settings,
    'bisonapp-storereview': (state) => state.storeReview,
  },
  // select states which we want to rehydrate
  rehydrateSelectors: {
    'bisonapp-settings': (state) => state.settings,
    'bisonapp-config': (state) => state.config,
    'bisonapp-storereview': (state) => state.storeReview,
  },
  storage: AsyncStorage,
});
```

2. Integrate reducers:

```js
// configureStore.js

import { remotePersistInternalReducer, remotePersistReducer } from 'redux-remote-persist';


import config from './reducers/config';
import settings from './reducers/settings';
import storeReview from './reducers/storeReview';

// root reducer
const appReducer: any = combineReducers({
  // remote persist reducers
  config: remotePersistReducer({ key: 'bisonapp-config' }, config), // read-only state
  settings: remotePersistReducer({ key: 'bisonapp-settings' }, settings),
  // WARNING: use all lower case keys! e.g. 'bisonapp-storereview' (remote supports only all lowercase)
  storeReview: remotePersistReducer({ key: 'bisonapp-storereview' }, storeReview),

  // used internally by redux-remote-persist
  persist: remotePersistInternalReducer,
});
```

3. (optional) Use actions to hook into `redux-remote-persist`:

```js
import { actions } from 'redux-remote-persist';

```
