import { Controller, Get } from '@nestjs/common';

import { DronesService } from './drones.service';

@Controller('drones')
export class DronesController {
  constructor(private readonly dronesService: DronesService) {}

  @Get()
  list() {
    return this.dronesService.getSnapshot();
  }
}
