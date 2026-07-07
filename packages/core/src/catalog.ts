// Category catalogue + due-date quick-picks. The icon paths, colours and
// defaults are the approved prototype's, so both apps render identically.

import type { Category, CategoryMeta, DueKey } from './types';

export const META: Record<Category, CategoryMeta> = {
  FOLLOW_UP_VISIT: {
    label: 'Follow-up visit',
    detail: 'Return visit',
    color: '#1E14BE',
    soft: '#EFEDFF',
    due: '1m',
    iconPath:
      'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  },
  LAB_INVESTIGATION: {
    label: 'Lab investigation',
    detail: 'HbA1c blood test',
    color: '#2E9E6B',
    soft: '#E4F7EE',
    due: '1w',
    iconPath: 'M9 2h6M10 2v6.5L5.5 17a3 3 0 0 0 2.7 4.3h7.6A3 3 0 0 0 18.5 17L14 8.5V2M8 14h8',
  },
  SPECIALIST_REFERRAL: {
    label: 'Specialist referral',
    detail: 'Nephrology referral',
    color: '#6165DE',
    soft: '#ECEDFB',
    due: '2w',
    iconPath: 'M4 3v6a4 4 0 0 0 8 0V3M8 15v1a5 5 0 0 0 10 0v-1M18 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  },
  FOLLOW_UP_CALL: {
    label: 'Follow-up call',
    detail: 'Check-in call',
    color: '#C35721',
    soft: '#FBEDE4',
    due: '3d',
    iconPath:
      'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z',
  },
  OTHER: {
    label: 'Other action',
    detail: 'Diet counselling',
    color: '#595959',
    soft: '#F0EFEC',
    due: '1w',
    iconPath:
      'M9 2h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1ZM9 4v2h6V4',
  },
};

export const CATEGORY_ORDER: Category[] = [
  'FOLLOW_UP_VISIT',
  'LAB_INVESTIGATION',
  'SPECIALIST_REFERRAL',
  'FOLLOW_UP_CALL',
  'OTHER',
];

/** Quick-pick due dates. Dates are display labels anchored to the demo "today". */
export const DUE: Record<DueKey, { label: string; date: string }> = {
  '3d': { label: '3 days', date: '9 Jul' },
  '1w': { label: '1 week', date: '13 Jul' },
  '2w': { label: '2 weeks', date: '20 Jul' },
  '1m': { label: '1 month', date: '6 Aug' },
  '3m': { label: '3 months', date: '6 Oct' },
};

/** Worklist filter chips → category (or 'all'). */
export const FILTERS: { label: string; value: Category | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Follow-ups', value: 'FOLLOW_UP_VISIT' },
  { label: 'Investigations', value: 'LAB_INVESTIGATION' },
  { label: 'Referrals', value: 'SPECIALIST_REFERRAL' },
  { label: 'Calls', value: 'FOLLOW_UP_CALL' },
  { label: 'Other', value: 'OTHER' },
];
