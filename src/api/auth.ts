import jwt from 'jsonwebtoken';

export interface Claims {
  sub: string;
  exp: number;
}

export function encodeToken(secret: string): string {
  return jwt.sign({ sub: 'admin' }, secret, { expiresIn: '24h' });
}

export function decodeToken(token: string, secret: string): Claims {
  return jwt.verify(token, secret) as Claims;
}
