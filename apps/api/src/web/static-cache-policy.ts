// Only content-addressed build files are safe to keep across deployments.
const fingerprintedAsset =
  /^assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:css|js|mjs|webp|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/;

export function staticCacheControl(relativePath: string): string {
  return fingerprintedAsset.test(relativePath) ? 'public, max-age=31536000, immutable' : 'no-cache';
}
