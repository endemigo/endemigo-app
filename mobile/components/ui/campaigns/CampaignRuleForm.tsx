import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CampaignDiscountType,
  CampaignScopeType,
} from '@endemigo/shared';
import { Colors } from '../../../constants/theme';
import { styles } from './CampaignRuleForm.styles';

export interface CampaignRuleFormThresholds {
  minAmount?: number;
  minQuantity?: number;
  maxUses?: number;
  perUserLimit?: number;
}

export interface CampaignRuleFormValidity {
  startsAt: string;
  endsAt: string;
}

export interface CampaignRuleFormValues {
  title: string;
  code?: string;
  scope: CampaignScopeType;
  scopeId: string;
  discountType: CampaignDiscountType;
  discountValue: number;
  thresholds: CampaignRuleFormThresholds;
  validity: CampaignRuleFormValidity;
}

interface CampaignRuleFormProps {
  mode: 'campaign' | 'coupon';
  scope: CampaignScopeType;
  discountType: CampaignDiscountType;
  thresholds: CampaignRuleFormThresholds;
  validity: CampaignRuleFormValidity;
  isSubmitting?: boolean;
  onSubmit: (values: CampaignRuleFormValues) => void;
}

const dateOnly = (value: string) => value.slice(0, 10);

function numericValue(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumericValue(value: string) {
  if (!value.trim()) return undefined;
  return numericValue(value);
}

export function CampaignRuleForm({
  mode,
  scope,
  discountType,
  thresholds,
  validity,
  isSubmitting = false,
  onSubmit,
}: CampaignRuleFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [selectedScope, setSelectedScope] = useState(scope);
  const [scopeId, setScopeId] = useState('');
  const [selectedDiscountType, setSelectedDiscountType] = useState(discountType);
  const [discountValue, setDiscountValue] = useState('');
  const [minAmount, setMinAmount] = useState(
    thresholds.minAmount ? String(thresholds.minAmount) : '',
  );
  const [maxUses, setMaxUses] = useState(
    thresholds.maxUses ? String(thresholds.maxUses) : '',
  );
  const [perUserLimit, setPerUserLimit] = useState(
    thresholds.perUserLimit ? String(thresholds.perUserLimit) : '1',
  );
  const [startsAt, setStartsAt] = useState(dateOnly(validity.startsAt));
  const [endsAt, setEndsAt] = useState(dateOnly(validity.endsAt));

  const titleKey =
    mode === 'campaign' ? 'sellerCampaigns.form.campaignTitle' : 'sellerCampaigns.form.couponTitle';

  const submit = () => {
    onSubmit({
      title,
      code: code.trim().toUpperCase(),
      scope: selectedScope,
      scopeId: scopeId.trim(),
      discountType: selectedDiscountType,
      discountValue: numericValue(discountValue),
      thresholds: {
        minAmount: optionalNumericValue(minAmount),
        maxUses: optionalNumericValue(maxUses),
        perUserLimit: optionalNumericValue(perUserLimit),
      },
      validity: {
        startsAt: `${startsAt}T00:00:00.000Z`,
        endsAt: `${endsAt}T23:59:59.000Z`,
      },
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t(titleKey)}</Text>
      <Text style={styles.description}>{t('sellerCampaigns.form.description')}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>
          {mode === 'campaign'
            ? t('sellerCampaigns.form.name')
            : t('sellerCampaigns.form.code')}
        </Text>
        <TextInput
          style={styles.input}
          value={mode === 'campaign' ? title : code}
          onChangeText={mode === 'campaign' ? setTitle : setCode}
          autoCapitalize="characters"
          placeholder={
            mode === 'campaign'
              ? t('sellerCampaigns.form.namePlaceholder')
              : t('sellerCampaigns.form.codePlaceholder')
          }
          placeholderTextColor={Colors.slate400}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('sellerCampaigns.form.scope')}</Text>
        <View style={styles.segmentedRow}>
          {[CampaignScopeType.PRODUCT, CampaignScopeType.CATEGORY].map((item) => {
            const active = selectedScope === item;
            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.segmentedButton,
                  active && styles.segmentedButtonActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedScope(item)}
              >
                <Text
                  style={[
                    styles.segmentedText,
                    active && styles.segmentedTextActive,
                  ]}
                >
                  {t(`sellerCampaigns.scopes.${item}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('sellerCampaigns.form.scopeId')}</Text>
        <TextInput
          style={styles.input}
          value={scopeId}
          onChangeText={setScopeId}
          autoCapitalize="none"
          placeholder={t('sellerCampaigns.form.scopeIdPlaceholder')}
          placeholderTextColor={Colors.slate400}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('sellerCampaigns.form.discountType')}</Text>
        <View style={styles.segmentedRow}>
          {[CampaignDiscountType.FIXED_AMOUNT, CampaignDiscountType.PERCENTAGE].map((item) => {
            const active = selectedDiscountType === item;
            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.segmentedButton,
                  active && styles.segmentedButtonActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedDiscountType(item)}
              >
                <Text
                  style={[
                    styles.segmentedText,
                    active && styles.segmentedTextActive,
                  ]}
                >
                  {t(`sellerCampaigns.discountTypes.${item}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.twoColumn}>
        <View style={styles.halfField}>
          <Text style={styles.label}>{t('sellerCampaigns.form.discountValue')}</Text>
          <TextInput
            style={styles.input}
            value={discountValue}
            onChangeText={setDiscountValue}
            keyboardType="decimal-pad"
            placeholder={t('sellerCampaigns.form.discountValuePlaceholder')}
            placeholderTextColor={Colors.slate400}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>{t('sellerCampaigns.form.minAmount')}</Text>
          <TextInput
            style={styles.input}
            value={minAmount}
            onChangeText={setMinAmount}
            keyboardType="decimal-pad"
            placeholder={t('sellerCampaigns.form.optionalAmount')}
            placeholderTextColor={Colors.slate400}
          />
        </View>
      </View>

      {mode === 'coupon' && (
        <View style={styles.twoColumn}>
          <View style={styles.halfField}>
            <Text style={styles.label}>{t('sellerCampaigns.form.maxUses')}</Text>
            <TextInput
              style={styles.input}
              value={maxUses}
              onChangeText={setMaxUses}
              keyboardType="number-pad"
              placeholder={t('sellerCampaigns.form.optionalAmount')}
              placeholderTextColor={Colors.slate400}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>{t('sellerCampaigns.form.perUserLimit')}</Text>
            <TextInput
              style={styles.input}
              value={perUserLimit}
              onChangeText={setPerUserLimit}
              keyboardType="number-pad"
              placeholder={t('sellerCampaigns.form.perUserLimitPlaceholder')}
              placeholderTextColor={Colors.slate400}
            />
          </View>
        </View>
      )}

      <View style={styles.twoColumn}>
        <View style={styles.halfField}>
          <Text style={styles.label}>{t('sellerCampaigns.form.startsAt')}</Text>
          <TextInput
            style={styles.input}
            value={startsAt}
            onChangeText={setStartsAt}
            placeholder={t('sellerCampaigns.form.datePlaceholder')}
            placeholderTextColor={Colors.slate400}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>{t('sellerCampaigns.form.endsAt')}</Text>
          <TextInput
            style={styles.input}
            value={endsAt}
            onChangeText={setEndsAt}
            placeholder={t('sellerCampaigns.form.datePlaceholder')}
            placeholderTextColor={Colors.slate400}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        activeOpacity={0.8}
        disabled={isSubmitting}
        onPress={submit}
      >
        {isSubmitting ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={styles.submitText}>
            {mode === 'campaign'
              ? t('sellerCampaigns.form.createCampaign')
              : t('sellerCampaigns.form.createCoupon')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
