import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

export type UserRole = 'super_admin' | 'admin' | 'beta' | 'regular';

export interface PermissionState {
  role: UserRole;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canEditAll: boolean;
  canDeleteAll: boolean;
  canManageRoles: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

export const usePermissions = () => {
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState<PermissionState>({
    role: 'regular',
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canEditAll: false,
    canDeleteAll: false,
    canManageRoles: false,
    isSuperAdmin: false,
    isAdmin: false,
    isLoading: true,
  });

  useEffect(() => {
    const loadUserRole = async () => {
      if (!user) {
        setPermissions({
          role: 'regular',
          canAdd: false,
          canEdit: false,
          canDelete: false,
          canEditAll: false,
          canDeleteAll: false,
          canManageRoles: false,
          isSuperAdmin: false,
          isAdmin: false,
          isLoading: false,
        });
        return;
      }

      try {
        // 从users表获取用户角色
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          // 如果查询失败，默认为regular角色
          setPermissions({
            role: 'regular',
            canAdd: false,
            canEdit: false,
            canDelete: false,
            canEditAll: false,
            canDeleteAll: false,
            canManageRoles: false,
            isSuperAdmin: false,
            isAdmin: false,
            isLoading: false,
          });
          return;
        }

        const role = (userData?.role as UserRole) || 'regular';
        
        // 根据角色设置权限
        const isSuperAdmin = role === 'super_admin';
        const isAdmin = role === 'admin' || isSuperAdmin;
        const canModify = role === 'super_admin' || role === 'admin' || role === 'beta';
        
        const newPermissions: PermissionState = {
          role,
          canAdd: canModify,
          canEdit: canModify,
          canDelete: canModify,
          canEditAll: isAdmin,
          canDeleteAll: isAdmin,
          canManageRoles: isSuperAdmin,
          isSuperAdmin,
          isAdmin,
          isLoading: false,
        };

        setPermissions(newPermissions);
      } catch (error) {
        console.error('Error loading user permissions:', error);
        setPermissions({
          role: 'regular',
          canAdd: false,
          canEdit: false,
          canDelete: false,
          canEditAll: false,
          canDeleteAll: false,
          canManageRoles: false,
          isSuperAdmin: false,
          isAdmin: false,
          isLoading: false,
        });
      }
    };

    loadUserRole();
  }, [user]);

  // 检查是否可以编辑特定项目
  const canEditItem = (createdBy: string) => {
    if (!user) return false;
    return permissions.canEditAll || (permissions.canEdit && createdBy === user.id);
  };

  // 检查是否可以删除特定项目
  const canDeleteItem = (createdBy: string) => {
    if (!user) return false;
    return permissions.canDeleteAll || (permissions.canDelete && createdBy === user.id);
  };

  // 更新用户角色（仅超级管理员可用）
  const updateUserRole = async (targetUserId: string, newRole: UserRole) => {
    if (!permissions.canManageRoles) {
      throw new Error('Only super administrators can update user roles');
    }

    try {
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: targetUserId,
        new_role: newRole
      });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  return {
    ...permissions,
    canEditItem,
    canDeleteItem,
    updateUserRole,
  };
};

export default usePermissions;