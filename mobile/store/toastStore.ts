import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  durationMs?: number;
}

interface ToastState {
  isVisible: boolean;
  message: string;
  type: ToastType;
  durationMs: number;
  token: number;
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  isVisible: false,
  message: '',
  type: 'info',
  durationMs: 2200,
  token: 0,
  showToast: ({ message, type = 'info', durationMs = 2200 }) =>
    set((state) => ({
      isVisible: true,
      message,
      type,
      durationMs,
      token: state.token + 1,
    })),
  hideToast: () => set({ isVisible: false }),
}));
