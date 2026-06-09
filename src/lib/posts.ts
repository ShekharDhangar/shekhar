import { getCollection, type CollectionEntry } from 'astro:content';

export type PostCollection = 'blogs' | 'learnings';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
};

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', DATE_FORMAT);
}

/** Posts in a collection, newest first. */
export async function getSortedPosts<C extends PostCollection>(
  collection: C,
): Promise<CollectionEntry<C>[]> {
  const posts = await getCollection(collection);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
