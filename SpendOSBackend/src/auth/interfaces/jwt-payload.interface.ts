export interface JwtPayload {
  sub: string; // wallet address
  roles: ('admin' | 'manager' | 'spender')[];
  ownedAccountIds: number[];
  approverAccountIds: number[];
  iat?: number;
  exp?: number;
}
