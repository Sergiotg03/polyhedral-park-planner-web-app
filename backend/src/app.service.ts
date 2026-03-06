import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getPolyhedral(): string {
    return 'Polyhedral Park Planner Web App Backend';
  }
}
