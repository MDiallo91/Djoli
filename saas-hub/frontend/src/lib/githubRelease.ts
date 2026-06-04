export interface GithubRelease {
  version: string;
  downloadUrl: string;
}

export async function fetchLatestRelease(githubRepo: string): Promise<GithubRelease | null> {
  try {
    const r = await fetch(`https://api.github.com/repos/${githubRepo}/releases/latest`);
    if (!r.ok) return null;
    const data = await r.json();
    const exeAsset = data.assets?.find((a: any) => a.name.endsWith('.exe'));
    if (!exeAsset) return null;
    return {
      version: (data.tag_name ?? '').replace(/^v/, '') || '?',
      downloadUrl: exeAsset.browser_download_url,
    };
  } catch {
    return null;
  }
}
