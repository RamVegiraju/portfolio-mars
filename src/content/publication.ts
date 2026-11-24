/** Public lists, article routes, and feeds must share this publication rule. */
export function isPublished(
  data: { draft?: boolean; date: Date },
  now: Date = new Date(),
): boolean {
  return data.draft === false && data.date.getTime() <= now.getTime();
}
