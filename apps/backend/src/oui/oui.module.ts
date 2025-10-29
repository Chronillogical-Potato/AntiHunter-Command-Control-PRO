import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OuiController } from './oui.controller';
import { OuiService } from './oui.service';

@Module({
  imports: [PrismaModule],
  providers: [OuiService],
  controllers: [OuiController],
  exports: [OuiService],
})
export class OuiModule {}
