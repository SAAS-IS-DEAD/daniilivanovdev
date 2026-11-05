import assert from 'node:assert/strict';
import { test } from 'node:test';
import { text, optionalText, webUrl, calendarDate, order } from '../../src/common/validation.js';

test('text boundaries use code points and trim only content', () => {
  assert.equal(text('  🦊 ', 'name', 1), '🦊');
  assert.throws(() => text('  ', 'name', 120));
  assert.throws(() => text('ab', 'name', 1));
  assert.equal(optionalText('  ', 'description', 5000), null);
});
test('only absolute HTTP URLs are accepted', () => {
  assert.equal(webUrl('https://example.org', 'url'), 'https://example.org/');
  for (const value of ['javascript:alert(1)', '/relative', 'file:///etc/passwd'])
    assert.throws(() => webUrl(value, 'url'));
  assert.equal(webUrl(null, 'url'), null);
});
test('calendar dates reject invalid dates and future dates in UTC', () => {
  const today = new Date('2026-11-04T00:00:00Z');
  assert.equal(calendarDate('2024-02-29', 'date', today).toISOString(), '2024-02-29T00:00:00.000Z');
  for (const value of ['2025-02-29', '2026-11-05', '2024-01-01T00:00:00Z', '2024-13-01'])
    assert.throws(() => calendarDate(value, 'date', today));
});
test('order accepts only bounded integers', () => {
  assert.equal(order(0), 0);
  assert.equal(order(9999), 9999);
  for (const value of [-1, 10000, 0.5, NaN]) assert.throws(() => order(value));
});
