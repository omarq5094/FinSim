// Generated from local migration-applied PostgreSQL catalog. Not verified against a cloud project.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = { public: { Tables: {
companies: {
Row: {
id: string;
workspace_id: string;
name: string;
activity: string;
size: string;
currency: string;
created_at: string;
updated_at: string;
};
Insert: {
id?: string;
workspace_id: string;
name: string;
activity: string;
size: string;
currency?: string;
created_at?: string;
updated_at?: string;
};
Update: {
id?: string;
workspace_id?: string;
name?: string;
activity?: string;
size?: string;
currency?: string;
created_at?: string;
updated_at?: string;
};
Relationships: [];
};
profiles: {
Row: {
id: string;
display_name: string;
created_at: string;
updated_at: string;
};
Insert: {
id: string;
display_name?: string;
created_at?: string;
updated_at?: string;
};
Update: {
id?: string;
display_name?: string;
created_at?: string;
updated_at?: string;
};
Relationships: [];
};
scenario_inputs: {
Row: {
id: string;
workspace_id: string;
scenario_id: string;
schema_version: number;
capital_minor: number;
monthly_revenue_minor: number;
monthly_expenses_minor: number;
duration_months: number;
expected_annual_return_bps: number;
risk_level: string;
notes: string;
created_at: string;
updated_at: string;
};
Insert: {
id?: string;
workspace_id: string;
scenario_id: string;
schema_version?: number;
capital_minor: number;
monthly_revenue_minor: number;
monthly_expenses_minor: number;
duration_months: number;
expected_annual_return_bps: number;
risk_level: string;
notes: string;
created_at?: string;
updated_at?: string;
};
Update: {
id?: string;
workspace_id?: string;
scenario_id?: string;
schema_version?: number;
capital_minor?: number;
monthly_revenue_minor?: number;
monthly_expenses_minor?: number;
duration_months?: number;
expected_annual_return_bps?: number;
risk_level?: string;
notes?: string;
created_at?: string;
updated_at?: string;
};
Relationships: [];
};
scenario_versions: {
Row: {
id: string;
workspace_id: string;
scenario_id: string;
parent_version_id: string | null;
version_number: number;
schema_version: number;
input_snapshot: Json;
created_by: string;
created_at: string;
};
Insert: {
id?: string;
workspace_id: string;
scenario_id: string;
parent_version_id?: string | null;
version_number: number;
schema_version?: number;
input_snapshot: Json;
created_by: string;
created_at?: string;
};
Update: {
id?: string;
workspace_id?: string;
scenario_id?: string;
parent_version_id?: string | null;
version_number?: number;
schema_version?: number;
input_snapshot?: Json;
created_by?: string;
created_at?: string;
};
Relationships: [];
};
scenarios: {
Row: {
id: string;
workspace_id: string;
project_id: string;
name: string;
status: string;
created_at: string;
updated_at: string;
};
Insert: {
id?: string;
workspace_id: string;
project_id: string;
name: string;
status?: string;
created_at?: string;
updated_at?: string;
};
Update: {
id?: string;
workspace_id?: string;
project_id?: string;
name?: string;
status?: string;
created_at?: string;
updated_at?: string;
};
Relationships: [];
};
simulation_events: {
Row: {
id: string;
workspace_id: string;
entity_type: string;
entity_id: string;
event_type: string;
actor_id: string;
occurred_at: string;
};
Insert: {
id?: string;
workspace_id: string;
entity_type: string;
entity_id: string;
event_type: string;
actor_id: string;
occurred_at?: string;
};
Update: {
id?: string;
workspace_id?: string;
entity_type?: string;
entity_id?: string;
event_type?: string;
actor_id?: string;
occurred_at?: string;
};
Relationships: [];
};
simulation_projects: {
Row: {
id: string;
workspace_id: string;
company_id: string;
name: string;
created_at: string;
updated_at: string;
};
Insert: {
id?: string;
workspace_id: string;
company_id: string;
name: string;
created_at?: string;
updated_at?: string;
};
Update: {
id?: string;
workspace_id?: string;
company_id?: string;
name?: string;
created_at?: string;
updated_at?: string;
};
Relationships: [];
};
workspace_memberships: {
Row: {
workspace_id: string;
user_id: string;
role: string;
created_at: string;
updated_at: string;
};
Insert: {
workspace_id: string;
user_id: string;
role: string;
created_at?: string;
updated_at?: string;
};
Update: {
workspace_id?: string;
user_id?: string;
role?: string;
created_at?: string;
updated_at?: string;
};
Relationships: [];
};
workspaces: {
Row: {
id: string;
owner_id: string;
name: string;
created_at: string;
updated_at: string;
};
Insert: {
id?: string;
owner_id: string;
name: string;
created_at?: string;
updated_at?: string;
};
Update: {
id?: string;
owner_id?: string;
name?: string;
created_at?: string;
updated_at?: string;
};
Relationships: [];
};
}; Views: { [_ in never]: never }; Functions: {
create_scenario_draft: { Args: {target_workspace: string | null;target_company: string | null;scenario_name: string | null;capital_minor: number | null;monthly_revenue_minor: number | null;monthly_expenses_minor: number | null;duration_months: number | null;expected_annual_return_bps: number | null;risk_level: string | null;notes: string | null;target_project?: string | null;}; Returns: string };
create_workspace: { Args: {workspace_name: string | null;}; Returns: string };
set_workspace_member: { Args: {target_workspace: string | null;target_user: string | null;member_role: string | null;}; Returns: undefined };
}; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never }; } };
