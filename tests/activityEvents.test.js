// Activity log of the dashboard chart (migration 0063) on a real Postgres
// (PGlite) with the project's migrations and a stand-in for Supabase auth:
// the triggers log every source table, a term and a mission are counted once,
// attempts every time, and a user sees only own rows. Run: npm test
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const M = new URL('../supabase/migrations/', import.meta.url)
const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
const T1 = '10000000-0000-0000-0000-000000000001'
const T2 = '10000000-0000-0000-0000-000000000002'
const db = new PGlite()
const sql = (name) => fs.readFileSync(new URL(name, M), 'utf8')

async function as(uid, query, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`)
  return db.query(query, params)
}
const events = async (uid) =>
  (await as(uid, `select kind, ref from public.user_activity_events order by id`)).rows.map((r) => `${r.kind}:${r.ref}`)

before(async () => {
  await db.exec(`create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role authenticated nologin;
    create table public.terms (id uuid primary key);
    insert into auth.users values ('${A}'), ('${B}');
    insert into public.terms values ('${T1}'), ('${T2}');`)
  for (const f of ['0005_test_attempts.sql', '0007_term_views.sql', '0010_term_mastery.sql', '0012_mission_term_progress.sql', '0013_mission_test_attempts.sql', '0014_mission_completions.sql']) await db.exec(sql(f))
  // A term viewed before the log existed: the backfill must pick it up.
  await db.exec(`insert into public.term_views (user_id, term_id, viewed_at) values ('${A}', '${T2}', now() - interval '3 days')`)
  await db.exec(sql('0063_user_activity_events.sql'))
  await db.exec(`grant usage on schema public, auth to authenticated; grant all on all tables in schema public to authenticated; grant execute on all functions in schema auth to authenticated;`)
})

test('the backfill copies actions recorded before the migration', async () => {
  assert.deepEqual(await events(A), [`term_study:${T2}`])
})

test('a term is counted once, however it is opened, marked or studied again', async () => {
  await as(A, `insert into public.term_views (user_id, term_id) values ($1, $2)`, [A, T1])
  await as(A, `insert into public.term_views (user_id, term_id) values ($1, $2) on conflict (user_id, term_id) do update set viewed_at = now()`, [A, T1])
  await as(A, `insert into public.term_mastery (user_id, term_id) values ($1, $2)`, [A, T1])
  await as(A, `insert into public.mission_term_progress (user_id, mission_id, term_id) values ($1, 'm1', $2)`, [A, T1])
  const study = (await events(A)).filter((e) => e.startsWith('term_study'))
  assert.deepEqual(study, [`term_study:${T2}`, `term_study:${T1}`])
})

test('every test attempt is logged; a mission completion only the first time', async () => {
  for (let i = 0; i < 2; i++) {
    await as(A, `insert into public.mission_test_attempts (user_id, mission_id, total_questions, correct_answers, score_percent, status) values ($1, 'm1', 10, 7, 70, 'passed')`, [A])
  }
  await as(A, `insert into public.test_attempts (user_id, category, total_questions, correct_answers, score_percent) values ($1, 'fire_safety', 5, 5, 100)`, [A])
  for (let i = 0; i < 2; i++) {
    await as(A, `insert into public.mission_completions (user_id, mission_id, category, score_percent) values ($1, 'm1', 'fire_safety', 80)`, [A])
  }
  const all = await events(A)
  assert.equal(all.filter((e) => e === 'mission_test:m1').length, 2)
  assert.equal(all.filter((e) => e === 'test:fire_safety').length, 1)
  assert.equal(all.filter((e) => e === 'mission_complete:m1').length, 1)
})

test('a user sees only own events and cannot write them directly', async () => {
  assert.deepEqual(await events(B), [])
  await assert.rejects(as(B, `insert into public.user_activity_events (user_id, kind, ref) values ($1, 'test', null)`, [B]))
  await assert.rejects(as(B, `insert into public.user_activity_events (user_id, kind, ref) values ($1, 'test', null)`, [A]))
})

test('re-running the migration does not duplicate anything', async () => {
  const before = (await events(A)).length
  await db.exec('reset role')
  await db.exec(sql('0063_user_activity_events.sql'))
  assert.equal((await events(A)).length, before)
})
