import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CrossChainMintService } from './cross-chain-mint.service';

describe('CrossChainMintService', () => {
  let service: CrossChainMintService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'gateway.walletPrivateKey') {
        return '0x1234567890123456789012345678901234567890123456789012345678901234';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrossChainMintService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CrossChainMintService>(CrossChainMintService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize providers for supported chains', () => {
      const supportedChains = service.getSupportedChains();

      expect(supportedChains).toContain(84532); // Base Sepolia
      expect(supportedChains).toContain(11155111); // Ethereum Sepolia
      expect(supportedChains).toContain(43113); // Avalanche Fuji
    });

    it('should create providers for all supported chains', () => {
      const baseProvider = service.getProvider(84532);
      const ethProvider = service.getProvider(11155111);
      const avaxProvider = service.getProvider(43113);

      expect(baseProvider).toBeDefined();
      expect(ethProvider).toBeDefined();
      expect(avaxProvider).toBeDefined();
    });

    it('should create wallets for all supported chains', () => {
      const baseWallet = service.getWallet(84532);
      const ethWallet = service.getWallet(11155111);
      const avaxWallet = service.getWallet(43113);

      expect(baseWallet).toBeDefined();
      expect(ethWallet).toBeDefined();
      expect(avaxWallet).toBeDefined();
    });
  });

  describe('getProvider', () => {
    it('should return provider for valid chain', () => {
      const provider = service.getProvider(84532);

      expect(provider).toBeDefined();
    });

    it('should return undefined for unsupported chain', () => {
      const provider = service.getProvider(999999);

      expect(provider).toBeUndefined();
    });
  });

  describe('getWallet', () => {
    it('should return wallet for valid chain', () => {
      const wallet = service.getWallet(84532);

      expect(wallet).toBeDefined();
      expect(wallet.address).toBeDefined();
    });

    it('should return undefined for unsupported chain', () => {
      const wallet = service.getWallet(999999);

      expect(wallet).toBeUndefined();
    });

    it('should have same address for all chain wallets', () => {
      const baseWallet = service.getWallet(84532);
      const ethWallet = service.getWallet(11155111);
      const avaxWallet = service.getWallet(43113);

      expect(baseWallet?.address).toBe(ethWallet?.address);
      expect(ethWallet?.address).toBe(avaxWallet?.address);
    });
  });

  describe('getSupportedChains', () => {
    it('should return array of supported chain IDs', () => {
      const chains = service.getSupportedChains();

      expect(chains).toBeInstanceOf(Array);
      expect(chains.length).toBeGreaterThan(0);
    });

    it('should include all configured testnets', () => {
      const chains = service.getSupportedChains();

      expect(chains).toEqual(expect.arrayContaining([84532, 11155111, 43113]));
    });
  });

  describe('mintOnDestination', () => {
    it('should throw error for unsupported chain', async () => {
      const attestation = '0xattestation';

      await expect(
        service.mintOnDestination(999999, attestation),
      ).rejects.toThrow('Gateway Minter address not found for chain 999999');
    });

    it('should throw error if wallet not found', async () => {
      // This shouldn't happen in normal operation, but test the guard
      const attestation = '0xattestation';

      // Temporarily corrupt wallets map
      const wallets = (service as any).wallets;
      const originalWallet = wallets.get(84532);
      wallets.delete(84532);

      await expect(
        service.mintOnDestination(84532, attestation),
      ).rejects.toThrow('Wallet not found for chain 84532');

      // Restore
      wallets.set(84532, originalWallet);
    });

    // Note: Full integration test for mintOnDestination would require
    // mocking ethers Contract, which is complex. This is better tested
    // in integration tests with a test network.
  });
});
