export interface Restaurant {
  name: string;
  cuisine: string;
  neighborhood?: string;
  note?: string;
  url?: string;
}
export interface NightlifePlace {
  name: string;
  category: 'Speakeasies & cocktails' | 'Clubs & venues';
  neighborhood?: string;
  note?: string;
  url?: string;
}
export interface CityMoment {
  image: string;
  alt: string;
  caption: string;
}

/** Only web links are allowed in optional outbound place URLs. */
export function placeUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function matchesRestaurant(restaurant: Restaurant, cuisine: string, query: string): boolean {
  return (cuisine === 'All cuisines' || restaurant.cuisine === cuisine)
    && `${restaurant.name} ${restaurant.cuisine} ${restaurant.neighborhood || ''} ${restaurant.note || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}
