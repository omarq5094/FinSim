// Generate types from the migration-applied local PostgreSQL catalog, never a remote DB.
import { PGlite } from "@electric-sql/pglite";
import { log } from "node:console";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const db = new PGlite();
try {
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  for (const f of readdirSync("supabase/migrations").filter(f => f.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  const { rows: columns } = await db.query(`select table_name,column_name,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position`);
  const type = name => ({ uuid:"string",text:"string",timestamptz:"string",int4:"number",int8:"number",jsonb:"Json",void:"undefined" })[name] ?? "unknown";
  let output = '// Generated from local migration-applied PostgreSQL catalog. Not verified against a cloud project.\n';
  output += 'export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database = { public: { Tables: {\n';
  for (const table of [...new Set(columns.map(c => c.table_name))]) {
    const fields = columns.filter(c => c.table_name===table);
    output += `${table}: {\n`;
    for (const mode of ['Row','Insert','Update']) {
      output += `${mode}: {\n`;
      for (const col of fields) output += `${col.column_name}${mode==='Update'||(mode==='Insert'&&(col.column_default||col.is_nullable==='YES'))?'?':''}: ${type(col.udt_name)}${col.is_nullable==='YES'?' | null':''};\n`;
      output += '};\n';
    }
    output += 'Relationships: [];\n};\n';
  }
  const { rows: funcs } = await db.query(`select proname,proargnames,pronargdefaults,
    array(select format_type(t,null) from unnest(proargtypes::oid[]) t) as argtypes,
    format_type(prorettype,null) as result from pg_proc where pronamespace='public'::regnamespace order by proname`);
  output += '}; Views: { [_ in never]: never }; Functions: {\n';
  for (const f of funcs) {
    output += `${f.proname}: { Args: {`;
    f.proargnames.forEach((n,i) => { output += `${n}${i>=f.proargnames.length-f.pronargdefaults?'?':''}: ${type(({integer:'int4',bigint:'int8'})[f.argtypes[i]]??f.argtypes[i])} | null;`; });
    output += `}; Returns: ${type(f.result)} };\n`;
  }
  output += '}; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never }; } };\n';
  writeFileSync('src/lib/supabase/database.types.ts', output);
  log(`Generated ${new Set(columns.map(c => c.table_name)).size} tables and ${funcs.length} RPC types from local PostgreSQL.`);
} finally { await db.close(); }
