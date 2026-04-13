export type UserRole =
  | "super_admin"
  | "tenant_owner"
  | "revisor"
  | "collaborator"
  | "syndic";

export type TenantStatus = "active" | "suspended" | "trial";

export interface Plan {
  id: string;
  name: string;
  max_assignments: number;
  max_users: number;
  storage_gb: number;
  ai_quota: number | null;
  vigilance_module: boolean;
  ai_drafts_module: boolean;
  advanced_import: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  referent_name: string | null;
  phone: string | null;
  vat_number: string | null;
  timezone: string;
  logo_url: string | null;
  status: TenantStatus;
  plan_id: string | null;
  plan_expires_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  tenant_id: string | null;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  signature_text: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeResponse {
  user: { id: string; email: string };
  profile: Pick<UserProfile, "role" | "full_name" | "is_active" | "tenant_id">;
  tenant: Pick<
    Tenant,
    "id" | "name" | "status" | "onboarding_completed" | "plan_id"
  > | null;
  plan: Pick<
    Plan,
    | "id"
    | "name"
    | "max_assignments"
    | "max_users"
    | "storage_gb"
    | "ai_quota"
    | "vigilance_module"
    | "ai_drafts_module"
    | "advanced_import"
  > | null;
}
