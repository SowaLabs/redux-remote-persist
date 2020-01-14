import { StoragePayload, AppStateMap, AppState } from './types';

// used to reset all reducers to their default values
export const RESET_REDUX_STATE = 'RESET_REDUX_STATE';
export const resetReduxState = () => ({ type: RESET_REDUX_STATE } as const);

export const REHYDRATE = 'PERSIST::REHYDRATE';
export const PERSIST = 'PERSIST::PERSIST';
export const FLUSH = 'PERSIST::FLUSH';
export const FLUSH_SUCCESS = 'PERSIST::FLUSH_SUCCESS';
export const PURGE = 'PERSIST::PURGE';
export const REHYDRATE_REDUCER = 'PERSIST::REHYDRATE_REDUCER';

export const rehydrate = () => ({ type: REHYDRATE } as const);
export const persist = (initialState: AppStateMap) => ({ type: PERSIST, initialState } as const);
export const flush = () => ({ type: FLUSH } as const);
export const flushSuccess = () => ({ type: FLUSH_SUCCESS } as const);
export const purge = () => ({ type: PURGE } as const);
export const rehydrateReducer = (key: string, payload: AppState) =>
  ({
    type: REHYDRATE_REDUCER,
    payload,
    key,
  } as const);

// used internally to know when we are updating the state
export const STATE_UPDATE_QUEUED = 'PERSIST::STATE_UPDATE_QUEUED';
export const STATE_UPDATE_REQUEST = 'PERSIST::STATE_UPDATE_REQUEST';
export const STATE_UPDATE_SUCCESS = 'PERSIST::STATE_UPDATE_SUCCESS';
export const stateUpdateQueued = () => ({ type: STATE_UPDATE_QUEUED } as const);
export const stateUpdateRequest = () => ({ type: STATE_UPDATE_REQUEST } as const);
export const stateUpdateSuccess = () => ({ type: STATE_UPDATE_SUCCESS } as const);

export const REMOTE_STORAGE_FETCH_REQUEST = 'PERSIST::REMOTE_STORAGE_FETCH_REQUEST';
export const REMOTE_STORAGE_FETCH_SUCCESS = 'PERSIST::REMOTE_STORAGE_FETCH_SUCCESS';
export const REMOTE_STORAGE_FETCH_FAILURE = 'PERSIST::REMOTE_STORAGE_FETCH_FAILURE';

export const remoteStorageFetchRequest = () =>
  ({
    type: REMOTE_STORAGE_FETCH_REQUEST,
  } as const);
export const remoteStorageFetchSuccess = (payload: StoragePayload) =>
  ({
    type: REMOTE_STORAGE_FETCH_SUCCESS,
    payload,
  } as const);
export const remoteStorageFetchFailure = (error: object) =>
  ({
    type: REMOTE_STORAGE_FETCH_FAILURE,
    error,
  } as const);

export const LOCAL_STORAGE_FETCH_REQUEST = 'PERSIST::LOCAL_STORAGE_FETCH_REQUEST';
export const LOCAL_STORAGE_FETCH_SUCCESS = 'PERSIST::LOCAL_STORAGE_FETCH_SUCCESS';
export const LOCAL_STORAGE_FETCH_FAILURE = 'PERSIST::LOCAL_STORAGE_FETCH_FAILURE';

export const localStorageFetchRequest = () =>
  ({
    type: LOCAL_STORAGE_FETCH_REQUEST,
  } as const);
export const localStorageFetchSuccess = (payload: StoragePayload) =>
  ({
    type: LOCAL_STORAGE_FETCH_SUCCESS,
    payload,
  } as const);
export const localStorageFetchFailure = (error: object) =>
  ({
    type: LOCAL_STORAGE_FETCH_FAILURE,
    error,
  } as const);

export const REMOTE_STORAGE_UPDATE_SUCCESS = 'PERSIST::REMOTE_STORAGE_UPDATE_SUCCESS';
export const REMOTE_STORAGE_UPDATE_FAILURE = 'PERSIST::REMOTE_STORAGE_UPDATE_FAILURE';

export const remoteStorageUpdateSuccess = (payload: object, request: any) =>
  ({
    type: REMOTE_STORAGE_UPDATE_SUCCESS,
    payload,
    request,
  } as const);
export const remoteStorageUpdateFailure = (error: object) =>
  ({
    type: REMOTE_STORAGE_UPDATE_FAILURE,
    error,
  } as const);

export const LOCAL_STORAGE_UPDATE_REQUEST = 'PERSIST::LOCAL_STORAGE_UPDATE_REQUEST';
export const LOCAL_STORAGE_UPDATE_SUCCESS = 'PERSIST::LOCAL_STORAGE_UPDATE_SUCCESS';
export const LOCAL_STORAGE_UPDATE_FAILURE = 'PERSIST::LOCAL_STORAGE_UPDATE_FAILURE';

export const localStorageUpdateRequest = (payload: object) =>
  ({
    type: LOCAL_STORAGE_UPDATE_REQUEST,
    payload,
  } as const);
export const localStorageUpdateSuccess = () =>
  ({
    type: LOCAL_STORAGE_UPDATE_SUCCESS,
  } as const);
export const localStorageUpdateFailure = (error: object) =>
  ({
    type: LOCAL_STORAGE_UPDATE_FAILURE,
    error,
  } as const);

export const LOCAL_STORAGE_PURGE_SUCCESS = 'PERSIST::LOCAL_STORAGE_PURGE_SUCCESS';
export const LOCAL_STORAGE_PURGE_FAILURE = 'PERSIST::LOCAL_STORAGE_PURGE_FAILURE';

export const localStoragePurgeSuccess = () =>
  ({
    type: LOCAL_STORAGE_PURGE_SUCCESS,
  } as const);
export const localStoragePurgeFailure = (error: object) =>
  ({
    type: LOCAL_STORAGE_PURGE_FAILURE,
    error,
  } as const);
