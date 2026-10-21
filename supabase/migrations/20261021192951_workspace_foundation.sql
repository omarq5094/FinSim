-- FinSim only. Initial schema; never apply to Maghsaltak or another existing project.
revoke create on schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;

create schema finsim_internal;
revoke all on schema finsim_internal from public, anon, authenticated;
grant usage on schema finsim_internal to authenticated;

-- Dashboard's automatic-RLS option creates a public SECURITY DEFINER helper.
-- Preserve its event trigger but move the helper outside the exposed API schema.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    alter function public.rls_auto_enable() set schema finsim_internal;
    alter function finsim_internal.rls_auto_enable() security invoker;
    revoke all on function finsim_internal.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

create function finsim_internal.enable_public_table_rls()
returns event_trigger language plpgsql security invoker set search_path = '' as $$
declare command record;
begin
  for command in select * from pg_event_trigger_ddl_commands()
    where object_type in ('table', 'partitioned table') and schema_name = 'public'
  loop
    execute format('alter table %s enable row level security', command.objid::regclass);
  end loop;
end;
$$;
revoke all on function finsim_internal.enable_public_table_rls() from public, anon, authenticated;
create event trigger finsim_enable_rls_on_new_public_tables on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function finsim_internal.enable_public_table_rls();

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null default 'FinSim user' check (char_length(btrim(display_name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspaces_owner_idx on public.workspaces(owner_id);
create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in ('owner','cfo','analyst','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index memberships_user_idx on public.workspace_memberships(user_id, workspace_id);
create unique index one_owner_per_workspace on public.workspace_memberships(workspace_id) where role='owner';

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  activity text not null check (char_length(btrim(activity)) between 2 and 160),
  size text not null check (size in ('micro','small','medium','large')),
  currency text not null default 'SAR' check (currency='SAR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);
create index companies_workspace_idx on public.companies(workspace_id);
create table public.simulation_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  company_id uuid not null,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (company_id, workspace_id) references public.companies(id, workspace_id) on delete restrict
);
create index projects_workspace_idx on public.simulation_projects(workspace_id);
create index projects_company_idx on public.simulation_projects(company_id, workspace_id);
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  status text not null default 'draft' check (status='draft'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (project_id, workspace_id) references public.simulation_projects(id, workspace_id) on delete restrict
);
create index scenarios_workspace_idx on public.scenarios(workspace_id);
create index scenarios_project_idx on public.scenarios(project_id, workspace_id);
create table public.scenario_inputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  scenario_id uuid not null,
  schema_version integer not null default 1 check (schema_version=1),
  capital_minor bigint not null check (capital_minor between 0 and 999999999999),
  monthly_revenue_minor bigint not null check (monthly_revenue_minor between 0 and 999999999999),
  monthly_expenses_minor bigint not null check (monthly_expenses_minor between 0 and 999999999999),
  duration_months integer not null check (duration_months between 1 and 120),
  expected_annual_return_bps integer not null check (expected_annual_return_bps between 0 and 10000),
  risk_level text not null check (risk_level in ('low','medium','high')),
  notes text not null check (char_length(btrim(notes)) between 10 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scenario_id, workspace_id),
  foreign key (scenario_id, workspace_id) references public.scenarios(id, workspace_id) on delete restrict
);
create index inputs_workspace_idx on public.scenario_inputs(workspace_id);

-- Reserved schema only: week 6 will add save/restore/branch execution, not week 1.
create table public.scenario_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  scenario_id uuid not null,
  parent_version_id uuid,
  version_number integer not null check (version_number>0),
  schema_version integer not null default 1 check (schema_version=1),
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot)='object'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (id, scenario_id, workspace_id),
  unique (scenario_id, workspace_id, version_number),
  check (parent_version_id is null or parent_version_id<>id),
  foreign key (scenario_id, workspace_id) references public.scenarios(id, workspace_id) on delete restrict,
  foreign key (parent_version_id, scenario_id, workspace_id) references public.scenario_versions(id, scenario_id, workspace_id) on delete restrict
);
create index versions_workspace_idx on public.scenario_versions(workspace_id);
create index versions_parent_idx on public.scenario_versions(parent_version_id, scenario_id, workspace_id);
create index versions_creator_idx on public.scenario_versions(created_by);
create table public.simulation_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  entity_type text not null check (entity_type in ('companies','simulation_projects','scenarios','scenario_inputs')),
  entity_id uuid not null,
  event_type text not null check (event_type in ('created','updated')),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now()
);
create index events_workspace_time_idx on public.simulation_events(workspace_id, occurred_at desc);
create index events_actor_idx on public.simulation_events(actor_id);

-- This private helper intentionally bypasses membership RLS to avoid recursive policies.
-- It exposes only the current authenticated user's role, never arbitrary users' roles.
create function finsim_internal.workspace_role(target_workspace uuid)
returns text language sql stable security definer set search_path = '' as $$
  select m.role from public.workspace_memberships m
  where auth.uid() is not null and m.user_id=(select auth.uid()) and m.workspace_id=target_workspace;
$$;
revoke all on function finsim_internal.workspace_role(uuid) from public, anon, authenticated;
grant execute on function finsim_internal.workspace_role(uuid) to authenticated;

create function finsim_internal.touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at=clock_timestamp(); return new; end;
$$;
revoke all on function finsim_internal.touch_updated_at() from public, anon, authenticated;

-- Privileged bootstrap is narrowly scoped and atomic. No caller-supplied owner id.
create function finsim_internal.create_workspace(workspace_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); result uuid;
begin
  if actor is null then raise insufficient_privilege using message='Authentication required'; end if;
  insert into public.profiles(id) values(actor) on conflict(id) do nothing;
  insert into public.workspaces(owner_id,name) values(actor,btrim(workspace_name)) returning id into result;
  insert into public.workspace_memberships(workspace_id,user_id,role) values(result,actor,'owner');
  return result;
end;
$$;
revoke all on function finsim_internal.create_workspace(text) from public, anon, authenticated;
grant execute on function finsim_internal.create_workspace(text) to authenticated;
create function public.create_workspace(workspace_name text)
returns uuid language sql security invoker set search_path = '' as $$
  select finsim_internal.create_workspace(workspace_name);
$$;
revoke all on function public.create_workspace(text) from public, anon, authenticated;
grant execute on function public.create_workspace(text) to authenticated;

-- Only the immutable owner can grant/change/remove non-owner membership.
create function finsim_internal.set_workspace_member(target_workspace uuid, target_user uuid, member_role text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); workspace_owner uuid;
begin
  if actor is null then raise insufficient_privilege using message='Authentication required'; end if;
  select owner_id into workspace_owner from public.workspaces where id=target_workspace for update;
  if workspace_owner is distinct from actor then raise insufficient_privilege using message='Owner permission required'; end if;
  if target_user=workspace_owner then raise insufficient_privilege using message='Owner membership is immutable'; end if;
  if member_role is null then
    delete from public.workspace_memberships where workspace_id=target_workspace and user_id=target_user;
  elsif member_role in ('cfo','analyst','viewer') then
    insert into public.workspace_memberships(workspace_id,user_id,role) values(target_workspace,target_user,member_role)
    on conflict(workspace_id,user_id) do update set role=excluded.role;
  else raise check_violation using message='Invalid member role';
  end if;
end;
$$;
revoke all on function finsim_internal.set_workspace_member(uuid,uuid,text) from public, anon, authenticated;
grant execute on function finsim_internal.set_workspace_member(uuid,uuid,text) to authenticated;
create function public.set_workspace_member(target_workspace uuid, target_user uuid, member_role text)
returns void language sql security invoker set search_path = '' as $$
  select finsim_internal.set_workspace_member(target_workspace,target_user,member_role);
$$;
revoke all on function public.set_workspace_member(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.set_workspace_member(uuid,uuid,text) to authenticated;

-- Append-only audit events generated by trusted triggers, never client-supplied actor ids.
create function finsim_internal.audit_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or finsim_internal.workspace_role(new.workspace_id) is null then
    raise insufficient_privilege using message='Authenticated workspace member required';
  end if;
  insert into public.simulation_events(workspace_id,entity_type,entity_id,event_type,actor_id)
    values(new.workspace_id,tg_table_name,new.id,case when tg_op='INSERT' then 'created' else 'updated' end,actor);
  return new;
end;
$$;
revoke all on function finsim_internal.audit_change() from public, anon, authenticated;

do $$ declare table_name text;
begin
  foreach table_name in array array['profiles','workspaces','workspace_memberships','companies','simulation_projects','scenarios','scenario_inputs'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function finsim_internal.touch_updated_at()',table_name);
  end loop;
  foreach table_name in array array['profiles','workspaces','workspace_memberships','companies','simulation_projects','scenarios','scenario_inputs','scenario_versions','simulation_events'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('alter table public.%I force row level security',table_name);
    execute format('revoke all on public.%I from public,anon,authenticated',table_name);
    execute format('grant select on public.%I to authenticated',table_name);
  end loop;
  foreach table_name in array array['companies','simulation_projects','scenarios','scenario_inputs'] loop
    execute format('create trigger audit_change after insert or update on public.%I for each row execute function finsim_internal.audit_change()',table_name);
  end loop;
end $$;
grant usage on schema public to authenticated;
grant insert(id,display_name), update(display_name) on public.profiles to authenticated;
grant update(name) on public.workspaces to authenticated;
grant insert(workspace_id,name,activity,size), update(name,activity,size) on public.companies to authenticated;
grant insert(workspace_id,company_id,name), update(name) on public.simulation_projects to authenticated;
grant insert(workspace_id,project_id,name), update(name) on public.scenarios to authenticated;
grant insert(workspace_id,scenario_id,capital_minor,monthly_revenue_minor,monthly_expenses_minor,duration_months,expected_annual_return_bps,risk_level,notes),
  update(capital_minor,monthly_revenue_minor,monthly_expenses_minor,duration_months,expected_annual_return_bps,risk_level,notes) on public.scenario_inputs to authenticated;

create policy profiles_self_read on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id=(select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy workspaces_member_read on public.workspaces for select to authenticated using (finsim_internal.workspace_role(id) is not null);
create policy workspaces_owner_update on public.workspaces for update to authenticated
  using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy memberships_member_read on public.workspace_memberships for select to authenticated using (finsim_internal.workspace_role(workspace_id) is not null);

do $$ declare table_name text; allowed text;
begin
  foreach table_name in array array['companies','simulation_projects','scenarios','scenario_inputs','scenario_versions','simulation_events'] loop
    execute format('create policy member_read on public.%I for select to authenticated using (finsim_internal.workspace_role(workspace_id) is not null)',table_name);
  end loop;
  foreach table_name in array array['companies','simulation_projects','scenarios','scenario_inputs'] loop
    allowed := case when table_name in ('companies','simulation_projects') then '(''owner'',''cfo'')' else '(''owner'',''cfo'',''analyst'')' end;
    execute format('create policy member_insert on public.%I for insert to authenticated with check (finsim_internal.workspace_role(workspace_id) in %s)',table_name,allowed);
    execute format('create policy member_update on public.%I for update to authenticated using (finsim_internal.workspace_role(workspace_id) in %s) with check (finsim_internal.workspace_role(workspace_id) in %s)',table_name,allowed,allowed);
  end loop;
end $$;

-- Atomically create a project, scenario and inputs; RLS on each insert still applies.
create function public.create_scenario_draft(
  target_workspace uuid, target_company uuid, scenario_name text,
  capital_minor bigint, monthly_revenue_minor bigint, monthly_expenses_minor bigint,
  duration_months integer, expected_annual_return_bps integer, risk_level text, notes text,
  target_project uuid default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare project uuid:=target_project; scenario uuid;
begin
  if project is null then
    insert into public.simulation_projects(workspace_id,company_id,name) values(target_workspace,target_company,scenario_name) returning id into project;
  elsif not exists(select 1 from public.simulation_projects p where p.id=project and p.company_id=target_company and p.workspace_id=target_workspace) then
    raise insufficient_privilege using message='Project unavailable';
  end if;
  insert into public.scenarios(workspace_id,project_id,name) values(target_workspace,project,scenario_name) returning id into scenario;
  insert into public.scenario_inputs(workspace_id,scenario_id,capital_minor,monthly_revenue_minor,monthly_expenses_minor,duration_months,expected_annual_return_bps,risk_level,notes)
    values(target_workspace,scenario,capital_minor,monthly_revenue_minor,monthly_expenses_minor,duration_months,expected_annual_return_bps,risk_level,notes);
  return scenario;
end;
$$;
revoke all on function public.create_scenario_draft(uuid,uuid,text,bigint,bigint,bigint,integer,integer,text,text,uuid) from public,anon,authenticated;
grant execute on function public.create_scenario_draft(uuid,uuid,text,bigint,bigint,bigint,integer,integer,text,text,uuid) to authenticated;

comment on table public.scenario_versions is 'Reserved immutable version records. No client write grants or checkpoint execution in week one.';
comment on column public.scenario_inputs.expected_annual_return_bps is 'User annual target assumption; 1800=18%. Not a calculated return.';
comment on table public.simulation_events is 'Append-only draft audit, not a simulation clock or accounting journal.';
