import { isEmpty, isEqual, isObject, merge as _merge, transform } from 'lodash';
import { combineLatest, concat, forkJoin, from, merge, of, race, Subject } from 'rxjs';

import {
  catchError,
  concatMap,
  delay,
  distinctUntilChanged,
  exhaustMap,
  filter,
  ignoreElements,
  map,
  mapTo,
  mergeMap,
  mergeScan,
  multicast,
  pluck,
  publishBehavior,
  refCount,
  startWith,
  switchMap,
  take,
  takeUntil,
  withLatestFrom,
} from 'rxjs/operators';
import { combineEpics, Epic } from 'redux-observable';
import { isOfType, isPresent } from 'safetypings';

import * as actions from './actions';
import {
  AppStateMap,
  AppState,
  PersistStateSelector,
  StoragePayload,
  Storage,
  AccessTokenSelector,
} from './types';

import {
  PersistAction,
  PersistState,
  Services,
  KeyStateSelectors,
  AjaxErrorHandler,
  HeadersSelector,
  UrlResolver,
  RemotePersistConfig,
} from './types';

type PersistEpic = Epic<PersistAction, PersistAction, PersistState, Services>;

// Rehydrate states selected by rehydrateSelectors from local and remote storage
// in order: state < localState < remoteState.
// Local storage is useful when a new property is not yet persisted by remote storage
// and so can still have the persistence behavior.
export const createRehydrateEpic = (rehydrateSelectors: KeyStateSelectors): PersistEpic => (
  action$,
  state$,
) =>
  action$.pipe(
    filter(isOfType(actions.REHYDRATE)),
    switchMap(() =>
      merge(
        // first fetch from remote and local storage
        of(actions.remoteStorageFetchRequest(), actions.localStorageFetchRequest()),
        // listen for storage fetch completions
        forkJoin(
          action$.pipe(
            filter(
              isOfType([
                actions.REMOTE_STORAGE_FETCH_SUCCESS,
                actions.REMOTE_STORAGE_FETCH_FAILURE,
              ]),
            ),
            take(1),
          ),
          action$.pipe(
            filter(
              isOfType([actions.LOCAL_STORAGE_FETCH_SUCCESS, actions.LOCAL_STORAGE_FETCH_FAILURE]),
            ),
            take(1),
          ),
        ).pipe(
          map((actions) => actions.map((val) => ('payload' in val ? val.payload : {}))),
          // normalize 'value' props so it can be consumed by reducers; i.e.
          // from: { myapp-settings: { themeName: { value: 'light' } }, { ... } }
          // into: { myapp-settings: { themeName: 'light' }, ... }
          map((storageStates) =>
            storageStates.map((state) =>
              Object.entries(state).reduce(
                (acc, [key, val]) => ({
                  ...acc,
                  [key]: Object.entries(val).reduce(
                    (acc2, [key2, val2]) => ({
                      ...acc2,
                      [key2]: val2.value,
                    }),
                    {},
                  ),
                }),
                // typecast to correctly type empty object
                {} as AppStateMap,
              ),
            ),
          ),
          switchMap(([remoteState, localState]) =>
            concat(
              // gather all states we are interested in
              from(Object.keys(rehydrateSelectors)).pipe(
                mergeMap((stateKey) =>
                  of(state$.value).pipe(
                    // get the current state
                    map(rehydrateSelectors[stateKey]),
                    // tap((state) =>
                    //   console.tron.log({
                    //     state,
                    //     remoteState: remoteState[stateKey],
                    //     localState: localState[stateKey],
                    //   }),
                    // ),
                    // merge states from left to right: state < localState < remoteState
                    // lodash merge skips source properties that resolve to undefined, i.e.
                    // _.merge ({}, { a: 'a'  }, { a: undefined }) → { a: "a" }
                    // which is exactly what is needed, in case remote state
                    // doesn't yet have a specific property registered
                    map((state) => _merge({}, state, localState[stateKey], remoteState[stateKey])),
                    map((state) => actions.rehydrateReducer(stateKey, state)),
                  ),
                ),
              ),
              // start persisting with remoteState as initial value, since
              // we first want to update remote storage with rehydrated state
              of(actions.persist(remoteState)),
            ),
          ),
        ),
      ),
    ),
  );

// persist states selected by persistSelectors to remote and local storage
export const createPersistEpic = (
  persistSelectors: KeyStateSelectors,
  getCommonHeaders: HeadersSelector,
  getAccessToken: AccessTokenSelector,
  getBaseUrl: UrlResolver,
  getPersistState: PersistStateSelector,
  handleAjaxError: AjaxErrorHandler,
  dueTime: number,
): PersistEpic => (action$, state$, { ajax }) =>
  // use combineLatest - combines latest items emitted by each observable (all reducers that are to be persisted)
  // https://medium.com/swift-india/rxswift-combining-operators-combinelatest-zip-and-withlatestfrom-521d2eca5460
  // https://rxjs-dev.firebaseapp.com/api/index/function/combineLatest
  action$.pipe(
    // kick off remote persistance
    filter(isOfType(actions.PERSIST)),
    // supply value from remote storage, so we can diff it with rehydrated state (and update remote with difference)
    // this is useful if local reducer introduces new substate, and we need to synchronize it with remote storage
    switchMap(({ initialState }) => {
      const stateChange$ = combineLatest(
        Object.keys(persistSelectors).map((stateKey) =>
          state$.pipe(
            map(persistSelectors[stateKey]),
            // === equality check
            distinctUntilChanged(),
            // deep equal check (when reducer creates a new object with the same values)
            distinctUntilChanged(isEqual as (x: AppState, y: AppState) => boolean),
            map((state) => ({ [stateKey]: state })),
          ),
        ),
      ).pipe(
        // merge all states into object
        map((state) => state.reduce((acc, s) => ({ ...acc, ...s }), {})),
        // check for isFlushing state and hold off publishing updates until flush finishes (is false)
        switchMap((state) =>
          state$.pipe(
            distinctUntilChanged(),
            map(getPersistState),
            pluck('isFlushing'),
            filter((isFlushing) => isFlushing === false),
            take(1),
            mapTo(state),
          ),
        ),
        // Uses BehaviorSubject to make sure all subsribers get the last value,
        // otherwise, since subscribe is immediate in epic, only the first observable
        // in merge below would get a value. Only on the second run would both get a value.
        publishBehavior(undefined as AppStateMap | undefined),
        refCount(),
        // wait until we actually get a state through
        filter(isPresent),
      );

      const stateUpdate$ = stateChange$.pipe(
        // debounce
        switchMap((state) =>
          race(
            of(state).pipe(delay(dueTime)),
            action$.pipe(filter(isOfType(actions.FLUSH)), take(1), mapTo(state)),
          ),
        ),
        // multicasting last value to multiple subsribers, same as above
        publishBehavior(undefined as AppStateMap | undefined),
        refCount(),
        filter(isPresent),
      );

      return merge(
        // notify store of queued update
        stateChange$.pipe(mapTo(actions.stateUpdateQueued())),
        // notify store of new pending update
        stateUpdate$.pipe(mapTo(actions.stateUpdateRequest())),
        // push update to storages
        stateUpdate$.pipe(
          // map state into form: { myapp-settings: { themeName: { value: 'light' } }, { ... } }
          map((state) => state),
          map(normalizeToValueProps),
          // use mergeScan to remember the last successfully stored state in remote storage
          // https://stackoverflow.com/a/56762907
          mergeScan(
            ([, prevState], newState) => {
              // handles storage updates
              const observable$ = merge(
                // immediately save newState to local storage
                of(actions.localStorageUpdateRequest(newState)),
                // and wait for completion
                action$.pipe(
                  filter(
                    isOfType([
                      actions.LOCAL_STORAGE_UPDATE_SUCCESS,
                      actions.LOCAL_STORAGE_UPDATE_FAILURE,
                    ]),
                  ),
                  take(1),
                  // don't re-dispatch action
                  ignoreElements(),
                ),
                // diff new and previous state
                of(difference(newState, prevState)).pipe(
                  // only update if there was any difference
                  filter((diffState) => !isEmpty(diffState)), // push state diff updates to RemoteStorage
                  mergeMap((
                    diffState, // to ensure an accessToken is in state, listen to state$
                  ) =>
                    state$.pipe(
                      distinctUntilChanged(),
                      map(getAccessToken),
                      filter(isPresent),
                      take(1),
                      switchMap((accessToken) =>
                        ajax({
                          url: getBaseUrl(accessToken).concat('/settings'),
                          // url: getBaseUrl(accessToken).concat('/settingsERROR'),
                          method: 'PUT',
                          headers: {
                            ...getCommonHeaders(),
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                          },
                          body: diffState,
                        }).pipe(
                          pluck('response'),
                          map((response) =>
                            actions.remoteStorageUpdateSuccess(response, diffState),
                          ),
                          catchError(handleAjaxError(action$, actions.remoteStorageUpdateFailure)),
                        ),
                      ),
                    ),
                  ),
                ),
              );

              return concat(observable$, of(actions.stateUpdateSuccess())).pipe(
                // use multicast to use source stream without causing multiple
                // subscriptions to the source stream
                multicast(new Subject(), (source$) =>
                  source$.pipe(
                    // use withLatestFrom to update prevState based on remote
                    // storage update success - the next request should use the
                    // last state that was successfully stored in remote storage
                    withLatestFrom(
                      source$.pipe(
                        // filter out undefined actions (initial value)
                        // tap((state) => console.log(state)),
                        filter(isPresent),
                        filter(isOfType(actions.REMOTE_STORAGE_UPDATE_SUCCESS)),
                        take(1),
                        // if remote storage update succeeded, update state
                        mapTo(newState),
                        // tap((state) => console.log('HERE - END', state)),
                        startWith(prevState),
                        // tap((state) => console.log('HERE - STARTWITH', state)),
                      ),
                    ),
                  ),
                ),
              );
            },
            // start with initialState after debounce (race delay), otherwise it could be lost
            [undefined, normalizeToValueProps(initialState)] as [
              PersistAction | undefined,
              StoragePayload,
            ],
            // process only 1 request at a time
            1,
          ),
          map(([action]) => action),
          filter(isPresent),
        ),
      ).pipe(
        // stop persistence after purging or new rehydration request (both also reset reducer state)
        // to avoid leaks, takeUntil should generally be the last operator in seq
        takeUntil(action$.pipe(filter(isOfType([actions.PURGE, actions.REHYDRATE])))),
      );
    }),
  );

// flush current update queue
const flushEpic = (getPersistState: PersistStateSelector): PersistEpic => (action$, state$) =>
  action$.pipe(
    filter(isOfType(actions.FLUSH)),
    exhaustMap(() =>
      state$.pipe(
        distinctUntilChanged(),
        map(getPersistState),
        map((persist) => persist.isUpdateQueued === false && persist.pendingUpdateCount === 0),
        filter(Boolean),
        take(1),
        mapTo(actions.flushSuccess()),
      ),
    ),
  );

// orchestrates sequential access to local storage
const localStorageEpic = (storage: Storage, storageKey: string): PersistEpic => (action$) =>
  action$.pipe(
    filter(
      isOfType([
        actions.LOCAL_STORAGE_FETCH_REQUEST,
        actions.LOCAL_STORAGE_UPDATE_REQUEST,
        actions.PURGE,
      ]),
    ),
    // process requests sequentially with concatMap
    concatMap((action) => {
      switch (action.type) {
        case actions.LOCAL_STORAGE_FETCH_REQUEST:
          return from(storage.getItem(storageKey)).pipe(
            map((item) => (item != null ? JSON.parse(item) : {})),
            map(actions.localStorageFetchSuccess),
            catchError((error) => of(actions.localStorageFetchFailure(error))),
          );
        case actions.LOCAL_STORAGE_UPDATE_REQUEST:
          return from(storage.setItem(storageKey, JSON.stringify(action.payload))).pipe(
            map(actions.localStorageUpdateSuccess),
            catchError((error) => of(actions.localStorageUpdateFailure(error))),
          );
        case actions.PURGE:
          return from(storage.removeItem(storageKey)).pipe(
            map(actions.localStoragePurgeSuccess),
            catchError((error) => of(actions.localStoragePurgeFailure(error))),
          );
      }
    }),
  );

// orchestrates access to remote storage
const remoteStorageEpic = (
  getCommonHeaders: HeadersSelector,
  getAccessToken: AccessTokenSelector,
  getBaseUrl: UrlResolver,
  handleAjaxError: AjaxErrorHandler,
): PersistEpic => (action$, state$, { ajax }) =>
  action$.pipe(
    filter(isOfType(actions.REMOTE_STORAGE_FETCH_REQUEST)),
    map((props) => ({
      ...props,
      accessToken: getAccessToken(state$.value),
    })),
    // if request is still ongoing, use its result
    exhaustMap(({ accessToken }) =>
      accessToken == null
        ? of(actions.remoteStorageFetchFailure({ message: 'No access token' }))
        : ajax({
            url: getBaseUrl(accessToken).concat('/settings'),
            headers: {
              ...getCommonHeaders(),
              Authorization: `Bearer ${accessToken}`,
            },
          }).pipe(
            pluck('response'),
            map(actions.remoteStorageFetchSuccess),
            catchError(handleAjaxError(action$, actions.remoteStorageFetchFailure)),
          ),
    ),
  );

const DEFAULT_PERSIST_DEBOUNCE_TIME = 5000;

const rootEpic = (config: RemotePersistConfig) => {
  if (!config) throw new Error('config is required for remote persist epic');
  const getCommonHeaders = config.getCommonHeaders ?? (() => ({}));
  const persistDebounceTime = config.persistDebounceTime ?? DEFAULT_PERSIST_DEBOUNCE_TIME;

  return combineEpics(
    createPersistEpic(
      config.persistSelectors,
      getCommonHeaders,
      config.getAccessToken,
      config.getBaseUrl,
      config.getPersistState,
      config.handleAjaxError,
      persistDebounceTime,
    ),
    createRehydrateEpic(config.rehydrateSelectors),
    flushEpic(config.getPersistState),
    localStorageEpic(config.storage, config.localStorageKey),
    remoteStorageEpic(
      getCommonHeaders,
      config.getAccessToken,
      config.getBaseUrl,
      config.handleAjaxError,
    ),
  );
};

export default rootEpic;

// Helpers

// map state into form: { myapp-settings: { themeName: { value: 'light' } }, { ... } }
const normalizeToValueProps = (object: AppStateMap): StoragePayload =>
  Object.entries(object).reduce(
    (acc, [key, val]) => ({
      ...acc,
      [key]: Object.entries(val).reduce(
        (acc2, [key2, val2]) => ({ ...acc2, [key2]: { value: val2 } }),
        {},
      ),
    }),
    {},
  );

/**
 * Deep diff between two object, using lodash
 * @param  {Object} object Object compared
 * @param  {Object} base   Object to compare with
 * @return {Object}        Return a new object who represent the diff
 */
type ObjectState = { [key: string]: any };
function difference(object: ObjectState, base?: ObjectState) {
  if (!base) return object;
  return transform(
    object,
    (result, value, key) => {
      if (!isEqual(value, base[key])) {
        result[key] = isObject(value) && isObject(base[key]) ? difference(value, base[key]) : value;
      }
    },
    {} as ObjectState,
  );
}
