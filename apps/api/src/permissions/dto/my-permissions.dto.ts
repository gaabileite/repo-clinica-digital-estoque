import { ApiProperty } from '@nestjs/swagger';
import { PERMISSIONS, type Permission } from '../../access/permissions';
import { PROFILES, type Profile } from '../../access/profile';

/** Answer of GET /me/permissions (E-50): who is calling and what they can do. */
export class MyPermissionsDto {
  @ApiProperty({ enum: [...PROFILES], example: 'admin', description: 'Profile of the logged user.' })
  profile!: Profile;

  @ApiProperty({
    enum: [...PERMISSIONS],
    isArray: true,
    example: ['stock:read', 'stock:withdraw'],
    description: 'Scopes the profile has. The front uses this list to decide which screens to show.',
  })
  permissions!: Permission[];

  @ApiProperty({
    type: [String],
    example: ['0b6c1c1e-0000-4000-8000-000000000000'],
    description: 'Ids of the clinics the user belongs to. Empty for the superuser, who sees every clinic.',
  })
  clinics!: string[];
}