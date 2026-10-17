// Row level security of work_document_links (migration 0058) on a real
// Postgres (PGlite) with the project's migrations and a stand-in for
// Supabase auth. Run: npm test
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const M = new URL('../supabase/migrations/', import.meta.url)
const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
const db = new PGlite()
const sql = (name) => fs.readFileSync(new URL(name, M), 'utf8')

async function as(uid, query, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`)
  return db.query(query, params)
}
async function attempt(uid, query, params) {
  try {
    return { rows: (await as(uid, query, params)).rows }
  } catch (e) {
    return { error: e.message }
  }
}
const newDoc = async (uid, title) => (await as(uid, `insert into public.work_documents (user_id, template_id, title) values ($1, 'fire_report', $2) returning id`, [uid, title])).rows[0].id
const pair = (x, y) => (x < y ? [x, y] : [y, x])

let a1, a2, a3, b1
before(async () => {
  await db.exec(`create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role authenticated nologin; create table public.profiles (id uuid primary key references auth.users (id));
    insert into auth.users values ('${A}'), ('${B}');`)
  for (const f of ['0023_inspection_history.sql', '0029_work_reports.sql', '0031_document_builder.sql', '0055_document_status_and_check_link.sql', '0058_work_document_links.sql']) await db.exec(sql(f))
  await db.exec(`grant usage on schema public, auth to authenticated; grant all on all tables in schema public to authenticated; grant execute on all functions in schema auth to authenticated;`)
  a1 = await newDoc(A, 'Рапорт о пожаре')
  a2 = await newDoc(A, 'Справка о пожаре')
  a3 = await newDoc(A, 'Докладная')
  b1 = await newDoc(B, 'Чужой документ')
})

test('the owner links two own documents; the link is stored with its kind and topic', async () => {
  const [x, y] = pair(a1, a2)
  const r = await as(A, `insert into public.work_document_links (user_id, document_a, document_b, kind, topic) values ($1, $2, $3, 'incident', 'Пожар на складе') returning *`, [A, x, y])
  assert.equal(r.rows.length, 1)
  assert.equal(r.rows[0].kind, 'incident')
  const read = await as(A, `select * from public.work_document_links where document_a = $1 or document_b = $1`, [a1])
  assert.equal(read.rows.length, 1)
})

test('a pair is stored once and never with itself', async () => {
  const [x, y] = pair(a1, a2)
  await assert.rejects(as(A, `insert into public.work_document_links (user_id, document_a, document_b) values ($1, $2, $3)`, [A, x, y]))
  await assert.rejects(as(A, `insert into public.work_document_links (user_id, document_a, document_b) values ($1, $2, $2)`, [A, a1]))
  await assert.rejects(as(A, `insert into public.work_document_links (user_id, document_a, document_b) values ($1, $2, $3)`, [A, y, x]), 'reversed order is refused')
})

test('nobody can link another user’s document', async () => {
  const [x, y] = pair(a3, b1)
  const byA = await attempt(A, `insert into public.work_document_links (user_id, document_a, document_b) values ($1, $2, $3)`, [A, x, y])
  assert.ok(byA.error, 'A cannot link B’s document to their own')
  const byB = await attempt(B, `insert into public.work_document_links (user_id, document_a, document_b) values ($1, $2, $3)`, [B, x, y])
  assert.ok(byB.error, 'B cannot link A’s document to their own')
  const [p, q] = pair(a1, a3)
  const forged = await attempt(B, `insert into public.work_document_links (user_id, document_a, document_b) values ($1, $2, $3)`, [A, p, q])
  assert.ok(forged.error, 'B cannot create a link in A’s name')
})

test('another user cannot see, change or delete the link', async () => {
  const seen = await as(B, `select * from public.work_document_links`)
  assert.equal(seen.rows.length, 0)
  const upd = await as(B, `update public.work_document_links set topic = 'x', decisions = '{"k": {"status": "intentional"}}' returning id`)
  assert.equal(upd.rows.length, 0)
  const del = await as(B, `delete from public.work_document_links returning id`)
  assert.equal(del.rows.length, 0)
  const own = await as(A, `select topic, decisions from public.work_document_links`)
  assert.equal(own.rows[0].topic, 'Пожар на складе')
  assert.deepEqual(own.rows[0].decisions, {})
})

test('the owner cannot repoint a link to another user\u2019s document', async () => {
  const [x, y] = pair(a1, b1)
  const r = await attempt(A, `update public.work_document_links set document_a = $1, document_b = $2 returning id`, [x, y])
  assert.match(r.error ?? '', /row-level security/)
  const [p, q] = pair(a1, a2)
  const row = (await as(A, `select document_a, document_b from public.work_document_links`)).rows[0]
  assert.deepEqual([row.document_a, row.document_b], [p, q])
})

test('decisions and review marks are stored; deleting a document deletes its links', async () => {
  const id = `evacuated|12|14`
  await as(A, `update public.work_document_links set decisions = jsonb_set(decisions, $1, $2::jsonb), reviewed = jsonb_build_object($3::text, now()) where document_a = $4 or document_b = $4`, [`{${id}}`, JSON.stringify({ status: 'both', note: 'разные этапы' }), a1, a1])
  const row = (await as(A, `select decisions, reviewed from public.work_document_links`)).rows[0]
  assert.equal(row.decisions[id].status, 'both')
  assert.ok(row.reviewed[a1])
  await as(A, `delete from public.work_documents where id = $1`, [a2])
  assert.equal((await as(A, `select * from public.work_document_links`)).rows.length, 0)
})
