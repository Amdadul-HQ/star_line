import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ERROR_CODES,
  ROLES,
  type AuthUser,
  type LoginResponse,
  type OtpRequestResponse,
  type PermissionCode,
} from '@starline/shared';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'crypto';
import { AppError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { OTP_PROVIDER, type OtpProvider } from './otp/otp-provider';
import { TokenService } from './token.service';

interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly rbac: RbacService,
    private readonly config: ConfigService,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
  ) {}

  private hashOtp(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private async buildAuthUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: true, branch: { select: { name: true } } },
    });
    const permissions = (await this.rbac.getPermissionsForRole(user.role.name)) as PermissionCode[];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role.name,
      permissions,
      branchId: user.branchId,
      branchName: user.branch?.name ?? null,
      preferredLocale: user.preferredLocale,
      status: user.status,
    };
  }

  // ------------------------------------------------------------- staff login

  async staffLogin(email: string, password: string, meta: RequestMeta): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (!user?.passwordHash || user.role.name === ROLES.PASSENGER) {
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password', HttpStatus.UNAUTHORIZED);
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password', HttpStatus.UNAUTHORIZED);
    }
    if (user.status !== 'ACTIVE') {
      throw AppError.unauthorized('Account is not active', ERROR_CODES.ACCOUNT_INACTIVE);
    }
    const tokens = await this.tokens.issueTokens(
      { id: user.id, role: user.role.name, name: user.name },
      meta,
    );
    return { user: await this.buildAuthUser(user.id), tokens };
  }

  // ---------------------------------------------------------- passenger OTP

  async requestOtp(phone: string): Promise<OtpRequestResponse> {
    const resendSeconds = this.config.get<number>('OTP_RESEND_SECONDS') ?? 45;
    const ttlSeconds = this.config.get<number>('OTP_TTL_SECONDS') ?? 300;

    const latest = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (latest) {
      const sinceMs = Date.now() - latest.createdAt.getTime();
      if (sinceMs < resendSeconds * 1000) {
        const wait = Math.ceil((resendSeconds * 1000 - sinceMs) / 1000);
        throw new AppError(
          ERROR_CODES.OTP_RESEND_TOO_SOON,
          `Wait ${wait}s before requesting another code`,
          HttpStatus.TOO_MANY_REQUESTS,
          { retryAfter: wait },
        );
      }
    }

    const sandboxCode = this.config.get<string>('OTP_SANDBOX_CODE');
    const code = sandboxCode ?? String(randomInt(100000, 1000000));

    await this.prisma.otpCode.create({
      data: {
        phone,
        codeHash: this.hashOtp(code),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });
    await this.otpProvider.sendOtp(phone, code);

    const isDev = this.config.get<string>('NODE_ENV') !== 'production';
    return {
      phone,
      expiresIn: ttlSeconds,
      resendAfter: resendSeconds,
      // Convenience for local development only — never exposed in production.
      ...(isDev && sandboxCode ? { devCode: sandboxCode } : {}),
    };
  }

  async verifyOtp(phone: string, otp: string, name: string | undefined, meta: RequestMeta): Promise<LoginResponse> {
    const maxAttempts = this.config.get<number>('OTP_MAX_ATTEMPTS') ?? 5;
    const record = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new AppError(ERROR_CODES.OTP_EXPIRED, 'Code expired — request a new one', HttpStatus.BAD_REQUEST);
    }
    if (record.attempts >= maxAttempts) {
      throw new AppError(
        ERROR_CODES.OTP_TOO_MANY_ATTEMPTS,
        'Too many attempts — request a new code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (record.codeHash !== this.hashOtp(otp)) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppError(ERROR_CODES.INVALID_OTP, 'Incorrect code', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    let user = await this.prisma.user.findUnique({ where: { phone }, include: { role: true } });
    if (!user) {
      const passengerRole = await this.prisma.role.findUniqueOrThrow({
        where: { name: ROLES.PASSENGER },
      });
      user = await this.prisma.user.create({
        data: {
          phone,
          name: name?.trim() || 'Star Line Passenger',
          roleId: passengerRole.id,
          passengerProfile: { create: {} },
        },
        include: { role: true },
      });
      this.logger.log(`New passenger registered: ${phone}`);
    } else if (name?.trim() && user.name === 'Star Line Passenger') {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { name: name.trim() },
        include: { role: true },
      });
    }
    if (user.status !== 'ACTIVE') {
      throw AppError.unauthorized('Account is not active', ERROR_CODES.ACCOUNT_INACTIVE);
    }

    const tokens = await this.tokens.issueTokens(
      { id: user.id, role: user.role.name, name: user.name },
      meta,
    );
    return { user: await this.buildAuthUser(user.id), tokens };
  }

  // -------------------------------------------------------------- sessions

  async refresh(refreshToken: string, meta: RequestMeta): Promise<LoginResponse> {
    const { userId, tokens } = await this.tokens.rotate(refreshToken, meta);
    return { user: await this.buildAuthUser(userId), tokens };
  }

  async logout(refreshToken: string | undefined): Promise<{ ok: true }> {
    if (refreshToken) await this.tokens.revoke(refreshToken);
    return { ok: true };
  }

  async me(userId: string): Promise<AuthUser> {
    return this.buildAuthUser(userId);
  }
}
