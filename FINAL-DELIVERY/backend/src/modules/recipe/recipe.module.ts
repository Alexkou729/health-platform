import { Module } from '@nestjs/common';
import { RecipeController } from './recipe.controller';
import { RecipeService } from './recipe.service';
import { AdviceService } from './advice.service';

@Module({ controllers: [RecipeController], providers: [RecipeService, AdviceService], exports: [RecipeService, AdviceService] })
export class RecipeModule {}
