import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesRestaurant, placeUrl } from '../src/lib/nyc-favorites.ts';

test('restaurant filters combine cuisine with case-insensitive name, neighborhood, and personal-note search', () => {
  const restaurant = { name: 'Example Kitchen', cuisine: 'Thai', neighborhood: 'Murray Hill', note: 'My pick for noodles' };
  assert(matchesRestaurant(restaurant, 'Thai', '  NOODLES  '));
  assert(matchesRestaurant(restaurant, 'All cuisines', 'murray'));
  assert(matchesRestaurant(restaurant, 'Thai', 'example'));
  assert(!matchesRestaurant(restaurant, 'Italian', 'noodles'));
  assert(!matchesRestaurant(restaurant, 'All cuisines', 'pizza'));
});

test('restaurants can be published with only a name and cuisine', () => {
  assert(matchesRestaurant({ name: 'Example', cuisine: 'Indian' }, 'All cuisines', ''));
  assert(!matchesRestaurant({ name: 'Example', cuisine: 'Indian' }, 'All cuisines', 'undefined'));
});

test('optional place links accept web URLs and reject executable, relative, and credential-bearing links', () => {
  assert.equal(placeUrl('https://example.com/menu'), 'https://example.com/menu');
  for (const url of [undefined, '', '/admin/', 'javascript:alert(1)', 'data:text/html,hello', 'https://user:secret@example.com/']) assert.equal(placeUrl(url), undefined);
});
