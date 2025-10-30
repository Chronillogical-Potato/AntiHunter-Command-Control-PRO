import { Role } from '@prisma/client';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
  legalAccepted: boolean;
  iat: number;
  exp: number;
  tokenVersion?: number;
  features?: string[];
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
      authToken?: string;
    }
  }
}

export {};
