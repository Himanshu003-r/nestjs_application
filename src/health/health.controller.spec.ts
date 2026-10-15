import { Test, TestingModule } from '@nestjs/testing';
import { expect, jest } from '@jest/globals';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let mockGetHealth: jest.Mock;

  beforeEach(async () => {
    mockGetHealth = jest.fn().mockReturnValue({
      status: 'ok',
      service: 'commerce-platform',
    });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getHealth: mockGetHealth,
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', () => {
    const result = controller.check();

    expect(result).toEqual({
      status: 'ok',
      service: 'commerce-platform',
    });

    expect(mockGetHealth).toHaveBeenCalled();
  });
});
