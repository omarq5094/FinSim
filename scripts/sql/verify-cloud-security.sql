-- Execute only on verified FinSim. All synthetic rows are rolled back.
begin;
do $$
declare
  owner_a uuid:=gen_random_uuid(); owner_b uuid:=gen_random_uuid();
  cfo_user uuid:=gen_random_uuid(); analyst_user uuid:=gen_random_uuid(); viewer_user uuid:=gen_random_uuid();
  workspace_a uuid; workspace_b uuid; company_a uuid; company_b uuid; project_a uuid; scenario_a uuid;
  changed integer; blocked boolean;
begin
  if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')<>9 then raise exception 'Expected nine public tables'; end if;
  if exists(select 1 from pg_class where relnamespace='public'::regnamespace and relkind='r' and (not relrowsecurity or not relforcerowsecurity)) then raise exception 'RLS not enabled/forced'; end if;
  if (select count(*) from pg_policies where schemaname='public')<>20 then raise exception 'Expected twenty RLS policies'; end if;
  if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and prosecdef) then raise exception 'Public definer function found'; end if;

  -- No passwords or login credentials: these synthetic auth identities live only in this transaction.
  insert into auth.users(id) values(owner_a),(owner_b),(cfo_user),(analyst_user),(viewer_user);
  insert into public.profiles(id) values(owner_a),(owner_b),(cfo_user),(analyst_user),(viewer_user);
  set local role authenticated;
  perform set_config('request.jwt.claim.sub',owner_a::text,true);
  workspace_a:=public.create_workspace('FinSim security test A');
  insert into public.companies(workspace_id,name,activity,size) values(workspace_a,'Test A','Retail','small') returning id into company_a;
  scenario_a:=public.create_scenario_draft(workspace_a,company_a,'Riyadh',85000000,0,0,12,1800,'high','Synthetic test assumptions only');
  select project_id into project_a from public.scenarios where id=scenario_a;
  perform public.set_workspace_member(workspace_a,cfo_user,'cfo');
  perform public.set_workspace_member(workspace_a,analyst_user,'analyst');
  perform public.set_workspace_member(workspace_a,viewer_user,'viewer');

  perform set_config('request.jwt.claim.sub',owner_b::text,true);
  workspace_b:=public.create_workspace('FinSim security test B');
  insert into public.companies(workspace_id,name,activity,size) values(workspace_b,'Test B','Services','small') returning id into company_b;
  if exists(select 1 from public.companies where id=company_a) then raise exception 'Cross-tenant read allowed'; end if;
  if exists(select 1 from public.scenario_inputs where scenario_id=scenario_a) then raise exception 'Cross-tenant inputs visible'; end if;
  update public.companies set name='Unauthorized' where id=company_a;
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'Cross-tenant update allowed'; end if;
  blocked:=false;
  begin perform public.create_scenario_draft(workspace_a,company_a,'Forbidden',1,0,0,12,100,'low','Synthetic assumptions only');
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Cross-tenant insert allowed'; end if;

  -- One user belongs to both workspaces: composite foreign keys must still stop mixed links.
  perform public.set_workspace_member(workspace_b,owner_a,'cfo');
  perform set_config('request.jwt.claim.sub',owner_a::text,true);
  blocked:=false;
  begin insert into public.simulation_projects(workspace_id,company_id,name) values(workspace_a,company_b,'Mixed tenant');
  exception when foreign_key_violation then blocked:=true; end;
  if not blocked then raise exception 'Cross-tenant relationship allowed'; end if;

  perform set_config('request.jwt.claim.sub',cfo_user::text,true);
  insert into public.companies(workspace_id,name,activity,size) values(workspace_a,'CFO company','Retail','small');
  blocked:=false;
  begin perform public.set_workspace_member(workspace_a,viewer_user,'cfo');
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'CFO managed members'; end if;

  perform set_config('request.jwt.claim.sub',analyst_user::text,true);
  perform public.create_scenario_draft(workspace_a,company_a,'Analyst draft',100,0,0,12,100,'low','Synthetic assumptions only',project_a);
  blocked:=false;
  begin insert into public.companies(workspace_id,name,activity,size) values(workspace_a,'Forbidden','Retail','small');
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Analyst created company'; end if;

  perform set_config('request.jwt.claim.sub',viewer_user::text,true);
  if not exists(select 1 from public.companies where id=company_a) then raise exception 'Viewer could not read own workspace'; end if;
  update public.scenario_inputs set capital_minor=1 where scenario_id=scenario_a;
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'Viewer wrote assumptions'; end if;
  blocked:=false;
  begin update public.workspace_memberships set role='owner' where workspace_id=workspace_a and user_id=viewer_user;
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Member self-escalation allowed'; end if;

  perform set_config('request.jwt.claim.sub',owner_a::text,true);
  perform public.set_workspace_member(workspace_a,viewer_user,null);
  perform set_config('request.jwt.claim.sub',viewer_user::text,true);
  if exists(select 1 from public.companies where id=company_a) then raise exception 'Revoked member retained access'; end if;

  set local role anon;
  blocked:=false;
  begin perform count(*) from public.companies;
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Anonymous access allowed'; end if;
  reset role;
end;
$$;
rollback;
select 'PASS: live PostgreSQL tenant isolation, role boundaries, composite FKs, revocation, anon denial; all fixtures rolled back' as security_verification;
