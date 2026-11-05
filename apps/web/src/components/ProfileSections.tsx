import type { GetProfileQuery } from '../api/generated/sdk';
export type PublicProfile = NonNullable<GetProfileQuery['profile']>;
export function ExternalLink({ url, children }: { url: string | null; children: React.ReactNode }) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
