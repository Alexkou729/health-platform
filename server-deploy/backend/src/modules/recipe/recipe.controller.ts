import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecipeService } from './recipe.service';
import { AdviceService } from './advice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('recipe')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RecipeController {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly adviceService: AdviceService,
  ) {}

  @Get('recipes')
  async listRecipes(@Query() q: any) { return this.recipeService.listRecipes(q); }

  @Post('recipes')
  async createRecipe(@Body() body: any) { return this.recipeService.createRecipe(body); }

  @Put('recipes/:id')
  async updateRecipe(@Param('id') id: string, @Body() body: any) { return this.recipeService.updateRecipe(id, body); }

  @Delete('recipes/:id')
  async deleteRecipe(@Param('id') id: string) { return this.recipeService.deleteRecipe(id); }

  @Get('care-plans')
  async listPlans(@Query() q: any) { return this.recipeService.listPlans(q); }

  @Get('care-plans/:id')
  async findPlan(@Param('id') id: string) { return this.recipeService.findPlan(id); }

  @Post('care-plans')
  async createPlan(@Body() body: any) { return this.recipeService.createPlan(body); }

  @Put('care-plans/:id')
  async updatePlan(@Param('id') id: string, @Body() body: any) { return this.recipeService.updatePlan(id, body); }

  @Delete('care-plans/:id')
  async deletePlan(@Param('id') id: string) { return this.recipeService.deletePlan(id); }

  @Post('advice/generate')
  @ApiOperation({ summary: '智能生成医嘱' })
  async generateAdvice(@Body() body: any) { return this.adviceService.generateAdviceByConstitution(body.constitution, body.indicators || [], body.customerInfo || {}); }

  @Post('recipes/recommend')
  @ApiOperation({ summary: '推荐理调项目' })
  async recommendRecipes(@Body() body: any) { return this.adviceService.recommendRecipes(body.constitution, body.issues || []); }
}
