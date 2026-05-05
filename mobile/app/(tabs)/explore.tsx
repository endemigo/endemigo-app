import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../../styles/tabs/explore.styles';

export default function ExploreScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t('tabs.explore')}</Text>
    </View>
  );
}
