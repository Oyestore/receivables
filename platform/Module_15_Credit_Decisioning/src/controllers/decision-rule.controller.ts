import { Controller, Post, Get, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { DecisionRuleService } from '../services/decision-rule.service';
import { CreateDecisionRuleDto, UpdateDecisionRuleDto } from '../dto/create-decision-rule.dto';

@Controller('decision-rules')
export class DecisionRuleController {
  constructor(private readonly decisionRuleService: DecisionRuleService) {}

  @Post()
  async createRule(@Body() createRuleDto: CreateDecisionRuleDto) {
    return this.decisionRuleService.createRule(createRuleDto, 'system');
  }

  @Get()
  async getRules(@Query() filters: any) {
    return this.decisionRuleService.getRules(filters);
  }

  @Get(':id')
  async getRule(@Param('id') id: string) {
    return this.decisionRuleService.getRule(id);
  }

  @Put(':id')
  async updateRule(@Param('id') id: string, @Body() updateRuleDto: UpdateDecisionRuleDto) {
    return this.decisionRuleService.updateRule(id, updateRuleDto, 'system');
  }

  @Delete(':id')
  async deleteRule(@Param('id') id: string) {
    return this.decisionRuleService.deleteRule(id, 'system');
  }

  @Post(':id/activate')
  async activateRule(@Param('id') id: string) {
    return this.decisionRuleService.activateRule(id, 'system');
  }

  @Post(':id/deactivate')
  async deactivateRule(@Param('id') id: string) {
    return this.decisionRuleService.deactivateRule(id, 'system');
  }

  @Post(':id/test')
  async testRule(@Param('id') id: string) {
    return this.decisionRuleService.testRule(id);
  }

  @Get(':id/metrics')
  async getRuleMetrics(@Param('id') id: string) {
    return this.decisionRuleService.getRuleMetrics(id);
  }

  @Post(':id/clone')
  async cloneRule(@Param('id') id: string, @Body() body: { newName: string }) {
    return this.decisionRuleService.cloneRule(id, body.newName, 'system');
  }

  @Post('export')
  async exportRules(@Body() body: { ruleIds?: string[] }) {
    return this.decisionRuleService.exportRules(body.ruleIds);
  }

  @Post('import')
  async importRules(@Body() body: { rulesData: any[] }) {
    return this.decisionRuleService.importRules(body.rulesData, 'system');
  }
}
