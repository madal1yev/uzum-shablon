import { Global, Module } from '@nestjs/common';
import { CreditsService, PricingService } from './credits.service';
import { CreditsController } from './credits.controller';

@Module({
  controllers: [CreditsController],
  providers: [CreditsService, PricingService],
  exports: [CreditsService, PricingService],
})
export class CreditsModule {}
