import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should return health status', () => {
    const result = service.getHealth()
    expect(result.status).toBe('ok')
    expect(result.service).toBe('commerce-platform')
    expect(result.version).toBe('1.0.0')
  });
});
