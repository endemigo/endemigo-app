import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdminAuditAction,
  AdminRole,
  AdminSettingKey,
  RC,
} from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { AdminSetting } from './entities/admin-setting.entity';

export interface UpdateAdminSettingInput {
  actorAdminId: string;
  actorRoles: AdminRole[];
  key: AdminSettingKey;
  value: Record<string, unknown>;
  reason: string;
}

const MANAGED_SETTING_KEYS = [
  AdminSettingKey.COMMISSION_DEFAULT_RATE,
  AdminSettingKey.ESCROW_AUTO_CONFIRM_HOURS,
  AdminSettingKey.CARGO_MOCK_ENABLED,
  AdminSettingKey.NOTIFICATION_TEMPLATE_OVERRIDES,
  AdminSettingKey.AD_SPONSORED_DENSITY,
  AdminSettingKey.TRUST_GRACE_DAYS,
] as const satisfies readonly AdminSettingKey[];
type ManagedAdminSettingKey = (typeof MANAGED_SETTING_KEYS)[number];
const MANAGED_SETTING_KEY_SET = new Set<AdminSettingKey>(MANAGED_SETTING_KEYS);

@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectRepository(AdminSetting)
    private readonly settingRepo: Repository<AdminSetting>,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async list() {
    const items = await this.settingRepo.find({
      order: { key: 'ASC' },
    });
    const filtered = items.filter((item) => MANAGED_SETTING_KEY_SET.has(item.key));

    return {
      code: RC.SUCCESS,
      message: 'Admin ayarları getirildi',
      items: await this.withDefaults(filtered),
    };
  }

  async update(input: UpdateAdminSettingInput) {
    this.assertCanUpdate(input.key, input.actorRoles);

    const existing = await this.settingRepo.findOne({
      where: { key: input.key },
    });
    const before = existing
      ? {
          value: existing.value,
          description: existing.description,
          isSensitive: existing.isSensitive,
        }
      : null;

    const setting =
      existing ??
      this.settingRepo.create({
        key: input.key,
        description: this.getDefaultDescription(input.key),
        isSensitive: input.key === AdminSettingKey.COMMISSION_DEFAULT_RATE,
      });

    setting.value = input.value;
    const saved = await this.settingRepo.save(setting);

    await this.adminAuditService.recordAction({
      actorAdminId: input.actorAdminId,
      actorRoles: input.actorRoles,
      action: AdminAuditAction.SETTING_UPDATED,
      targetType: 'SETTING',
      targetId: input.key,
      reason: input.reason,
      before: before ?? {},
      after: {
        value: saved.value,
        description: saved.description,
        isSensitive: saved.isSensitive,
      },
    });

    return {
      code: RC.ADMIN_SETTING_UPDATED,
      message: 'Admin ayarı güncellendi',
      setting: saved,
    };
  }

  private assertCanUpdate(
    key: AdminSettingKey,
    actorRoles: AdminRole[],
  ): asserts key is ManagedAdminSettingKey {
    if (!MANAGED_SETTING_KEY_SET.has(key)) {
      throw new ForbiddenException({
        code: RC.ADMIN_FORBIDDEN,
        message: 'Bu ayar artik admin settings uzerinden guncellenmiyor',
      });
    }

    if (
      key === AdminSettingKey.COMMISSION_DEFAULT_RATE &&
      !actorRoles.includes(AdminRole.SUPER_ADMIN) &&
      !actorRoles.includes(AdminRole.FINANCE)
    ) {
      throw new ForbiddenException({
        code: RC.ADMIN_FORBIDDEN,
        message: 'Komisyon ayarını sadece finans veya süper admin değiştirebilir',
      });
    }
  }

  private async withDefaults(existing: AdminSetting[]) {
    const byKey = new Map(existing.map((setting) => [setting.key, setting]));
    return MANAGED_SETTING_KEYS.map((key) => {
      const setting = byKey.get(key);
      return (
        setting ??
        this.settingRepo.create({
          key,
          value: this.getDefaultValue(key),
          description: this.getDefaultDescription(key),
          isSensitive: key === AdminSettingKey.COMMISSION_DEFAULT_RATE,
        })
      );
    });
  }

  private getDefaultValue(key: ManagedAdminSettingKey): Record<string, unknown> {
    const defaults: Record<ManagedAdminSettingKey, Record<string, unknown>> = {
      [AdminSettingKey.COMMISSION_DEFAULT_RATE]: { rate: 0.1 },
      [AdminSettingKey.ESCROW_AUTO_CONFIRM_HOURS]: { hours: 72 },
      [AdminSettingKey.CARGO_MOCK_ENABLED]: { enabled: true },
      [AdminSettingKey.NOTIFICATION_TEMPLATE_OVERRIDES]: {},
      [AdminSettingKey.AD_SPONSORED_DENSITY]: { maxSponsoredPerPage: 3 },
      [AdminSettingKey.TRUST_GRACE_DAYS]: { days: 7 },
    };
    return defaults[key];
  }

  private getDefaultDescription(key: ManagedAdminSettingKey): string {
    const descriptions: Record<ManagedAdminSettingKey, string> = {
      [AdminSettingKey.COMMISSION_DEFAULT_RATE]: 'Varsayılan komisyon oranı',
      [AdminSettingKey.ESCROW_AUTO_CONFIRM_HOURS]:
        'Teslimat sonrası otomatik escrow onay süresi',
      [AdminSettingKey.CARGO_MOCK_ENABLED]: 'Mock kargo sağlayıcı anahtarı',
      [AdminSettingKey.NOTIFICATION_TEMPLATE_OVERRIDES]:
        'Bildirim şablonu operasyonel geçersiz kılmaları',
      [AdminSettingKey.AD_SPONSORED_DENSITY]:
        'Sponsorlu içerik yoğunluk ayarı',
      [AdminSettingKey.TRUST_GRACE_DAYS]: 'Trust kısıtlamaları için grace süresi',
    };
    return descriptions[key];
  }
}
