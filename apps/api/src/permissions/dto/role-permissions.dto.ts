import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn } from 'class-validator';
import { PERMISSIONS, type Permission } from '../../access/permissions';
import { PROFILES, type Profile } from '../../access/profile';

/** A profile and its permissions, as returned by E-51 and E-52. */
export class RolePermissionsDto {
  @ApiProperty({ enum: [...PROFILES], example: 'warehouse' })
  role!: Profile;

  @ApiProperty({ enum: [...PERMISSIONS], isArray: true, example: ['stock:read', 'stock:withdraw'] })
  permissions!: Permission[];
}

/**
 * Body of PUT /roles/{role}/permissions (E-52): the complete new list of the profile.
 * An empty list and repeated items are NOT checked here on purpose: the service answers the empty list
 * with 422 STOCK_PERMISSIONS_EMPTY (contract code) and removes the repeated ones. Checking them here
 * would make the validation pipe answer 400 before the service runs.
 */
export class ReplaceRolePermissionsDto {
  @ApiProperty({ enum: [...PERMISSIONS], isArray: true, example: ['stock:read', 'stock:withdraw'] })
  @IsArray()
  @IsIn([...PERMISSIONS], { each: true })
  permissions!: Permission[];
}