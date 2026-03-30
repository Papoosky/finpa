export type PredefinedService = {
  key: string;
  name: string;
  color: string;
  initials: string;
};

export const PREDEFINED_SERVICES: PredefinedService[] = [
  { key: 'claude', name: 'Claude', color: '#D97706', initials: 'CL' },
  { key: 'chatgpt', name: 'ChatGPT', color: '#10A37F', initials: 'GP' },
  { key: 'netflix', name: 'Netflix', color: '#E50914', initials: 'NF' },
  { key: 'spotify', name: 'Spotify', color: '#1DB954', initials: 'SP' },
  { key: 'youtube', name: 'YouTube Premium', color: '#CC0000', initials: 'YT' },
  { key: 'disney', name: 'Disney+', color: '#113CCF', initials: 'D+' },
  { key: 'amazon', name: 'Amazon Prime', color: '#00A8E8', initials: 'PR' },
  { key: 'appletv', name: 'Apple TV+', color: '#555555', initials: 'TV' },
  { key: 'applemusic', name: 'Apple Music', color: '#FC3C44', initials: 'AM' },
  { key: 'icloud', name: 'iCloud+', color: '#3693DF', initials: 'iC' },
  { key: 'github', name: 'GitHub Copilot', color: '#24292E', initials: 'GH' },
  { key: 'microsoft365', name: 'Microsoft 365', color: '#D83B01', initials: 'M3' },
  { key: 'googleone', name: 'Google One', color: '#4285F4', initials: 'G1' },
  { key: 'adobe', name: 'Adobe CC', color: '#FF0000', initials: 'AD' },
  { key: 'notion', name: 'Notion', color: '#000000', initials: 'NT' },
  { key: 'figma', name: 'Figma', color: '#F24E1E', initials: 'FG' },
];

export function getServiceByKey(key: string | null | undefined): PredefinedService | undefined {
  if (!key) return undefined;
  return PREDEFINED_SERVICES.find((s) => s.key === key);
}
