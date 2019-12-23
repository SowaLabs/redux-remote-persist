// @flow

export type PersistState = {
  isUpdateQueued: boolean,
  isFlushing: boolean,
  pendingUpdateCount: number,
}

export type StateSelector = (state: any) => any
export type KeyStateSelectors = { [key: string]: StateSelector }
export type AjaxErrorHandler = (
  action$: any,
  errorAction: (error: any) => any
) => any
export type HeadersSelector = () => { [key: string]: string }
export type UrlResolver = any => string

export type RemotePersistConfig = {
  getCommonHeaders?: HeadersSelector,
  getAccessToken: StateSelector,
  getBaseUrl: UrlResolver,
  getPersistState: StateSelector,
  handleAjaxError: AjaxErrorHandler,
  localStorageKey: string,
  persistDebounceTime: number,
  persistSelectors: KeyStateSelectors,
  rehydrateSelectors: KeyStateSelectors,
  storage: { [string]: any },
}
