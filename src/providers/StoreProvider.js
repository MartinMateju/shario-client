"use client";

import { useState } from "react";
import { Provider, useSelector } from "react-redux";

import { useTokenRefresh } from "../hooks/useTokenRefresh";
import { makeStore, selectIsPersistedStateRehydrated } from "../lib/store";

function TokenRefresh() {
  useTokenRefresh();
  return null;
}

/*
 * Session restore keeps its original order: it starts only after the
 * persisted slices have been rehydrated.
 */
function SessionRestore() {
  const rehydrated = useSelector(selectIsPersistedStateRehydrated);

  return rehydrated ? <TokenRefresh /> : null;
}

/*
 * The tree renders on the server and hydrates immediately. Gating it on
 * redux-persist (PersistGate) left the server HTML empty until the client
 * bundle had loaded and rehydrated.
 */
function StoreProvider({ children, legacyLanguage = "EN" }) {
  const [{ store, serverState }] = useState(() =>
    makeStore({ legacyLanguage }),
  );

  return (
    <Provider store={store} serverState={serverState}>
      {children}
      <SessionRestore />
    </Provider>
  );
}

export default StoreProvider;
