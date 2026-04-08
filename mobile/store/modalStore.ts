import { create } from 'zustand';

interface ModalOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalState {
  isVisible: boolean;
  options: ModalOptions;
  showModal: (options: ModalOptions) => void;
  hideModal: () => void;
}

const defaultOptions: ModalOptions = {
  title: '',
  message: '',
  type: 'info',
  confirmText: 'Tamam', // Should be translated at component level
};

export const useModalStore = create<ModalState>((set) => ({
  isVisible: false,
  options: defaultOptions,
  showModal: (options) => set({ isVisible: true, options: { ...defaultOptions, ...options } }),
  hideModal: () => set({ isVisible: false }),
}));
