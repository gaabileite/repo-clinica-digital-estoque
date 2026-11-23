import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsIn } from 'class-validator';
import { PERMISSIONS, type Permission } from '../../access/permissions';
import { PROFILES, type Profile } from '../../access/profile';

/** A profile and its permissions, as returned by E-51 and E-52. */
export class RolePermissionsDto {
  @ApiProperty({ enum: [...PROFILES], example: 'warehouse' })
  role!: Profile;

  @ApiProperty({ enum: [...PERMISSIONS], isArray: true, example: ['stock:read', 'stock:withdraw'] })
  permissions!: Permission[];
}

/** Body of PUT /roles/{role}/permissions (E-52): the complete new list of the profile. */
export class ReplaceRolePermissionsDto {
  @ApiProperty({ enum: [...PERMISSIONS], isArray: true, example: ['stock:read', 'stock:withdraw'] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn([...PERMISSIONS], { each: true })
  permissions!: Permission[];
}