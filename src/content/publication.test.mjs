import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublished } from './publication.ts';

const now = new Date('2026-11-24T12:00:00Z');
test('only explicitly published posts at or before build time are public', () => {
  assert.equal(isPublished({ draft: false, date: new Date('2026-11-23') }, now), true);
  assert.equal(isPublished({ draft: false, date: now }, now), true);
  assert.equal(isPublished({ draft: true, date: new Date('2026-11-23') }, now), false);
  assert.equal(isPublished({ date: new Date('2026-11-23') }, now), false);
  assert.equal(isPublished({ draft: false, date: new Date('2026-11-25') }, now), false);
  assert.equal(isPublished({ draft: false, date: new Date('invalid') }, now), false);
});
