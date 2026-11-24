import { z } from 'astro/zod';
import raw from './nyc.json';

const restaurant = z.object({
  name: z.string().trim().min(1),
  cuisine: z.string().trim().min(1),
  neighborhood: z.string().optional(),
  note: z.string().optional(),
  url: z.string().optional(),
});
const nightlife = z.object({
  name: z.string().trim().min(1),
  category: z.enum(['Speakeasies & cocktails', 'Clubs & venues']),
  neighborhood: z.string().optional(),
  note: z.string().optional(),
  url: z.string().optional(),
});
const moment = z.object({ image: z.string().min(1), alt: z.string().min(1), caption: z.string() });

/** Validate editable content at build time; the CMS may omit or null an empty list. */
export const city = z.object({
  intro: z.array(z.string().min(1)).min(1),
  restaurants: z.array(restaurant).nullish().transform(value => value ?? []),
  nightlife: z.array(nightlife).nullish().transform(value => value ?? []),
  moments: z.array(moment).nullish().transform(value => value ?? []),
}).parse(raw);
