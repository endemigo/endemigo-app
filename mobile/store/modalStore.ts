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

/**
 * MİMARİ KARAR: Neden Native Alert.alert() kullanmayıp bu Store'u ürettik?
 * - Anayasanın 11. Maddesi gereği Native OS UI elemanları (Alert, Prompt) platformlar arası uyuşmazlığa
 *   ve tasarımsal çirkinliğe () UI Drift yol açar.
 * - Bu Global Modal Store sayesinde uygulamanın neresinden 'showModal()' çağrılırsa çağrılsın
 *   kendi temamızda (Colors.primary), istediğimiz ikonla ve fontlarla çıkan bir Pop-up elde ediyoruz.
 */
export const useModalStore = create<ModalState>((set) => ({
  isVisible: false,
  options: defaultOptions,
  showModal: (options) => set({ isVisible: true, options: { ...defaultOptions, ...options } }),
  hideModal: () => set({ isVisible: false }),
}));
