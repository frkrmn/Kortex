export const SETTINGS_TABS = [
  { id: 'account', label: 'Account' },
  { id: 'billing', label: 'Billing & Plans' },
  { id: 'sources', label: 'Connected Sources' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'data', label: 'Export & Data' },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

const SETTINGS_TAB_IDS = new Set<string>(SETTINGS_TABS.map(tab => tab.id));
const SETTINGS_TAB_ALIASES: Record<string, SettingsTabId> = {
  subscription: 'billing',
};

export function resolveSettingsTab(value: string | null | undefined): SettingsTabId {
  if (!value) return 'account';
  if (SETTINGS_TAB_ALIASES[value]) return SETTINGS_TAB_ALIASES[value];
  return SETTINGS_TAB_IDS.has(value) ? value as SettingsTabId : 'account';
}

export function settingsTabUrl(tab: SettingsTabId) {
  return `/settings?tab=${tab}`;
}

export function isCanonicalSettingsTab(value: string | null | undefined): value is SettingsTabId {
  return Boolean(value && SETTINGS_TAB_IDS.has(value));
}

