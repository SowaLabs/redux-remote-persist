import { ActionsObservable, Epic, StateObservable } from 'redux-observable';
import { Observable } from 'rxjs';
import { ajax, AjaxError, AjaxResponse } from 'rxjs/ajax';
import * as actions from './actions';
import { ActionType } from 'safetypings';

// redux
export type PersistState = {
  isUpdateQueued: boolean;
  isFlushing: boolean;
  pendingUpdateCount: number;
};
export type PersistAction = ActionType<typeof actions>;
export type Services = { ajax: typeof ajax };
export type PersistEpic = Epic<PersistAction, PersistAction, PersistState, Services>;

// storage redux
export type BasicValueType = number | boolean | string;
export type ValueType = BasicValueType | Array<BasicValueType>;
export type ValueObjectType = { value: ValueType };

export type StateType<T> = { [prop: string]: T };
export type StateMapType<T> = { [key: string]: StateType<T> };

// types used
export type StoragePayload = StateMapType<ValueObjectType>;
export type AppState = StateType<ValueType>;
export type AppStateMap = StateMapType<ValueType>;

// config
export type PersistStateSelector = (state: any) => PersistState;
export type AccessTokenSelector = (state: any) => string | undefined | null;
export type StateSelector = (state: any) => AppState;
export type KeyStateSelectors = {
  [key: string]: StateSelector;
};
export type AjaxErrorHandler = (
  action$: ActionsObservable<any>,
  errorAction: (error: any) => any,
) => (error: AjaxError, source: Observable<any>) => Observable<any>;
export type HeadersSelector = () => {
  [key: string]: string;
};
export type UrlResolver = (arg?: any) => string;
export type PreAuthAjaxRequestConfig = {
  ajax: typeof ajax;
  baseUrl: string;
  clientId: string;
  nonce: string;
  commonHeaders: {};
};

export interface Storage {
  getItem(key: string, callback?: (error?: Error, result?: string) => void): Promise<string | null>;
  setItem(key: string, value: string, callback?: (error?: Error) => void): Promise<void>;
  removeItem(key: string, callback?: (error?: Error) => void): Promise<void>;
}

type RemoteStorageAjax = (
  action$: ActionsObservable<PersistAction>,
  state$: StateObservable<any>,
  dependencies: Services,
) => Observable<AjaxResponse>;

export type RemotePersistConfig = {
  getPersistState: PersistStateSelector;
  remoteStorageFetchAjax: RemoteStorageAjax;
  remoteStorageUpdateAjax: (body: {}) => RemoteStorageAjax;
  handleAjaxError: AjaxErrorHandler;
  localStorageKey: string;
  persistDebounceTime?: number;
  persistSelectors: KeyStateSelectors;
  rehydrateSelectors: KeyStateSelectors;
  storage: Storage;
};
