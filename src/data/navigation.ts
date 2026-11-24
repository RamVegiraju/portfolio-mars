import { interests } from './interests.json';

/** Interest pages and their navigation links come from the same editable list. */
export const navigation = [
  { href: '/', title: 'Home', key: 'home' },
  { href: '/professional/', title: 'Professional', key: 'professional' },
  ...interests.map(interest => ({ href: `/${interest.slug}/`, title: interest.title, key: interest.slug })),
  { href: '/writing/', title: 'Writing', key: 'writing' },
  { href: '/videos/', title: 'Videos', key: 'videos' },
];
