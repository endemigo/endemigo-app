import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/theme';
import type { SubmittedOrderReview } from '../../../types/transactionFlows';
import { styles } from './OrderReviewCard.styles';

interface OrderReviewCardProps {
  canReview: boolean;
  submittedReview: SubmittedOrderReview | null;
  isSubmitting: boolean;
  onSubmit: (payload: {
    productRating: number;
    productComment?: string;
    sellerRating: number;
    sellerComment?: string;
  }) => Promise<unknown>;
}

function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.8}>
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={22}
            color={Colors.primary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function OrderReviewCard({
  canReview,
  submittedReview,
  isSubmitting,
  onSubmit,
}: OrderReviewCardProps) {
  const { t } = useTranslation();
  const [productRating, setProductRating] = useState(5);
  const [sellerRating, setSellerRating] = useState(5);
  const [productComment, setProductComment] = useState('');
  const [sellerComment, setSellerComment] = useState('');

  const submitDisabled = useMemo(
    () => isSubmitting || productRating < 1 || sellerRating < 1,
    [isSubmitting, productRating, sellerRating],
  );

  if (submittedReview) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t('orders.reviewSubmittedTitle')}</Text>
        <View style={styles.reviewBlock}>
          <Text style={styles.sectionTitle}>{t('orders.productReviewLabel')}</Text>
          <Text style={styles.reviewText}>
            {submittedReview.productRating}/5
            {submittedReview.productComment ? ` • ${submittedReview.productComment}` : ''}
          </Text>
        </View>
        <View style={styles.reviewBlock}>
          <Text style={styles.sectionTitle}>{t('orders.sellerReviewLabel')}</Text>
          <Text style={styles.reviewText}>
            {submittedReview.sellerRating}/5
            {submittedReview.sellerComment ? ` • ${submittedReview.sellerComment}` : ''}
          </Text>
        </View>
      </View>
    );
  }

  if (!canReview) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('orders.reviewTitle')}</Text>
      <Text style={styles.sectionTitle}>{t('orders.productReviewLabel')}</Text>
      <RatingInput value={productRating} onChange={setProductRating} />
      <TextInput
        style={styles.input}
        value={productComment}
        onChangeText={setProductComment}
        multiline
        placeholder={t('orders.productReviewPlaceholder')}
        placeholderTextColor={Colors.slate400}
      />
      <Text style={styles.sectionTitle}>{t('orders.sellerReviewLabel')}</Text>
      <RatingInput value={sellerRating} onChange={setSellerRating} />
      <TextInput
        style={styles.input}
        value={sellerComment}
        onChangeText={setSellerComment}
        multiline
        placeholder={t('orders.sellerReviewPlaceholder')}
        placeholderTextColor={Colors.slate400}
      />
      <TouchableOpacity
        style={[styles.button, submitDisabled && styles.buttonDisabled]}
        onPress={() =>
          onSubmit({
            productRating,
            productComment,
            sellerRating,
            sellerComment,
          })
        }
        disabled={submitDisabled}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.buttonText}>{t('orders.submitReview')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
