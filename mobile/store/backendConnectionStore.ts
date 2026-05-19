import { create } from 'zustand';
import ENV from '../lib/config';

export type ConnectionIssueType = 'offline' | 'network' | 'timeout' | 'server';

interface BackendConnectionState {
  isConnectionIssueVisible: boolean;
  connectionIssueType: ConnectionIssueType | null;
  isCheckingBackendConnection: boolean;
  setConnectionIssue: (issueType: ConnectionIssueType) => void;
  clearConnectionIssue: () => void;
  checkBackendConnection: () => Promise<boolean>;
}

const BACKEND_CHECK_TIMEOUT_MS = 5000;

export const useBackendConnectionStore = create<BackendConnectionState>((set) => ({
  isConnectionIssueVisible: false,
  connectionIssueType: null,
  isCheckingBackendConnection: false,
  setConnectionIssue: (issueType) => set({ isConnectionIssueVisible: true, connectionIssueType: issueType }),
  clearConnectionIssue: () => set({ isConnectionIssueVisible: false, connectionIssueType: null }),
  checkBackendConnection: async () => {
    set({ isCheckingBackendConnection: true });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_CHECK_TIMEOUT_MS);

    try {
      const response = await fetch(`${ENV.API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      const isConnected = response.ok;
      set({
        isConnectionIssueVisible: !isConnected,
        connectionIssueType: isConnected ? null : 'server',
        isCheckingBackendConnection: false,
      });
      return isConnected;
    } catch {
      set({
        isConnectionIssueVisible: true,
        connectionIssueType: 'network',
        isCheckingBackendConnection: false,
      });
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  },
}));
