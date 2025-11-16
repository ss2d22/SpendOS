import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpendRequest } from '../../spend-requests/entities/spend-request.entity';
import { SpendAccount } from '../../spend-accounts/entities/spend-account.entity';
import { TreasuryService } from '../../treasury/services/treasury.service';
import { SpendStatus } from '../../common/enums';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(SpendRequest)
    private readonly spendRequestRepository: Repository<SpendRequest>,
    @InjectRepository(SpendAccount)
    private readonly spendAccountRepository: Repository<SpendAccount>,
    private readonly treasuryService: TreasuryService,
  ) {}

  async getRunway(): Promise<{ days: number; amount: string }> {
    const balance = await this.treasuryService.getBalance();
    const burnRateMicroUsdc = await this.calculateBurnRate(30);

    // Convert burn rate from micro USDC to USDC dollars for comparison
    const burnRateUsdc = parseFloat(burnRateMicroUsdc) / 1e6;
    const availableUsdc = parseFloat(balance.available);

    if (burnRateUsdc === 0) {
      return { days: Infinity, amount: balance.available };
    }

    const days = availableUsdc / burnRateUsdc;

    return {
      days: Math.floor(days),
      amount: balance.available,
    };
  }

  async getBurnRate(
    days: number = 30,
  ): Promise<{ daily: string; monthly: string }> {
    const dailyRate = await this.calculateBurnRate(days);
    const monthlyRate = (parseFloat(dailyRate) * 30).toString();

    return {
      daily: dailyRate,
      monthly: monthlyRate,
    };
  }

  private async calculateBurnRate(days: number): Promise<string> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const spends = await this.spendRequestRepository
      .createQueryBuilder('request')
      .where('request.status = :status', { status: SpendStatus.EXECUTED })
      .andWhere('request.executedAt >= :startDate', { startDate })
      .getMany();

    const totalSpent = spends.reduce((sum, spend) => {
      return sum + BigInt(spend.amount);
    }, BigInt(0));

    const avgDaily = totalSpent / BigInt(days);

    return avgDaily.toString();
  }

  async getDepartmentBreakdown(): Promise<
    Array<{ accountId: number; label: string; spent: string; budget: string }>
  > {
    const accounts = await this.spendAccountRepository.find({
      where: { closed: false },
    });

    return accounts.map((account) => ({
      accountId: account.accountId,
      label: account.label,
      spent: account.periodSpent,
      budget: account.budgetPerPeriod,
    }));
  }
}
