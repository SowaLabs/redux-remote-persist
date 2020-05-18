import { StateObservable, ActionsObservable } from 'redux-observable';
import { TestScheduler } from 'rxjs/testing';
import { of } from 'rxjs';
import { createPersistEpic, createRehydrateEpic } from '../src/epic';
import * as actions from '../src/actions';
import { PersistAction } from '../src/types';

// https://github.com/redux-observable/redux-observable/issues/620#issuecomment-466736942
type HotFunction = typeof TestScheduler.prototype.createHotObservable;

const hotActions = <T extends PersistAction>(
  hot: HotFunction,
  marbles: string,
  values?: { [marble: string]: T },
  error?: any,
) => {
  const actionInput$ = hot<T>(marbles, values, error);
  return new ActionsObservable(actionInput$);
};

const hotState = <T>(
  hot: HotFunction,
  marbles: string,
  initialState: T,
  values?: { [marble: string]: T },
  error?: any,
) => {
  const stateInput$ = hot<T>(marbles, values, error);
  return new StateObservable<T>(stateInput$, initialState);
};

// tests
describe('Test persist epics', () => {
  let scheduler: TestScheduler;

  // instantiate new TestScheduler for each test
  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('should rehydrate state from local storage when remote fails', () => {
    scheduler.run(({ hot, expectObservable }) => {
      const actionValues = {
        a: actions.rehydrate(),
        b: actions.localStorageFetchSuccess({
          'myapp-settings': {
            themeName: { value: 'dark' },
            timeToRequireAuthentication: { value: 900 },
          },
          'myapp-storereview': { isReviewed: { value: false } },
        }),
        c: actions.remoteStorageFetchFailure({}),
      };
      const stateValues = {
        a: {
          settings: {
            timeToRequireAuthentication: 600,
            hasNotAgreedTo247Trading: true,
          },
        },
      };

      const action$ = hotActions(hot, '  -a---b-c', actionValues);
      const state$ = hotState<any>(hot, 'a-', stateValues.a, stateValues);

      const rehydrateSelectors = {
        'myapp-settings': (state: any) => state.settings,
        'myapp-storereview': (state: any) => state.storeReview,
      };
      const output$ = createRehydrateEpic({ rehydrateSelectors })(action$, state$, null as any);

      expectObservable(output$).toBe('   -(ab)--(cde)', {
        a: actions.remoteStorageFetchRequest(),
        b: actions.localStorageFetchRequest(),
        c: actions.rehydrateReducer('myapp-settings', {
          themeName: 'dark',
          timeToRequireAuthentication: 900,
          hasNotAgreedTo247Trading: true,
        }),
        d: actions.rehydrateReducer('myapp-storereview', {
          isReviewed: false,
        }),
        e: actions.persist({
          // values from remoteStorageFetchSuccess action → empty
        }),
      });
    });
  });

  it('should rehydrate state', () => {
    scheduler.run(({ hot, expectObservable }) => {
      const actionValues = {
        a: actions.rehydrate(),
        b: actions.localStorageFetchSuccess({
          'myapp-settings': {
            themeName: { value: 'dark' },
            timeToRequireAuthentication: { value: 900 },
          },
          'myapp-storereview': { isReviewed: { value: false } },
        }),
        c: actions.remoteStorageFetchSuccess({
          'myapp-settings': {
            themeName: { value: 'light' },
            hasNotAgreedTo247Trading: { value: false },
          },
        }),
      };
      const stateValues = {
        a: {
          settings: {
            timeToRequireAuthentication: 600,
            hasNotAgreedTo247Trading: true,
          },
        },
      };

      const action$ = hotActions(hot, '  -a---b-c', actionValues);
      const state$ = hotState<any>(hot, 'a-', stateValues.a, stateValues);

      const rehydrateSelectors = {
        'myapp-settings': (state: any) => state.settings,
        'myapp-storereview': (state: any) => state.storeReview,
      };
      const output$ = createRehydrateEpic({ rehydrateSelectors })(action$, state$, null as any);

      expectObservable(output$).toBe('   -(ab)--(cde)', {
        a: actions.remoteStorageFetchRequest(),
        b: actions.localStorageFetchRequest(),
        c: actions.rehydrateReducer('myapp-settings', {
          themeName: 'light',
          timeToRequireAuthentication: 900,
          hasNotAgreedTo247Trading: false,
        }),
        d: actions.rehydrateReducer('myapp-storereview', {
          isReviewed: false,
        }),
        e: actions.persist({
          // values from remoteStorageFetchSuccess action
          'myapp-settings': {
            themeName: 'light',
            hasNotAgreedTo247Trading: false,
          },
        }),
      });
    });
  });

  it('should persist state', () => {
    scheduler.run(({ hot, cold, expectObservable }) => {
      const actionValues = {
        // start persisting with remote state (remote storage) as initial value
        a: actions.persist({ 'myapp-settings': { themeName: 'light' } }),
        b: actions.localStorageUpdateSuccess(),
        c: actions.flush(),
        d: actions.localStorageUpdateSuccess(),
      };
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
      };

      const action$ = hotActions(hot, '  -a------b-------cd', actionValues);
      const state$ = hotState<any>(hot, 'a-------------b---', stateValues.a, stateValues);
      const remoteStorageUpdateAjax = () => () =>
        // important to emit and complete in the same frame, since we rely on
        // stream completion in epic to dispatch stateUpdateSuccess
        cold('----(a|)', {
          a: { response: {} },
        });

      const persistSelectors = {
        'myapp-settings': (state: any) => state.settings,
        'myapp-storereview': (state: any) => state.storeReview,
      };
      const getPersistState = (state: any) => state.persist;
      const handleAjaxError = () => (error: any) => of(actions.remoteStorageUpdateFailure(error));

      // inject debounce time of 4ms
      const output$ = createPersistEpic({
        remoteStorageUpdateAjax: remoteStorageUpdateAjax as any,
        persistSelectors,
        getPersistState,
        handleAjaxError,
        persistDebounceTime: 4,
      })(action$, state$, {} as any);

      // at frame 16, the flush action was dispatched
      expectObservable(output$).toBe('        -a---(bc)(de)-f-(gh)(ij)', {
        // first persist
        a: actions.stateUpdateQueued(),
        b: actions.stateUpdateRequest(),
        c: actions.localStorageUpdateRequest({
          'myapp-settings': {
            themeName: { value: 'light' },
            timeToRequireAuthentication: { value: 900 },
          },
          'myapp-storereview': {
            isReviewed: { value: false },
          },
        }),

        d: actions.remoteStorageUpdateSuccess(
          {},
          {
            'myapp-settings': {
              timeToRequireAuthentication: { value: 900 },
            },
            'myapp-storereview': {
              isReviewed: { value: false },
            },
          },
        ),
        e: actions.stateUpdateSuccess(),

        // second persist
        f: actions.stateUpdateQueued(),
        g: actions.stateUpdateRequest(),
        h: actions.localStorageUpdateRequest({
          'myapp-settings': {
            themeName: { value: 'dark' },
            timeToRequireAuthentication: { value: 900 },
          },
          'myapp-storereview': {
            isReviewed: { value: false },
          },
        }),
        i: actions.remoteStorageUpdateSuccess(
          {},
          {
            'myapp-settings': {
              themeName: { value: 'dark' },
            },
          },
        ),
        j: actions.stateUpdateSuccess(),
      });
    });
  });

  it('remote updates should diff with last successful persisted state ', () => {
    scheduler.run(({ hot, cold, expectObservable }) => {
      const actionValues = {
        // start persisting with remote state (remote storage) as initial value
        a: actions.persist({ 'myapp-settings': { themeName: 'light' } }),
        b: actions.localStorageUpdateSuccess(),
        c: actions.flush(),
        d: actions.localStorageUpdateSuccess(),
      };
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
      };

      const action$ = hotActions(hot, '  -a----b---------cd', actionValues);
      const state$ = hotState<any>(hot, 'a-------------b---', stateValues.a, stateValues);
      const mockAjax = jest
        .fn()
        .mockReturnValueOnce(cold('----#'))
        .mockReturnValueOnce(
          cold('----(a|)', {
            a: { response: {} },
          }),
        );
      const remoteStorageUpdateAjax = () => mockAjax;

      const persistSelectors = {
        'myapp-settings': (state: any) => state.settings,
        'myapp-storereview': (state: any) => state.storeReview,
      };
      const getPersistState = (state: any) => state.persist;
      const handleAjaxError = () => () =>
        of(actions.remoteStorageUpdateFailure({ message: 'error' }));
      // inject debounce time of 4ms
      const output$ = createPersistEpic({
        remoteStorageUpdateAjax: remoteStorageUpdateAjax as any,
        persistSelectors,
        getPersistState,
        handleAjaxError,
        persistDebounceTime: 4,
      })(action$, state$, {} as any);

      // at frame 11 (c), the flush action was dispatched
      expectObservable(output$).toBe('   -a---(bc)(de)-f-(gh)(ij)', {
        // first persist
        a: actions.stateUpdateQueued(),
        b: actions.stateUpdateRequest(),
        c: actions.localStorageUpdateRequest({
          'myapp-settings': {
            themeName: { value: 'light' },
            timeToRequireAuthentication: { value: 900 },
          },
          'myapp-storereview': {
            isReviewed: { value: false },
          },
        }),
        d: actions.remoteStorageUpdateFailure({ message: 'error' }),
        e: actions.stateUpdateSuccess(),

        // second persist
        f: actions.stateUpdateQueued(),
        g: actions.stateUpdateRequest(),
        h: actions.localStorageUpdateRequest({
          'myapp-settings': {
            themeName: { value: 'dark' },
            timeToRequireAuthentication: { value: 900 },
          },
          'myapp-storereview': {
            isReviewed: { value: false },
          },
        }),
        // since previous remote persist failed, diff was based on initialState
        i: actions.remoteStorageUpdateSuccess(
          {},
          {
            'myapp-settings': {
              themeName: { value: 'dark' },
              timeToRequireAuthentication: { value: 900 },
            },
            'myapp-storereview': {
              isReviewed: { value: false },
            },
          },
        ),
        j: actions.stateUpdateSuccess(),
      });
    });
  });
});
