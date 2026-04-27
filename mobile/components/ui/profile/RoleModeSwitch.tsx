import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RoleMode } from '../../../types/transactionFlows';
import { useRoleModeStore } from '../../../store/roleModeStore';
import { styles } from './RoleModeSwitch.styles';

interface RoleModeSwitchProps {
  isSeller: boolean;
}

const MODES: RoleMode[] = ['buyer', 'seller'];

export function RoleModeSwitch({ isSeller }: RoleModeSwitchProps) {
  const { t } = useTranslation();
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const setRoleMode = useRoleModeStore((state) => state.setRoleMode);

  return (
    <View style={styles.container}>
      {MODES.map((mode) => {
        const isActive = activeMode === mode;
        const isDisabled = mode === 'seller' && !isSeller;
        return (
          <TouchableOpacity
            key={mode}
            style={[
              styles.segment,
              isActive && styles.segmentActive,
              isDisabled && styles.segmentDisabled,
            ]}
            onPress={() => setRoleMode(mode, { isSeller })}
            activeOpacity={0.8}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel={t(`roleMode.${mode}`)}
            accessibilityHint={
              mode === 'seller'
                ? t('roleMode.sellerDescription')
                : t('roleMode.buyerDescription')
            }
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {t(`roleMode.${mode}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
