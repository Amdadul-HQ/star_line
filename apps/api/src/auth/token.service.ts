import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES, type AuthTokens } from '@starline/shared';
import { createHash, randomBytes } from 'crypto';
import { AppError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

interface TokenMeta {
  userAgent?: string;
  ip?: string;
}

/**
 * Access tokens: short-lived JWTs. Refresh tokens: opaque random values
 * stored hashed, rotated on every refresh; reuse of a rotated token revokes
 * the whole session family.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private get accessTtlSeconds(): number {
    return this.config.get<number>('JWT_ACCESS_TTL_SECONDS') ?? 900;
  }

  async issueTokens(user: { id: string; role: string; name: string }, meta: TokenMeta = {}): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, name: user.name },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.accessTtlSeconds,
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const refreshDays = this.config.get<number>('JWT_REFRESH_TTL_DAYS') ?? 7;
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
        userAgent: meta.userAgent?.slice(0, 250),
        ip: meta.ip?.slice(0, 60),
      },
    });

    return { accessToken, refreshToken, expiresIn: this.accessTtlSeconds };
  }

  /** Validates + rotates a refresh token. Returns the owning user id. */
  async rotate(refreshToken: string, meta: TokenMeta = {}): Promise<{ userId: string; tokens: AuthTokens }> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(refreshToken) },
      include: { user: { include: { role: true } } },
    });
    if (!record) {
      throw AppError.unauthorized('Unknown refresh token');
    }
    if (record.revokedAt) {
      // Reuse of a rotated token — treat as theft, revoke every session.
      await this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AppError(ERROR_CODES.SESSION_REVOKED, 'Session revoked', HttpStatus.UNAUTHORIZED);
    }
    if (record.expiresAt < new Date()) {
      throw new AppError(ERROR_CODES.TOKEN_EXPIRED, 'Refresh token expired', HttpStatus.UNAUTHORIZED);
    }
    if (record.user.status !== 'ACTIVE') {
      throw AppError.unauthorized('Account is not active', ERROR_CODES.ACCOUNT_INACTIVE);
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await this.issueTokens(
      { id: record.user.id, role: record.user.role.name, name: record.user.name },
      meta,
    );
    return { userId: record.userId, tokens };
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
