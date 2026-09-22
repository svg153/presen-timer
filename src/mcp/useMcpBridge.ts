import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  acquireBridge,
  bridgeUrl,
  getBridgeSnapshot,
  publishBridgeState,
  reconnectBridge,
  releaseBridge,
  setTimerSource,
  subscribeToBridge
} from './bridgeConnection';
import type { McpBridge } from './bridgeConnection';
import { buildSnapshot } from './commands';
import type { TimerActions, TimerLiveState } from './commands';

export type { BridgeStatus, McpBridge } from './bridgeConnection';
export { MIXED_CONTENT_REASON, resolveBridgeUrl } from './bridgeConnection';

/**
 * Subscribes to the tab-wide bridge connection and points it at this timer, so the
 * agent's commands drive the real `useTimer` callbacks.
 */
export function useMcpBridge(timer: TimerLiveState & TimerActions): McpBridge {
  const snapshot = useSyncExternalStore(subscribeToBridge, getBridgeSnapshot, getBridgeSnapshot);

  const timerRef = useRef(timer);
  timerRef.current = timer;

  useEffect(() => {
    acquireBridge();
    return releaseBridge;
  }, []);

  useEffect(() => {
    setTimerSource(() => timerRef.current);
    return () => setTimerSource(null);
  }, []);

  const serialized = JSON.stringify(buildSnapshot(timer));
  useEffect(() => {
    publishBridgeState();
  }, [serialized]);

  const reconnect = useCallback(() => reconnectBridge(), []);

  return {
    status: snapshot.status,
    sessionId: snapshot.sessionId,
    lastError: snapshot.lastError,
    url: bridgeUrl(),
    reconnect
  };
}
