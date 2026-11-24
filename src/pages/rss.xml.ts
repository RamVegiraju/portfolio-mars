import type { APIRoute } from 'astro';
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isPublished } from '../content/publication';

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('Configure SITE_URL before building the RSS feed.');
  const posts = (await getCollection('posts', ({ data }) => isPublished(data)))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return rss({
    title: 'Ram Vegiraju — Writing',
    description: 'Personal writing, boxing, updates, and occasional notes on AI and machine learning.',
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: post.data.topics,
      link: `/writing/${post.id}/`,
    })),
    customData: '<language>en-us</language>',
  });
};
