import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { database, databaseClient } from '../lib/database.ts';

test('the Vercel database adapter applies the real schema and preserves atomic account claims', async t => {
  process.env.TURSO_DATABASE_URL = ':memory:';
  const client = databaseClient();
  t.after(() => client.close());
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  const db = database();
  assert.ok(db);
  const insert = db.prepare('INSERT INTO auth_users(id,display_name,created_at) VALUES(?,?,?)');
  assert.equal((await insert.bind('alice', 'Alice', 1).run()).meta.changes, 1);
  assert.deepEqual(await db.prepare('SELECT id,display_name FROM auth_users WHERE id=?').bind('alice').first(), { id: 'alice', display_name: 'Alice' });
  assert.equal(await db.prepare('SELECT id FROM auth_users').first('id'), 'alice');
  assert.equal(await db.prepare('SELECT id FROM auth_users WHERE id=?').bind('missing').first(), null);
  await assert.rejects(db.batch([
    insert.bind('bob', 'Bob', 1),
    insert.bind('alice', 'Duplicate', 1),
  ]));
  assert.equal(await db.prepare('SELECT id FROM auth_users WHERE id=?').bind('bob').first(), null);
  await db.batch([
    db.prepare('INSERT INTO auth_sessions(id,user_id,expires_at) VALUES(?,?,?)').bind('session', 'alice', 1000),
    db.prepare('UPDATE auth_users SET display_name=? WHERE id=?').bind('Alice updated', 'alice'),
  ]);
  assert.equal((await db.prepare('SELECT * FROM auth_sessions').all()).results.length, 1);
  assert.deepEqual(await db.prepare('DELETE FROM auth_sessions WHERE id=? RETURNING id').bind('session').first(), { id: 'session' });
  assert.equal(await db.prepare('SELECT display_name FROM auth_users').first('display_name'), 'Alice updated');
});
