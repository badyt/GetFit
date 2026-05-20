import { UserRole } from '@prisma/client';

export interface JwtPayload {
  id: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  id: string;
  role: UserRole;
}
