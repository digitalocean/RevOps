import { useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { cn } from './ui/utils';

export type ParsedLink = {
  href: string;
  hostname: string;
  label: string;
};

/** Known hosts → short, user-friendly labels */
const HOST_LABELS: Record<string, string> = {
  'docs.google.com': 'Google Docs',
  'drive.google.com': 'Google Drive',
  'mail.google.com': 'Gmail',
  'calendar.google.com': 'Calendar',
  'meet.google.com': 'Meet',
  'google.com': 'Google',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'outlook.live.com': 'Outlook',
  'outlook.office.com': 'Outlook',
  'office.com': 'Microsoft 365',
  'www.office.com': 'Microsoft 365',
  'teams.microsoft.com': 'Teams',
  'teams.live.com': 'Teams',
  'sharepoint.com': 'SharePoint',
  'microsoft.com': 'Microsoft',
  'login.microsoftonline.com': 'Microsoft',
  'github.com': 'GitHub',
  'gitlab.com': 'GitLab',
  'bitbucket.org': 'Bitbucket',
  'notion.so': 'Notion',
  'figma.com': 'Figma',
  'slack.com': 'Slack',
  'zoom.us': 'Zoom',
  'dropbox.com': 'Dropbox',
  'box.com': 'Box',
  'linkedin.com': 'LinkedIn',
  'atlassian.net': 'Atlassian',
  'jira.com': 'Jira',
  'confluence.com': 'Confluence',
  'digitalocean.com': 'DigitalOcean',
  'cloud.google.com': 'Google Cloud',
  'aws.amazon.com': 'AWS',
  'amazon.com': 'Amazon',
  'apple.com': 'Apple',
  'openai.com': 'OpenAI',
  'chatgpt.com': 'ChatGPT',
};

function friendlyLabel(hostname: string): string {
  const h = hostname.replace(/^www\./i, '').toLowerCase();
  if (HOST_LABELS[h]) return HOST_LABELS[h];
  for (const [key, label] of Object.entries(HOST_LABELS)) {
    if (h === key || h.endsWith(`.${key}`)) return label;
  }
  return h;
}

/** Rough check: looks like host.tld without spaces (for url-type fields) */
function looksLikeBareDomain(s: string): boolean {
  const t = s.trim();
  if (!t || /\s/.test(t)) return false;
  if (t.includes('://')) return false;
  // host.tld or host.sub.tld + optional path
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\/[^\s]*)?$/i.test(t);
}

/**
 * Parse a string as a single navigable URL (whole value).
 * @param allowBareDomain — if true, accept `example.com/path` without scheme (Link / URL fields)
 */
export function parseLinkableUrl(raw: string, allowBareDomain = false): ParsedLink | null {
  const t = raw.trim();
  if (!t) return null;

  let urlStr = t;
  if (!/^https?:\/\//i.test(t)) {
    if (/^www\./i.test(t)) {
      urlStr = `https://${t}`;
    } else if (allowBareDomain && looksLikeBareDomain(t)) {
      urlStr = `https://${t}`;
    } else {
      return null;
    }
  }

  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const hostname = u.hostname;
  if (!hostname) return null;

  return {
    href: u.toString(),
    hostname,
    label: friendlyLabel(hostname),
  };
}

const FAVICON = (host: string) =>
  `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}`;

export function SmartLinkChip({
  parsed,
  className,
  title,
}: {
  parsed: ParsedLink;
  className?: string;
  /** Full URL tooltip */
  title?: string;
}) {
  const [iconFailed, setIconFailed] = useState(false);

  return (
    <a
      href={parsed.href}
      target="_blank"
      rel="noopener noreferrer"
      title={title ?? parsed.href}
      className={cn(
        'inline-flex items-center gap-1.5 max-w-[min(220px,100%)] rounded-md border border-blue-100 bg-blue-50/80 px-1.5 py-0.5 text-xs font-medium text-blue-800',
        'hover:bg-blue-100 hover:border-blue-200 transition-colors',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        {iconFailed ? (
          <Globe className="h-3.5 w-3.5 text-blue-600" aria-hidden />
        ) : (
          <img
            src={FAVICON(parsed.hostname)}
            alt=""
            width={16}
            height={16}
            className="rounded-sm"
            loading="lazy"
            onError={() => setIconFailed(true)}
          />
        )}
      </span>
      <span className="min-w-0 break-words text-left">{parsed.label}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
    </a>
  );
}
