// @flow

// used to reset all reducers to their default values
export const RESET_REDUX_STATE = "RESET_REDUX_STATE";
export const resetReduxState = () => ({ type: RESET_REDUX_STATE });

export const REHYDRATE = "PERSIST::REHYDRATE";
export const PERSIST = "PERSIST::PERSIST";
export const FLUSH = "PERSIST::FLUSH";
export const FLUSH_SUCCESS = "PERSIST::FLUSH_SUCCESS";
export const PURGE = "PERSIST::PURGE";
export const REHYDRATE_REDUCER = "PERSIST::REHYDRATE_REDUCER";

export const rehydrate = () => ({ type: REHYDRATE });
export const persist = (initialState: {}) => ({ type: PERSIST, initialState });
export const flush = () => ({ type: FLUSH });
export const flushSuccess = () => ({ type: FLUSH_SUCCESS });
export const purge = () => ({ type: PURGE });
export const rehydrateReducer = (key: string, payload: {}) => ({
  type: REHYDRATE_REDUCER,
  payload,
  key
});

// used internally to know when we are updating the state
export const STATE_UPDATE_QUEUED = "PERSIST::STATE_UPDATE_QUEUED";
export const STATE_UPDATE_REQUEST = "PERSIST::STATE_UPDATE_REQUEST";
export const STATE_UPDATE_SUCCESS = "PERSIST::STATE_UPDATE_SUCCESS";
export const stateUpdateQueued = () => ({ type: STATE_UPDATE_QUEUED });
export const stateUpdateRequest = () => ({ type: STATE_UPDATE_REQUEST });
export const stateUpdateSuccess = () => ({ type: STATE_UPDATE_SUCCESS });

export const REMOTE_STORAGE_FETCH_REQUEST =
  "PERSIST::REMOTE_STORAGE_FETCH_REQUEST";
export const REMOTE_STORAGE_FETCH_SUCCESS =
  "PERSIST::REMOTE_STORAGE_FETCH_SUCCESS";
export const REMOTE_STORAGE_FETCH_FAILURE =
  "PERSIST::REMOTE_STORAGE_FETCH_FAILURE";

export const remoteStorageFetchRequest = () => ({
  type: REMOTE_STORAGE_FETCH_REQUEST
});
export const remoteStorageFetchSuccess = (payload: {}) => ({
  type: REMOTE_STORAGE_FETCH_SUCCESS,
  payload
});
export const remoteStorageFetchFailure = (error: {}) => ({
  type: REMOTE_STORAGE_FETCH_FAILURE,
  error
});

export const LOCAL_STORAGE_FETCH_REQUEST =
  "PERSIST::LOCAL_STORAGE_FETCH_REQUEST";
export const LOCAL_STORAGE_FETCH_SUCCESS =
  "PERSIST::LOCAL_STORAGE_FETCH_SUCCESS";
export const LOCAL_STORAGE_FETCH_FAILURE =
  "PERSIST::LOCAL_STORAGE_FETCH_FAILURE";

export const localStorageFetchRequest = () => ({
  type: LOCAL_STORAGE_FETCH_REQUEST
});
export const localStorageFetchSuccess = (payload: {}) => ({
  type: LOCAL_STORAGE_FETCH_SUCCESS,
  payload
});
export const localStorageFetchFailure = (error: {}) => ({
  type: LOCAL_STORAGE_FETCH_FAILURE,
  error
});

export const REMOTE_STORAGE_UPDATE_SUCCESS =
  "PERSIST::REMOTE_STORAGE_UPDATE_SUCCESS";
export const REMOTE_STORAGE_UPDATE_FAILURE =
  "PERSIST::REMOTE_STORAGE_UPDATE_FAILURE";

export const remoteStorageUpdateSuccess = (payload: {}, request: any) => ({
  type: REMOTE_STORAGE_UPDATE_SUCCESS,
  payload,
  request
});
export const remoteStorageUpdateFailure = (error: {}) => ({
  type: REMOTE_STORAGE_UPDATE_FAILURE,
  error
});

export const LOCAL_STORAGE_UPDATE_REQUEST =
  "PERSIST::LOCAL_STORAGE_UPDATE_REQUEST";
export const LOCAL_STORAGE_UPDATE_SUCCESS =
  "PERSIST::LOCAL_STORAGE_UPDATE_SUCCESS";
export const LOCAL_STORAGE_UPDATE_FAILURE =
  "PERSIST::LOCAL_STORAGE_UPDATE_FAILURE";

export const localStorageUpdateRequest = (payload: {}) => ({
  type: LOCAL_STORAGE_UPDATE_REQUEST,
  payload
});
export const localStorageUpdateSuccess = () => ({
  type: LOCAL_STORAGE_UPDATE_SUCCESS
});
export const localStorageUpdateFailure = (error: {}) => ({
  type: LOCAL_STORAGE_UPDATE_FAILURE,
  error
});

export const LOCAL_STORAGE_PURGE_SUCCESS =
  "PERSIST::LOCAL_STORAGE_PURGE_SUCCESS";
export const LOCAL_STORAGE_PURGE_FAILURE =
  "PERSIST::LOCAL_STORAGE_PURGE_FAILURE";

export const localStoragePurgeSuccess = () => ({
  type: LOCAL_STORAGE_PURGE_SUCCESS
});
export const localStoragePurgeFailure = (error: {}) => ({
  type: LOCAL_STORAGE_PURGE_FAILURE,
  error
});
