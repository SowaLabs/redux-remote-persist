// @flow
import { StateObservable } from 'redux-observable'
import { TestScheduler } from 'rxjs/testing'
import { of } from 'rxjs'
import { createPersistEpic, createRehydrateEpic } from '../src/epic'
import * as actions from '../src/actions'

describe('Test persist epics', () => {
  let scheduler

  // instantiate new TestScheduler for each test
  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
  })

  it('should rehydrate state from local storage when remote fails', () => {
    scheduler.run(({ hot, cold, expectObservable }) => {
      const actionValues = {
        a: actions.rehydrate(),
        b: actions.localStorageFetchSuccess({
          'bisonapp-settings': {
            themeName: { value: 'dark' },
            timeToRequireAuthentication: { value: 900 },
          },
          'bisonapp-storereview': { isReviewed: { value: false } },
        }),
        c: actions.remoteStorageFetchFailure({}),
      }
      const stateValues = {
        a: {
          settings: {
            timeToRequireAuthentication: 600,
            hasNotAgreedTo247Trading: true,
          },
        },
      }

      const action$ = hot('                   -a---b-c', actionValues)
      const state$ = new StateObservable(hot('a-', stateValues))

      const persistSelectors = {
        'bisonapp-settings': state => state.settings,
        'bisonapp-storereview': state => state.storeReview,
      }
      const output$ = createRehydrateEpic(persistSelectors)(action$, state$)

      expectObservable(output$).toBe('        -(ab)--(cde)', {
        a: actions.remoteStorageFetchRequest(),
        b: actions.localStorageFetchRequest(),
        c: actions.rehydrateReducer('bisonapp-settings', {
          themeName: 'dark',
          timeToRequireAuthentication: 900,
          hasNotAgreedTo247Trading: true,
        }),
        d: actions.rehydrateReducer('bisonapp-storereview', {
          isReviewed: false,
        }),
        e: actions.persist({
          // values from remoteStorageFetchSuccess action → empty
        }),
      })
    })
  })

  it('should rehydrate state', () => {
    scheduler.run(({ hot, cold, expectObservable }) => {
      const actionValues = {
        a: actions.rehydrate(),
        b: actions.localStorageFetchSuccess({
          'bisonapp-settings': {
            themeName: { value: 'dark' },
            timeToRequireAuthentication: { value: 900 },
          },
          'bisonapp-storereview': { isReviewed: { value: false } },
        }),
        c: actions.remoteStorageFetchSuccess({
          'bisonapp-settings': {
            themeName: { value: 'light' },
            hasNotAgreedTo247Trading: { value: false },
          },
        }),
      }
      const stateValues = {
        a: {
          settings: {
            timeToRequireAuthentication: 600,
            hasNotAgreedTo247Trading: true,
          },
        },
      }

      const action$ = hot('                   -a---b-c', actionValues)
      const state$ = new StateObservable(hot('a-', stateValues))

      const persistSelectors = {
        'bisonapp-settings': state => state.settings,
        'bisonapp-storereview': state => state.storeReview,
      }
      const output$ = createRehydrateEpic(persistSelectors)(action$, state$)

      expectObservable(output$).toBe('        -(ab)--(cde)', {
        a: actions.remoteStorageFetchRequest(),
        b: actions.localStorageFetchRequest(),
        c: actions.rehydrateReducer('bisonapp-settings', {
          themeName: 'light',
          timeToRequireAuthentication: 900,
          hasNotAgreedTo247Trading: false,
        }),
        d: actions.rehydrateReducer('bisonapp-storereview', {
          isReviewed: false,
        }),
        e: actions.persist({
          // values from remoteStorageFetchSuccess action
          'bisonapp-settings': {
            themeName: 'light',
            hasNotAgreedTo247Trading: false,
          },
        }),
      })
    })
  })

  it('should persist state', () => {
    scheduler.run(({ hot, cold, expectObservable }) => {
      const actionValues = {
        // start persisting with remote state (remote storage) as initial value
        a: actions.persist({ 'bisonapp-settings': { themeName: 'light' } }),
        b: actions.localStorageUpdateSuccess(),
        c: actions.flush(),
        d: actions.localStorageUpdateSuccess(),
      }
      const stateValues = {
        // first persist
        a: {
          auth: { tokens: { accessToken: 'test' } },
          persist: {
            isFlushing: false,
            isUpdateQueued: false,
            pendingUpdateCount: 0,
          },
          settings: { themeName: 'light', timeToRequireAuthentication: 900 },
          storeReview: { isReviewed: false },
        },
        // second persist
        b: {
          auth: { tokens: { accessToken: 'test' } },
          persist: {
            isFlushing: false,
            isUpdateQueued: false,
            pendingUpdateCount: 0,
          },
          settings: { themeName: 'dark', timeToRequireAuthentication: 900 },
          storeReview: { isReviewed: false },
        },
      }

      const action$ = hot('                   -a------b-------cd', actionValues)
      const state$ = new StateObservable(hot('a-------------b---', stateValues))
      const dependencies = {
        ajax: params =>
          // important to emit and complete in the same frame, since we rely on
          // stream completion in epic to dispatch stateUpdateSuccess
          cold('----(a|)', {
            a: { response: {} },
          }),
      }
      const persistSelectors = {
        'bisonapp-settings': state => state.settings,
        'bisonapp-storereview': state => state.storeReview,
      }
      const getAccessToken = state => state.auth.tokens.accessToken
      const getBaseUrl = () => ''
      const getPersistState = state => state.persist
      const handleAjaxError = () => (error, source) =>
        of(actions.remoteStorageUpdateFailure(error))

      // inject debounce time of 4ms
      const output$ = createPersistEpic(
        persistSelectors,
        {},
        getAccessToken,
        getBaseUrl,
        getPersistState,
        handleAjaxError,
        4
      )(action$, state$, dependencies)

      // at frame 16, the flush action was dispatched
      expectObservable(output$).toBe('        -a---(bc)(de)-f-(gh)(ij)', {
        // first persist
        a: actions.stateUpdateQueued(),
        b: actions.stateUpdateRequest(),
        c: actions.localStorageUpdateRequest({
          'bisonapp-settings': {
            themeName: { value: 'light' },
            timeToRequireAuthentication: { value: 900 },
          },
          'bisonapp-storereview': {
            isReviewed: { value: false },
          },
        }),

        d: actions.remoteStorageUpdateSuccess(
          {},
          {
            'bisonapp-settings': {
              timeToRequireAuthentication: { value: 900 },
            },
            'bisonapp-storereview': {
              isReviewed: { value: false },
            },
          }
        ),
        e: actions.stateUpdateSuccess(),

        // second persist
        f: actions.stateUpdateQueued(),
        g: actions.stateUpdateRequest(),
        h: actions.localStorageUpdateRequest({
          'bisonapp-settings': {
            themeName: { value: 'dark' },
            timeToRequireAuthentication: { value: 900 },
          },
          'bisonapp-storereview': {
            isReviewed: { value: false },
          },
        }),
        i: actions.remoteStorageUpdateSuccess(
          {},
          {
            'bisonapp-settings': {
              themeName: { value: 'dark' },
            },
          }
        ),
        j: actions.stateUpdateSuccess(),
      })
    })
  })

  it('remote updates should diff with last successful persisted state ', () => {
    scheduler.run(({ hot, cold, expectObservable }) => {
      const actionValues = {
        // start persisting with remote state (remote storage) as initial value
        a: actions.persist({ 'bisonapp-settings': { themeName: 'light' } }),
        b: actions.localStorageUpdateSuccess(),
        c: actions.flush(),
        d: actions.localStorageUpdateSuccess(),
      }
      const stateValues = {
        // first persist
        a: {
          auth: { tokens: { accessToken: 'test' } },
          persist: {
            isFlushing: false,
            isUpdateQueued: false,
            pendingUpdateCount: 0,
          },
          settings: { themeName: 'light', timeToRequireAuthentication: 900 },
          storeReview: { isReviewed: false },
        },
        // second persist
        b: {
          auth: { tokens: { accessToken: 'test' } },
          persist: {
            isFlushing: false,
            isUpdateQueued: false,
            pendingUpdateCount: 0,
          },
          settings: { themeName: 'dark', timeToRequireAuthentication: 900 },
          storeReview: { isReviewed: false },
        },
      }

      const action$ = hot('                   -a----b---------cd', actionValues)
      const state$ = new StateObservable(hot('a-------------b---', stateValues))
      const dependencies = {
        ajax: jest
          .fn()
          .mockReturnValueOnce(cold('----#'))
          .mockReturnValueOnce(
            cold('----(a|)', {
              a: { response: {} },
            })
          ),
      }
      const persistSelectors = {
        'bisonapp-settings': state => state.settings,
        'bisonapp-storereview': state => state.storeReview,
      }
      const getAccessToken = state => state.auth.tokens.accessToken
      const getBaseUrl = () => ''
      const getPersistState = state => state.persist
      const handleAjaxError = () => (error, source) =>
        of(actions.remoteStorageUpdateFailure({ message: 'error' }))
      // inject debounce time of 4ms
      const output$ = createPersistEpic(
        persistSelectors,
        {},
        getAccessToken,
        getBaseUrl,
        getPersistState,
        handleAjaxError,
        4
      )(action$, state$, dependencies)

      // at frame 11 (c), the flush action was dispatched
      expectObservable(output$).toBe('        -a---(bc)(de)-f-(gh)(ij)', {
        // first persist
        a: actions.stateUpdateQueued(),
        b: actions.stateUpdateRequest(),
        c: actions.localStorageUpdateRequest({
          'bisonapp-settings': {
            themeName: { value: 'light' },
            timeToRequireAuthentication: { value: 900 },
          },
          'bisonapp-storereview': {
            isReviewed: { value: false },
          },
        }),
        d: actions.remoteStorageUpdateFailure({ message: 'error' }),
        e: actions.stateUpdateSuccess(),

        // second persist
        f: actions.stateUpdateQueued(),
        g: actions.stateUpdateRequest(),
        h: actions.localStorageUpdateRequest({
          'bisonapp-settings': {
            themeName: { value: 'dark' },
            timeToRequireAuthentication: { value: 900 },
          },
          'bisonapp-storereview': {
            isReviewed: { value: false },
          },
        }),
        // since previous remote persist failed, diff was based on initialState
        i: actions.remoteStorageUpdateSuccess(
          {},
          {
            'bisonapp-settings': {
              themeName: { value: 'dark' },
              timeToRequireAuthentication: { value: 900 },
            },
            'bisonapp-storereview': {
              isReviewed: { value: false },
            },
          }
        ),
        j: actions.stateUpdateSuccess(),
      })
    })
  })
})
