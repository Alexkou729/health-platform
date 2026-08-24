import { Module } from '@nestjs/common';
import { FranchiseService } from './franchise.service';
import { FranchiseController } from './franchise.controller';
import { FranchisePublicController } from './franchise.public.controller';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [FranchiseController, FranchisePublicController],
  providers: [FranchiseService],
})
export class FranchiseModule {}
