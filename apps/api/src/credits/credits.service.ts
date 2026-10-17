import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreditTxType, Prisma } from '@prisma/client';
import { loadEnv } from '@marketpix/config';
import type { ProcessingMode } from '@marketpix/shared-types';
import { PrismaService } from '../prisma/prisma.service';

export interface LedgerEntry {
  id: string;
  amount: number;
  type: CreditTxType;
  balanceAfter: number;
  note: string | null;
  jobId: string | null;
  createdAt: Date;
}

@Injectable()
export class PricingService {
  private readonly env = loadEnv();

  /** Narxlar DB'dan olinadi; sozlanmagan bo'lsa .env qiymatlari ishlatiladi. */
  async costFor(mode: ProcessingMode): Promise<number> {
    const rule = await this.prisma.pricingRule.findUnique({ where: { mode } });
    if (rule && rule.active) return rule.cost;
    switch (mode) {
      case 'STANDARD_RESIZE':
        return this.env.COST_STANDARD_RESIZE;
      case 'PRODUCT_CLEANUP':
        return this.env.COST_PRODUCT_CLEANUP;
      case 'AI_PRODUCT_DESIGN':
        return this.env.COST_AI_PRODUCT_DESIGN;
      case 'PRODUCT_INFOGRAPHICS':
        return this.env.COST_PRODUCT_INFOGRAPHICS;
      default:
        return 0;
    }
  }

  constructor(private readonly prisma: PrismaService) {}
}

/**
 * Tranzaksion kredit ledjeri.
 * Balans faqat shu servis orqali o'zgaradi. Frontend balansga ishonmaydi.
 */
@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService, private readonly pricing: PricingService) {}

  async ensureBalance(userId: string): Promise<{ balance: number; reserved: number; granted: boolean }> {
    const env = loadEnv();
    const existing = await this.prisma.creditBalance.findUnique({ where: { userId } });
    if (existing) return { balance: existing.balance, reserved: existing.reserved, granted: false };

    await this.prisma.creditBalance.create({ data: { userId, balance: 0, reserved: 0 } });
    if (env.FREE_TRIAL_CREDITS > 0) {
      await this.grant(userId, env.FREE_TRIAL_CREDITS, `trial:${userId}`, 'Bepul sinov kreditlari');
      const b = await this.prisma.creditBalance.findUniqueOrThrow({ where: { userId } });
      return { balance: b.balance, reserved: b.reserved, granted: true };
    }
    return { balance: 0, reserved: 0, granted: true };
  }

  async getBalance(userId: string): Promise<{ balance: number; reserved: number }> {
    await this.ensureBalance(userId);
    const b = await this.prisma.creditBalance.findUniqueOrThrow({ where: { userId } });
    return { balance: b.balance, reserved: b.reserved };
  }

  async grant(userId: string, amount: number, idempotencyKey: string, note?: string): Promise<LedgerEntry | null> {
    if (amount <= 0) throw new ConflictException('GRANT_AMOUNT_MUST_BE_POSITIVE');
    const duplicate = await this.prisma.creditLedger.findUnique({ where: { idempotencyKey } });
    if (duplicate) return null; // takroriy so'rov — muvaffaqiyatli, lekin qayta qo'shilmaydi

    return this.prisma.$transaction(async (tx) => {
      await tx.creditBalance.upsert({
        where: { userId },
        create: { userId, balance: 0, reserved: 0 },
        update: {},
      });
      const updated = await tx.creditBalance.update({
        where: { userId },
        data: { balance: { increment: amount } },
      });
      return tx.creditLedger.create({
        data: { userId, amount, type: 'GRANT', balanceAfter: updated.balance, idempotencyKey, note },
      });
    });
  }

  /** Ish boshlanishida kredit ajratadi (balance kamayadi, reserved oshadi). */
  async reserve(
    userId: string,
    amount: number,
    jobId: string,
    idempotencyKey = `reserve:${jobId}`,
  ): Promise<LedgerEntry | null> {
    if (amount < 0) throw new ConflictException('NEGATIVE_AMOUNT');
    const duplicate = await this.prisma.creditLedger.findUnique({ where: { idempotencyKey } });
    if (duplicate) return null;
    if (amount === 0) {
      return this.prisma.creditLedger.create({
        data: {
          userId,
          jobId,
          amount: 0,
          type: 'RESERVE',
          balanceAfter: (await this.getBalance(userId)).balance,
          idempotencyKey,
          note: 'Bepul operatsiya',
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.creditBalance.upsert({
        where: { userId },
        create: { userId, balance: 0, reserved: 0 },
        update: {},
      });
      // Shartli UPDATE — parallel ikki sarflashning oldini oladi.
      const res = await tx.$executeRaw`
        UPDATE "CreditBalance"
        SET balance = balance - ${amount}, reserved = reserved + ${amount}, "updatedAt" = NOW()
        WHERE "userId" = ${userId} AND balance >= ${amount}`;
      if (res === 0) throw new ConflictException('INSUFFICIENT_CREDITS');
      const updated = await tx.creditBalance.findUniqueOrThrow({ where: { userId } });
      return tx.creditLedger.create({
        data: { userId, jobId, amount: -amount, type: 'RESERVE', balanceAfter: updated.balance, idempotencyKey },
      });
    });
  }

  /** Muvaffaqiyatli ish yakunida ajratilgan kreditni yechadi. */
  async charge(userId: string, amount: number, jobId: string, idempotencyKey = `charge:${jobId}`): Promise<LedgerEntry | null> {
    const duplicate = await this.prisma.creditLedger.findUnique({ where: { idempotencyKey } });
    if (duplicate) return null;
    if (amount === 0) return null;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "CreditBalance"
        SET reserved = GREATEST(reserved - ${amount}, 0), "updatedAt" = NOW()
        WHERE "userId" = ${userId}`;
      const updated = await tx.creditBalance.findUniqueOrThrow({ where: { userId } });
      return tx.creditLedger.create({
        data: {
          userId,
          jobId,
          amount: -amount,
          type: 'CHARGE',
          balanceAfter: updated.balance,
          idempotencyKey,
          note: 'Ish yakunlandi',
        },
      });
    });
  }

  /** Muvaffaqiyatsiz ish uchun kreditni qaytaradi. */
  async refund(userId: string, amount: number, jobId: string, note = 'Ish bajarilmadi'): Promise<LedgerEntry | null> {
    if (amount <= 0) return null;
    const idempotencyKey = `refund:${jobId}`;
    const duplicate = await this.prisma.creditLedger.findUnique({ where: { idempotencyKey } });
    if (duplicate) return null;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "CreditBalance"
        SET balance = balance + ${amount}, reserved = GREATEST(reserved - ${amount}, 0), "updatedAt" = NOW()
        WHERE "userId" = ${userId}`;
      const updated = await tx.creditBalance.findUniqueOrThrow({ where: { userId } });
      return tx.creditLedger.create({
        data: { userId, jobId, amount, type: 'REFUND', balanceAfter: updated.balance, idempotencyKey, note },
      });
    });
  }

  async adjustByAdmin(
    userId: string,
    amount: number,
    actorUserId: string,
    reason: string,
  ): Promise<LedgerEntry> {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('USER_NOT_FOUND');

    return this.prisma.$transaction(async (tx) => {
      await tx.creditBalance.upsert({
        where: { userId },
        create: { userId, balance: 0, reserved: 0 },
        update: {},
      });
      const updated = await tx.creditBalance.update({
        where: { userId },
        data: { balance: { increment: amount } },
      });
      if (updated.balance < 0) throw new ConflictException('BALANCE_WOULD_BE_NEGATIVE');
      return tx.creditLedger.create({
        data: {
          userId,
          amount,
          type: 'ADMIN_ADJUST',
          balanceAfter: updated.balance,
          actorUserId,
          note: reason,
        },
      });
    });
  }

  async history(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.creditLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          amount: true,
          type: true,
          balanceAfter: true,
          note: true,
          jobId: true,
          createdAt: true,
        },
      }),
      this.prisma.creditLedger.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }
}

export type { Prisma };
