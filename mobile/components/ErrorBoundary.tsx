import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18next from 'i18next';
import { Colors } from '../constants/theme';
import { styles } from './ErrorBoundary.styles';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * GLOBAL ERROR BOUNDARY (Hata Sınırı Yönetimi)
 * Mimari Tercihi: React Native uygulamalarında (özellikle production'da) rastgele çıkan 
 * 'undefined is not an object' gibi JS hataları uygulamanın "Crash" olup beyaz ekran (veya sistem dışı) 
 * tepkisi vermesine sebep olur. ErrorBoundary, hatalı UI bileşenlerini izole ederek (Sandboxing) 
 * sadece o kısmın çökmesine ve kullanıcıya "Tekrar Dene" butonu sunulmasına olanak tanır.
 * 
 * Gelecek Plan: 'componentDidCatch' fazı Sentry / Crashlytics ile entegre edilecektir.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // TODO: Send to Sentry in Phase 12
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Ionicons name="warning-outline" size={64} color={Colors.error} />
          <Text style={styles.title}>{i18next.t('common.error')}</Text>
          <Text style={styles.message}>
            {i18next.t('common.errorOccurredMessage')}
          </Text>
          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorText}>
                {this.state.error.toString()}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={this.handleRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>{i18next.t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
