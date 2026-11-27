import { getVisiblePages } from './content';

export interface NavItem {
  href: string;
  label: string;
}

// Fixed routes. Pages from the `pages` collection with show_in_nav are appended.
export const FIXED_NAV: NavItem[] = [
  { href: '/', label: 'Hồ sơ đi làm' },
  { href: '/academic-cv', label: 'CV học thuật' },
  { href: '/nghien-cuu', label: 'Nghiên cứu' },
];

export async function getNav(): Promise<NavItem[]> {
  const pages = (await getVisiblePages()).filter((p) => p.data.show_in_nav);
  return [...FIXED_NAV, ...pages.map((p) => ({ href: `/p/${p.data.slug}`, label: p.data.title }))];
}
