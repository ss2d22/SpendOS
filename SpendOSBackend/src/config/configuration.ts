export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'spendos',
    password: process.env.DATABASE_PASSWORD || 'spendos_password',
    database: process.env.DATABASE_NAME || 'spendos_db',
    ssl: process.env.DATABASE_SSL === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  arc: {
    rpcUrl: process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network',
    wsUrl: process.env.ARC_WS_URL || 'wss://rpc.testnet.arc.network',
    treasuryContractAddress: process.env.TREASURY_CONTRACT_ADDRESS,
    chainId: 5042002, // Arc Testnet
  },

  backend: {
    privateKey: process.env.BACKEND_PRIVATE_KEY,
  },

  gateway: {
    apiBaseUrl:
      process.env.GATEWAY_API_BASE_URL ||
      'https://gateway-api-testnet.circle.com/v1',
    // Gateway uses the backend wallet (same as treasury operator)
    walletPrivateKey: process.env.BACKEND_PRIVATE_KEY,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '900s',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});
