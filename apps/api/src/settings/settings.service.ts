import { Injectable } from '@nestjs/common';
import type { GeneralSettingsInput } from '@starline/shared';
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

const GENERAL_KEY = 'general';

const DEFAULT_GENERAL: GeneralSettingsInput = {
  companyName: 'Star Line',
  supportPhone: '+8801713000000',
  supportEmail: 'support@starlinegroupbd.com',
  defaultLocale: 'en',
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getGeneral(): Promise<GeneralSettingsInput> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: GENERAL_KEY } });
    return row ? { ...DEFAULT_GENERAL, ...(row.value as object) } : DEFAULT_GENERAL;
  }

  async updateGeneral(input: GeneralSettingsInput, actor: RequestUser): Promise<GeneralSettingsInput> {
    const before = await this.getGeneral();
    await this.prisma.systemSetting.upsert({
      where: { key: GENERAL_KEY },
      create: { key: GENERAL_KEY, value: input, group: 'general' },
      update: { value: input },
    });
    this.audit.log({
      actorId: actor.id,
      action: 'SETTINGS_UPDATED',
      entity: 'SystemSetting',
      entityId: GENERAL_KEY,
      before,
      after: input,
    });
    return input;
  }
}
