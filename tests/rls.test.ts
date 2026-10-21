import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const users = Object.fromEntries(["owner","other","cfo","analyst","viewer","outsider"].map((role,i) => [role, `${i+1}1111111-1111-4111-8111-111111111111`])) as Record<string,string>;
const tables = ["profiles","workspaces","workspace_memberships","companies","simulation_projects","scenarios","scenario_inputs","scenario_versions","simulation_events"];
let db: PGlite;
let workspaceA: string, workspaceB: string, companyA: string, companyB: string, projectA: string, scenarioA: string;
async function asUser(role: string) {
  await db.exec("reset role; set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [users[role]]);
}
async function createCompany(workspace: string) {
  return (await db.query<{id:string}>("insert into companies(workspace_id,name,activity,size) values($1,'Test company','Retail','small') returning id",[workspace])).rows[0].id;
}
async function draft(workspace: string, company: string, project: string|null = null, capital = 85000000) {
  return (await db.query<{id:string}>("select public.create_scenario_draft($1,$2,'Riyadh', $3,0,0,12,1800,'high','Assumptions pending details',$4) as id",[workspace,company,capital,project])).rows[0].id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(`create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as $$ begin return; end; $$;
    create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE') execute function public.rls_auto_enable();`);
  for (const id of Object.values(users)) await db.query("insert into auth.users values($1)",[id]);
  for (const file of readdirSync("supabase/migrations").filter(f => f.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${file}`,"utf8"));
  for (const role of Object.keys(users)) {
    await asUser(role);
    await db.query("insert into profiles(id) values($1)",[users[role]]);
  }
  await asUser("owner");
  workspaceA = (await db.query<{id:string}>("select public.create_workspace('Workspace A') as id")).rows[0].id;
  for (const role of ["cfo","analyst","viewer"]) await db.query("select public.set_workspace_member($1,$2,$3)",[workspaceA,users[role],role]);
  companyA = await createCompany(workspaceA);
  scenarioA = await draft(workspaceA,companyA);
  projectA = (await db.query<{project_id:string}>("select project_id from scenarios where id=$1",[scenarioA])).rows[0].project_id;
  await asUser("other");
  workspaceB = (await db.query<{id:string}>("select public.create_workspace('Workspace B') as id")).rows[0].id;
  companyB = await createCompany(workspaceB);
  await draft(workspaceB,companyB);
});
beforeEach(async () => { await db.exec("reset role; begin"); });
afterEach(async () => { await db.exec("rollback; reset role"); });
afterAll(async () => { await db?.close(); });

describe("schema and authentication", () => {
  it("enables and forces RLS on all nine public tables", async () => {
    const {rows} = await db.query<{relrowsecurity:boolean;relforcerowsecurity:boolean}>("select relrowsecurity,relforcerowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r'");
    expect(rows).toHaveLength(9);
    expect(rows.every(r => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
    expect((await db.query("select count(*)::int as count from pg_policies where schemaname='public'")).rows).toEqual([{count:20}]);
  });
  it("auto-enables RLS and denies implicit grants on future tables", async () => {
    await db.exec("create table public.future_table(id int)");
    expect((await db.query("select relrowsecurity from pg_class where oid='public.future_table'::regclass")).rows).toEqual([{relrowsecurity:true}]);
    await asUser("owner");
    await expect(db.query("select * from future_table")).rejects.toThrow(/permission denied/);
  });
  it.each(tables)("denies anon access to %s",async table => {
    await db.exec("set role anon");
    await expect(db.query(`select * from public.${table}`)).rejects.toThrow(/permission denied/);
  });
  it("denies RPC access to anon",async () => {
    await db.exec("set role anon");
    await expect(db.query("select public.create_workspace('Spoof')")).rejects.toThrow(/permission denied/);
  });
  it("authenticated users cannot create API objects",async () => {
    await asUser("owner");
    await expect(db.query("create table public.untrusted_table(id int)")).rejects.toThrow(/permission denied/);
  });
  it("denies bootstrap with missing auth identity even under authenticated role",async () => {
    await asUser("owner");
    await db.exec("select set_config('request.jwt.claim.sub','',false)");
    await expect(db.query("select public.create_workspace('Spoof')")).rejects.toThrow(/Authentication required/);
  });
  it("keeps privileged functions out of the exposed public schema", async () => {
    expect((await db.query("select proname from pg_proc where pronamespace='public'::regnamespace and prosecdef")).rows).toEqual([]);
  });
  it("preserves and secures the dashboard automatic-RLS helper",async () => {
    expect((await db.query("select p.prosecdef, has_function_privilege('anon',p.oid,'execute') as anon_execute from pg_proc p where p.oid='finsim_internal.rls_auto_enable()'::regprocedure")).rows).toEqual([{prosecdef:false,anon_execute:false}]);
    expect((await db.query("select evtname from pg_event_trigger where evtname='ensure_rls'")).rows).toHaveLength(1);
  });
});

describe("tenant isolation and membership", () => {
  it.each(["workspaces","workspace_memberships","companies","simulation_projects","scenarios","scenario_inputs","scenario_versions","simulation_events"])("hides other workspace data in %s", async table => {
    await asUser("owner");
    const column = table === "workspaces" ? "id" : "workspace_id";
    expect((await db.query(`select * from public.${table} where ${column}=$1`,[workspaceB])).rows).toEqual([]);
  });
  it("hides all workspace data from an outsider", async () => {
    await asUser("outsider");
    expect((await db.query("select * from companies")).rows).toEqual([]);
    expect((await db.query("select finsim_internal.workspace_role($1) as role",[workspaceA])).rows).toEqual([{role:null}]);
  });
  it("does not trust user_metadata to grant roles",async () => {
    await asUser("outsider");
    await db.exec(`select set_config('request.jwt.claims','{"user_metadata":{"role":"owner"}}',false)`);
    await expect(createCompany(workspaceA)).rejects.toThrow(/row-level security/);
  });
  it("prevents cross-tenant draft insertion",async () => {
    await asUser("other");
    await expect(draft(workspaceA,companyA)).rejects.toThrow(/row-level security/);
  });
  it("prevents cross-tenant updates",async () => {
    await asUser("other");
    expect((await db.query("update companies set name='Hacked' where id=$1 returning id",[companyA])).rows).toEqual([]);
    expect((await db.query("update scenario_inputs set capital_minor=1 where scenario_id=$1 returning id",[scenarioA])).rows).toEqual([]);
  });
  it("composite FKs reject cross-tenant company links even for a member of both",async () => {
    await asUser("other");
    await db.query("select public.set_workspace_member($1,$2,'cfo')",[workspaceB,users.owner]);
    await asUser("owner");
    await expect(db.query("insert into simulation_projects(workspace_id,company_id,name) values($1,$2,'Invalid')",[workspaceA,companyB])).rejects.toThrow(/foreign key/);
  });
  it("owner can add, change and revoke a member immediately",async () => {
    await asUser("owner");
    await db.query("select public.set_workspace_member($1,$2,'viewer')",[workspaceA,users.outsider]);
    await asUser("outsider");
    expect((await db.query("select id from companies")).rows).toEqual([{id:companyA}]);
    await asUser("owner");
    await db.query("select public.set_workspace_member($1,$2,null)",[workspaceA,users.outsider]);
    await asUser("outsider");
    expect((await db.query("select id from companies")).rows).toEqual([]);
  });
  it.each(["cfo","analyst","viewer","other","outsider"])("%s cannot manage workspace A members",async role => {
    await asUser(role);
    await expect(db.query("select public.set_workspace_member($1,$2,'cfo')",[workspaceA,users.outsider])).rejects.toThrow(/Owner permission required/);
  });
  it("cannot remove or downgrade the owner",async () => {
    await asUser("owner");
    await expect(db.query("select public.set_workspace_member($1,$2,null)",[workspaceA,users.owner])).rejects.toThrow(/immutable/);
  });
  it("cannot escalate membership by direct writes",async () => {
    await asUser("viewer");
    await expect(db.query("update workspace_memberships set role='owner' where workspace_id=$1 and user_id=$2",[workspaceA,users.viewer])).rejects.toThrow(/permission denied/);
  });
  it("cannot switch a company workspace",async () => {
    await asUser("owner");
    await expect(db.query("update companies set workspace_id=$1 where id=$2",[workspaceB,companyA])).rejects.toThrow(/permission denied/);
  });
  it("profiles are self-only",async () => {
    await asUser("owner");
    expect((await db.query("select id from profiles")).rows).toEqual([{id:users.owner}]);
    expect((await db.query("update profiles set display_name='Hacked' where id=$1 returning id",[users.other])).rows).toEqual([]);
  });
});

describe("role capabilities and integrity", () => {
  it.each(["owner","cfo"])("%s creates companies and project/scenario inputs",async role => {
    await asUser(role);
    const company = await createCompany(workspaceA);
    expect(await draft(workspaceA,company)).toMatch(/^[a-f0-9-]{36}$/);
  });
  it.each(["analyst","viewer"])("%s cannot create companies",async role => {
    await asUser(role);
    await expect(createCompany(workspaceA)).rejects.toThrow(/row-level security/);
  });
  it("analyst creates a scenario and inputs inside an existing project",async () => {
    await asUser("analyst");
    expect(await draft(workspaceA,companyA,projectA)).toMatch(/^[a-f0-9-]{36}$/);
  });
  it("analyst cannot create projects via the atomic RPC",async () => {
    await asUser("analyst");
    await expect(draft(workspaceA,companyA)).rejects.toThrow(/row-level security/);
  });
  it("viewer reads but cannot create scenarios",async () => {
    await asUser("viewer");
    expect((await db.query("select id from companies")).rows).toHaveLength(1);
    await expect(draft(workspaceA,companyA,projectA)).rejects.toThrow(/row-level security/);
  });
  it.each(["owner","cfo","analyst"])("%s can update assumptions",async role => {
    await asUser(role);
    expect((await db.query("update scenario_inputs set capital_minor=123 where scenario_id=$1 returning capital_minor",[scenarioA])).rows).toEqual([{capital_minor:123}]);
  });
  it("viewer cannot update assumptions",async () => {
    await asUser("viewer");
    expect((await db.query("update scenario_inputs set capital_minor=123 where scenario_id=$1 returning id",[scenarioA])).rows).toEqual([]);
  });
  it("database rejects negative assumptions",async () => {
    await asUser("owner");
    await expect(db.query("update scenario_inputs set capital_minor=-1 where scenario_id=$1",[scenarioA])).rejects.toThrow(/check constraint/);
  });
  it("invalid input rolls back the entire draft RPC and audit events",async () => {
    await asUser("owner");
    const before = (await db.query("select count(*) as count from simulation_projects")).rows;
    const events = (await db.query("select count(*) as count from simulation_events")).rows;
    await db.exec("savepoint invalid_draft");
    await expect(draft(workspaceA,companyA,null,-1)).rejects.toThrow(/check constraint/);
    await db.exec("rollback to savepoint invalid_draft");
    expect((await db.query("select count(*) as count from simulation_projects")).rows).toEqual(before);
    expect((await db.query("select count(*) as count from simulation_events")).rows).toEqual(events);
  });
  it("updates timestamps and appends trustworthy audit events",async () => {
    await asUser("cfo");
    await db.query("update companies set name='Renamed' where id=$1",[companyA]);
    expect((await db.query("select actor_id,event_type from simulation_events where entity_id=$1 order by occurred_at desc limit 1",[companyA])).rows).toEqual([{actor_id:users.cfo,event_type:"updated"}]);
    expect((await db.query<{valid:boolean}>("select updated_at>=created_at as valid from companies where id=$1",[companyA])).rows[0].valid).toBe(true);
  });
  it.each(["scenario_versions","simulation_events"])("client cannot forge/update %s",async table => {
    await asUser("owner");
    await expect(db.query(`update ${table} set workspace_id=$1`,[workspaceB])).rejects.toThrow(/permission denied/);
  });
  it("cannot delete companies in week one",async () => {
    await asUser("owner");
    await expect(db.query("delete from companies where id=$1",[companyA])).rejects.toThrow(/permission denied/);
  });
  it("workspace metadata is owner-only",async () => {
    await asUser("cfo");
    expect((await db.query("update workspaces set name='Changed' where id=$1 returning id",[workspaceA])).rows).toEqual([]);
    await asUser("owner");
    expect((await db.query("update workspaces set name='Changed' where id=$1 returning id",[workspaceA])).rows).toEqual([{id:workspaceA}]);
  });
});
