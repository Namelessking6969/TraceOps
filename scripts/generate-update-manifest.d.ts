export function generateManifest(
  version: string,
  notes: string,
  artifacts: Record<string, { url: string; signature: string }>
): {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, { url: string; signature: string }>;
};
