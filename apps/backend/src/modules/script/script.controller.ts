import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ScriptService } from "./script.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("script")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("scripts")
export class ScriptController {
  constructor(private readonly service: ScriptService) {}

  @Get() list(@Query() q: any) { return this.service.listTemplates(q); }
  @Post() create(@Body() body: any) { return this.service.createTemplate(body); }
  @Put(":id") update(@Param("id") id: string, @Body() body: any) { return this.service.updateTemplate(id, body); }
  @Delete(":id") remove(@Param("id") id: string) { return this.service.deleteTemplate(id); }
  @Post("generate") async generate(@Body() body: any) { return this.service.generate(body); }
}
