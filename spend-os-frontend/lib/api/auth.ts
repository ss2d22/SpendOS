import { api } from './client';
import type { NonceResponse, NonceRequest, VerifySignatureRequest, MeResponse } from '@/types/api';

export async function getNonce(address: string): Promise<NonceResponse> {
  return api.post<NonceResponse>('/auth/nonce', { address } as NonceRequest);
}

export async function verifySignature(payload: VerifySignatureRequest): Promise<void> {
  return api.post<void>('/auth/verify', payload);
}

export async function getMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/auth/me');
}

export async function logout(): Promise<void> {
  return api.post<void>('/auth/logout');
}
