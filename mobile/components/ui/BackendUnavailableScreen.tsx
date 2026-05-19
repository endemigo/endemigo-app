import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { useBackendConnectionStore } from '../../store/backendConnectionStore';
import { styles } from './BackendUnavailableScreen.styles';

export function BackendUnavailableScreen() {
  const { t } = useTranslation();
  const isConnectionIssueVisible = useBackendConnectionStore((state) => state.isConnectionIssueVisible);
  const connectionIssueType = useBackendConnectionStore((state) => state.connectionIssueType);
  const isCheckingBackendConnection = useBackendConnectionStore((state) => state.isCheckingBackendConnection);
  const checkBackendConnection = useBackendConnectionStore((state) => state.checkBackendConnection);

  if (!isConnectionIssueVisible) {
    return null;
  }

  const messageByType = {
    offline: t('connectionIssue.offlineMessage'),
    network: t('connectionIssue.networkMessage'),
    timeout: t('connectionIssue.timeoutMessage'),
    server: t('connectionIssue.serverMessage'),
  };
  const issueMessage = connectionIssueType ? messageByType[connectionIssueType] : t('connectionIssue.networkMessage');

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="cloud-offline-outline" size={30} color={Colors.error} />
        </View>
        <Text style={styles.title}>{t('connectionIssue.title')}</Text>
        <Text style={styles.message}>{issueMessage}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          activeOpacity={0.85}
          onPress={() => {
            void checkBackendConnection();
          }}
          disabled={isCheckingBackendConnection}
        >
          {isCheckingBackendConnection ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.retryText}>{t('connectionIssue.retry')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
