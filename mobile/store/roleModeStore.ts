import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { RoleMode } from '../types/transactionFlows';
import type { User } from './authStore';

const ROLE_MODE_STORAGE_KEY = 'endemigo_role_mode';

const roleModeStorage: StateStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

const isSellerUser = (user?: Pick<User, 'isSeller'> | null) => Boolean(user?.isSeller);

interface RoleModeState {
  activeMode: RoleMode;
  setRoleMode: (mode: RoleMode, user?: Pick<User, 'isSeller'> | null) => void;
  syncRoleModeFromUser: (user?: Pick<User, 'isSeller'> | null) => void;
  resetRoleMode: () => void;
}

export const useRoleModeStore = create<RoleModeState>()(
  persist(
    (set, get) => ({
      activeMode: 'buyer',
      setRoleMode: (mode, user) => {
        set({
          activeMode:
            mode === 'seller' && user !== undefined && !isSellerUser(user) ? 'buyer' : mode,
        });
      },
      syncRoleModeFromUser: (user) => {
        if (!isSellerUser(user) && get().activeMode === 'seller') {
          set({ activeMode: 'buyer' });
        }
      },
      resetRoleMode: () => {
        set({ activeMode: 'buyer' });
      },
    }),
    {
      name: ROLE_MODE_STORAGE_KEY,
      storage: createJSONStorage(() => roleModeStorage),
      partialize: (state) => ({ activeMode: state.activeMode }),
    },
  ),
);
