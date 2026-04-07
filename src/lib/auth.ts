import { SignJWT, jwtVerify } from 'jose';
import { getEnv } from './env';

export interface User {
  id: string;
  email: string;
  displayName: string;
}

interface TokenPayload {
  sub: string;
  email: string;
  name: string;
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setExpirationTime('15min')
    .setIssuedAt()
    .sign(getSecret());
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return {
    sub: payload.sub!,
    email: payload.email as string,
    name: payload.name as string,
  };
}

export async function getUserFromRequest(request: Request): Promise<User> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/access_token=([^;]+)/);
  if (!match) throw new AuthError('No token', 401);
  const payload = await verifyToken(match[1]);
  return { id: payload.sub, email: payload.email, displayName: payload.name };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
