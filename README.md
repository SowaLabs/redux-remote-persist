# Redux Remote Persist

Persist and rehydrate a redux store to remote and local storage.

## Usage

`yarn add redux-persist`

1. Add epic to `redux-observable`:

```js
import AsyncStorage from '@react-native-community/async-storage';

const remotePersistEpic = createRemotePersistEpic({
  // used internally
  getPersistState: (state) => state.persist,
  remoteStorageFetchAjax: (action$, state$, { ajax }) => ajax({ url: '/fetch' }),
  remoteStorageUpdateAjax: (payload) => (action$, state$, { ajax }) =>
    ajax({ url: '/update', body: payload }),
  handleAjaxError: (action$, errorAction) => (error, source) => of(errorAction(error)),
  localStorageKey: 'myapp',
  persistDebounceTime: 5000,
  // select states which we want to persist
  persistSelectors: {
    'myapp-settings': (state) => state.settings,
    'myapp-storereview': (state) => state.storeReview,
  },
  // select states which we want to rehydrate
  rehydrateSelectors: {
    'myapp-settings': (state) => state.settings,
    'myapp-config': (state) => state.config,
    'myapp-storereview': (state) => state.storeReview,
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
  config: remotePersistReducer({ key: 'myapp-config' }, config), // read-only state
  settings: remotePersistReducer({ key: 'myapp-settings' }, settings),
  // WARNING: use all lower case keys! e.g. 'myapp-storereview' (remote supports only all lowercase)
  storeReview: remotePersistReducer({ key: 'myapp-storereview' }, storeReview),

  // used internally by redux-remote-persist
  persist: remotePersistInternalReducer,
});
```

3. (optional) Use actions to hook into `redux-remote-persist`:

```js
import { actions } from 'redux-remote-persist';
```
