export type RenewalApiConfig =
  | { readonly type: 'unconfigured' }
  | {
      readonly type: 'configured';
      readonly functionsBaseUrl: string;
      readonly anonKey: string;
    };

export const renewalApiConfig = {
  type: 'configured',
  functionsBaseUrl: 'https://usoaclcqxaxiusfiedfh.supabase.co/functions/v1',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb2FjbGNxeGF4aXVzZmllZGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Njg1MjUsImV4cCI6MjA5OTE0NDUyNX0.knxDLP5_01bEaN3tY_I2g73Ay9JWhUyUXSquIJaV00E',
} as const satisfies RenewalApiConfig;

export function isRenewalApiConfigured(
  config: RenewalApiConfig,
): config is Extract<RenewalApiConfig, { readonly type: 'configured' }> {
  return config.type === 'configured' && config.functionsBaseUrl !== '' && config.anonKey !== '';
}
