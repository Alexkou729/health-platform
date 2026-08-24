import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecipeService } from './recipe.service';
import { AdviceService } from './advice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('recipe')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('care-plans')
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
  async listPlans(@CurrentUser() user: any, @Query() q: any) { return this.recipeService.listPlans(q, user); }

  @Get('care-plans/:id')
  async findPlan(@CurrentUser() user: any, @Param('id') id: string) { return this.recipeService.findPlan(id, user); }

  @Post('care-plans')
  async createPlan(@CurrentUser() user: any, @Body() body: any) { return this.recipeService.createPlan(body, user); }

  @Put('care-plans/:id')
  async updatePlan(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.recipeService.updatePlan(id, body, user); }

  @Delete('care-plans/:id')
  async deletePlan(@CurrentUser() user: any, @Param('id') id: string) { return this.recipeService.deletePlan(id, user); }

  @Post('advice/generate')
  @ApiOperation({ summary: '智能生成医嘱' })
  async generateAdvice(@Body() body: any) { return this.adviceService.generateAdviceByConstitution(body.constitution, body.indicators || [], body.customerInfo || {}); }

  @Post('recipes/recommend')
  @ApiOperation({ summary: '推荐理调项目' })
  async recommendRecipes(@Body() body: any) { return this.adviceService.recommendRecipes(body.constitution, body.issues || []); }
}
