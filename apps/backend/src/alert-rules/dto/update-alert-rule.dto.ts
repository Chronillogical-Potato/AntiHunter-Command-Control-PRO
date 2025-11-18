import { PartialType } from '@nestjs/mapped-types';

import { CreateAlertRuleDto } from './create-alert-rule.dto';

export class UpdateAlertRuleDto extends PartialType(CreateAlertRuleDto) {}
