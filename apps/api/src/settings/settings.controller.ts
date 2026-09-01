import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { generalSettingsSchema, PERMISSIONS, type GeneralSettingsInput } from '@starline/shared';
import { CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Public: branding/contact info consumed by the public site. */
  @Public()
  @Get('general')
  general() {
    return this.settings.getGeneral();
  }

  @ApiBearerAuth()
  @Put('general')
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  updateGeneral(
    @Body(new ZodValidationPipe(generalSettingsSchema)) body: GeneralSettingsInput,
    @CurrentUser() user: RequestUser,
  ) {
    return this.settings.updateGeneral(body, user);
  }
}
