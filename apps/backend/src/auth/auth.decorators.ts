import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const IS_PUBLIC_KEY = Symbol('isPublic');
export const ALLOW_PENDING_KEY = Symbol('allowPendingLegal');
export const ROLES_KEY = Symbol('roles');
export const FEATURES_KEY = Symbol('features');

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const AllowLegalPending = () => SetMetadata(ALLOW_PENDING_KEY, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const RequireFeatures = (...features: string[]) => SetMetadata(FEATURES_KEY, features);
