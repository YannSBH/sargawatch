// Connexion à la base SargaWatch (clé publique : peut être dans l'app sans risque, la sécurité est gérée par les règles RLS)
export const SUPABASE_URL = 'https://nisqfhyrzlbhcmleelnu.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_HluUp_vy26zfCcnssYL7mg_YJxZ4Zv4';

// Couleurs de l'app
export const C = {
  sea: '#0A7E9C',
  seaDark: '#075A70',
  seaLight: '#E3F5F8',
  sand: '#FBF4E4',
  sandDark: '#EBCB8B',
  ink: '#1F2A30',
  muted: '#6B7A82',
  line: '#E4E1D8',
  white: '#FFFFFF',
};

// Couleur et icône selon le statut d'une plage
export const STATUS = {
  beautiful: { color: '#00A88F', emoji: '✨' },
  ok: { color: '#3BAA4A', emoji: '🏖️' },
  some: { color: '#E0B000', emoji: '🌿' },
  heavy: { color: '#C46A1A', emoji: '🟤' },
  closed: { color: '#C62828', emoji: '⛔' },
  unknown: { color: '#9AA5AB', emoji: '❔' },
};

export const FLAG_COLORS = {
  green: '#2E9D44',
  yellow: '#F5B700',
  orange: '#F07C00',
  red: '#D32F2F',
  purple: '#7B3FA0',
  none: '#9AA5AB',
};
