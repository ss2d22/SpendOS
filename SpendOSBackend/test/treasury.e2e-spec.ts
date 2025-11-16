import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Treasury E2E', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/treasury/balance (GET)', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/treasury/balance')
        .expect(401);
    });
  });

  describe('/api/v1/treasury/funding-history (GET)', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/treasury/funding-history')
        .expect(401);
    });
  });
});
