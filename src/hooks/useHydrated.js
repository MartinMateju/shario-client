import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/*
 * False while rendering on the server and during hydration, true for every
 * other client render. Output that depends on it stays identical to the
 * server HTML while hydrating.
 */
export const useHydrated = () =>
  useSyncExternalStore(
    subscribeToNothing,
    getClientSnapshot,
    getServerSnapshot,
  );
