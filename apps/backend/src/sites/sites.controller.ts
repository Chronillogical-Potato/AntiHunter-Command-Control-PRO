import { Body, Controller, Get, Param, Put } from '@nestjs/common';

import { SitesService } from './sites.service';
import { UpdateSiteDto } from './dto/update-site.dto';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  list() {
    return this.sitesService.list();
  }

  @Get(':siteId')
  get(@Param('siteId') siteId: string) {
    return this.sitesService.getById(siteId);
  }

  @Put(':siteId')
  update(@Param('siteId') siteId: string, @Body() dto: UpdateSiteDto) {
    return this.sitesService.update(siteId, dto);
  }
}
