import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { GatewayApiService } from './gateway-api.service';

describe('GatewayApiService', () => {
  let service: GatewayApiService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://gateway-api-testnet.circle.com/v1'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayApiService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GatewayApiService>(GatewayApiService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('getUnifiedBalance', () => {
    it('should fetch unified balance successfully', async () => {
      const token = 'USDC';
      const address = '0x1234567890123456789012345678901234567890';
      const mockResponse = {
        data: {
          balance: '1000000000', // 1000 USDC
          token: 'USDC',
          address,
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getUnifiedBalance(token, address);

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://gateway-api-testnet.circle.com/v1/balances',
        {
          params: { token, address },
        },
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      const token = 'USDC';
      const address = '0x1234567890123456789012345678901234567890';

      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('API Error')),
      );

      await expect(service.getUnifiedBalance(token, address)).rejects.toThrow();
    });
  });

  describe('submitBurnIntent', () => {
    it('should submit burn intent successfully', async () => {
      const signedBurnIntents = [
        {
          burnIntent: {
            amount: '1000000',
            chainId: 84532,
            destinationAddress: '0x1234567890123456789012345678901234567890',
            expiryBlock: 2000,
            fee: '1000',
          },
          signature: '0xsignature',
        },
      ];

      const mockResponse = {
        data: {
          transferId: 'transfer-123',
          attestation: '0xattestation',
          status: 'pending',
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.submitBurnIntent(signedBurnIntents);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://gateway-api-testnet.circle.com/v1/transfer',
        signedBurnIntents,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
      expect(result).toEqual(mockResponse.data);
      expect(result.transferId).toBe('transfer-123');
    });

    it('should handle multiple burn intents', async () => {
      const signedBurnIntents = [
        {
          burnIntent: {
            amount: '1000000',
            chainId: 84532,
            destinationAddress: '0x1234567890123456789012345678901234567890',
            expiryBlock: 2000,
            fee: '1000',
          },
          signature: '0xsignature1',
        },
        {
          burnIntent: {
            amount: '2000000',
            chainId: 11155111,
            destinationAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            expiryBlock: 2000,
            fee: '2000',
          },
          signature: '0xsignature2',
        },
      ];

      const mockResponse = {
        data: {
          transferId: 'transfer-456',
          attestation: '0xattestation',
          status: 'pending',
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.submitBurnIntent(signedBurnIntents);

      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error on submission failure', async () => {
      const signedBurnIntents = [
        {
          burnIntent: {
            amount: '1000000',
            chainId: 84532,
            destinationAddress: '0x1234567890123456789012345678901234567890',
            expiryBlock: 2000,
            fee: '1000',
          },
          signature: '0xsignature',
        },
      ];

      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Submission failed')),
      );

      await expect(service.submitBurnIntent(signedBurnIntents)).rejects.toThrow(
        'Submission failed',
      );
    });
  });
});
