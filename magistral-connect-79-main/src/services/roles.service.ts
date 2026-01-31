import { api } from '@/lib/api';

export type PermissionKey = 'marketplace_moderate_offers';

export interface CooperativeRoleDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  permissionKeys: PermissionKey[];
  userIds: string[];
}

class RolesService {
  async list(): Promise<CooperativeRoleDto[]> {
    const res = await api.get<{ roles: CooperativeRoleDto[] }>(`/roles`);
    return res.roles || [];
  }

  async create(input: { name: string; description?: string | null }): Promise<CooperativeRoleDto> {
    const res = await api.post<{ role: CooperativeRoleDto }>(`/roles`, input);
    // backend do create não inclui arrays; recarregar lista no UI
    return res.role;
  }

  async update(roleId: string, input: { name?: string; description?: string | null }): Promise<CooperativeRoleDto> {
    const res = await api.patch<{ role: CooperativeRoleDto }>(`/roles/${roleId}`, input);
    return res.role;
  }

  async remove(roleId: string): Promise<void> {
    await api.delete(`/roles/${roleId}`);
  }

  async setPermission(roleId: string, key: PermissionKey, enabled: boolean): Promise<PermissionKey[]> {
    const res = await api.patch<{ roleId: string; permissionKeys: PermissionKey[] }>(`/roles/${roleId}/permissions`, { key, enabled });
    return res.permissionKeys || [];
  }

  async addMember(roleId: string, userId: string): Promise<void> {
    await api.post(`/roles/${roleId}/members`, { userId });
  }

  async removeMember(roleId: string, userId: string): Promise<void> {
    await api.delete(`/roles/${roleId}/members/${userId}`);
  }
}

export const rolesService = new RolesService();

