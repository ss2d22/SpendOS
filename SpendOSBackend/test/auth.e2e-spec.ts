import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Wallet } from 'ethers';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let wallet: Wallet;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Create test wallet
    wallet = new Wallet(
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/auth/nonce (POST)', () => {
    it('should generate a nonce for a wallet address', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({ address: wallet.address })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('nonce');
          expect(typeof res.body.nonce).toBe('string');
          expect(res.body.nonce.length).toBeGreaterThan(0);
        });
    });

    it('should return 400 for invalid address', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({ address: 'invalid-address' })
        .expect(400);
    });

    it('should return 400 for missing address', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({})
        .expect(400);
    });
  });

  describe('/api/v1/auth/verify (POST)', () => {
    it('should verify signature and return JWT token', async () => {
      // First, get a nonce
      const nonceResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({ address: wallet.address })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      const message = `Sign this message to authenticate with Arc SpendOS\n\nNonce: ${nonce}\nAddress: ${wallet.address}`;
      const signature = await wallet.signMessage(message);

      // Verify the signature
      return request(app.getHttpServer())
        .post('/api/v1/auth/verify')
        .send({
          address: wallet.address,
          message,
          signature,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Authentication successful',
          );
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('address');
          expect(res.body.user.address).toBe(wallet.address.toLowerCase());
        });
    });

    it('should return 401 for invalid signature', async () => {
      const nonceResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({ address: wallet.address })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      const message = `Sign this message to authenticate with Arc SpendOS\n\nNonce: ${nonce}\nAddress: ${wallet.address}`;

      return request(app.getHttpServer())
        .post('/api/v1/auth/verify')
        .send({
          address: wallet.address,
          message,
          signature:
            '0xinvalidsignature0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        })
        .expect(401);
    });

    it('should return 401 for expired nonce', async () => {
      const message = `Sign this message to authenticate with Arc SpendOS\n\nNonce: expired-nonce\nAddress: ${wallet.address}`;
      const signature = await wallet.signMessage(message);

      return request(app.getHttpServer())
        .post('/api/v1/auth/verify')
        .send({
          address: wallet.address,
          message,
          signature,
        })
        .expect(401);
    });
  });

  describe('/api/v1/auth/profile (GET)', () => {
    it('should return user profile with valid JWT', async () => {
      // Get nonce and sign in
      const nonceResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({ address: wallet.address })
        .expect(201);

      const nonce = nonceResponse.body.nonce;
      const message = `Sign this message to authenticate with Arc SpendOS\n\nNonce: ${nonce}\nAddress: ${wallet.address}`;
      const signature = await wallet.signMessage(message);

      const verifyResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/verify')
        .send({
          address: wallet.address,
          message,
          signature,
        })
        .expect(201);

      // Extract cookie from response
      const cookies = verifyResponse.headers['set-cookie'];

      // Get profile
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('address');
          expect(res.body).toHaveProperty('roles');
          expect(res.body).toHaveProperty('ownedAccountIds');
          expect(res.body).toHaveProperty('approverAccountIds');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });
  });
});
