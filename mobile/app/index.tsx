import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/theme';
import { styles } from './index.styles';

export default function Index() {
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Uygulama her zaman ana sayfayla açılır — login gerektiğinde kullanıcı profil üzerinden yönlendirilir
  return <Redirect href="/(tabs)" />;
}
