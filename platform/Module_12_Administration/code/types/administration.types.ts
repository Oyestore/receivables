export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'cancelled';

export interface IUser {
  id: string;
  tenant_id: string;
  email: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  status: UserStatus;
  last_login_at?: Date;
  roles?: IRole[];
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface IRole {
  id: string;
  tenant_id?: string; // null for system roles
  name: string;
  description?: string;
  permissions?: string[];
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IPermission {
  id: string;
  permission_name: string;
  description?: string;
  module: string;
  created_at: Date;
}

export interface IUserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: Date;
}

export interface IRolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: Date;
}

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  settings?: any;
  subscription_plan?: string;
  subscription_expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IAuditLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  changes?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface ISession {
  id: string;
  user_id: string;
  token: string;
  refresh_token?: string;
  expires_at: Date;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}
