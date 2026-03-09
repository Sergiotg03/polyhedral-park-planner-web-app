import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getPolyhedral() {
    return {
      name: 'Polyhedral Park Planner Web App Backend',
      status: 'OK',
    };
  }
}
