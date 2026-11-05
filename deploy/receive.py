#!/usr/bin/env python3
"""Root-owned, forced SSH command. Accepts only card release images and a commit SHA."""
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile

NAMESPACE = 'daniilivanovdev'
ROOT = Path('/var/lib/card-deploy')
TEMPLATE = Path('/etc/card-deploy/template.json')

def validate_archive(path, revision):
    if not re.fullmatch(r'[a-f0-9]{40}', revision):
        raise ValueError('Invalid Git revision')
    allowed = {f'card-runtime:{revision}', f'card-setup:{revision}', 'postgres:17.6-bookworm'}
    def normalized(tag):
        return tag.removeprefix('docker.io/library/')
    with tarfile.open(path, 'r:gz') as archive:
        member = archive.getmember('manifest.json')
        if member.size > 1024 * 1024 or not member.isfile():
            raise ValueError('Invalid Docker manifest')
        manifest = json.load(archive.extractfile(member))
        tags = {normalized(tag) for item in manifest for tag in item.get('RepoTags', [])}
        if tags != allowed:
            raise ValueError('Archive must contain only the three images for this release')
        for name in ('index.json',):
            try:
                index = archive.getmember(name)
            except KeyError:
                continue
            if index.size > 1024 * 1024 or not index.isfile():
                raise ValueError('Invalid OCI index')
            data = json.load(archive.extractfile(index))
            for descriptor in data.get('manifests', []):
                for key, value in descriptor.get('annotations', {}).items():
                    if key in ('io.containerd.image.name', 'org.opencontainers.image.ref.name'):
                        if normalized(value) not in allowed and value not in (revision, '17.6-bookworm'):
                            raise ValueError('Unexpected OCI image reference')

def kubectl(*args, payload=None):
    return subprocess.run(['k3s', 'kubectl', '-n', NAMESPACE, *args], input=payload, text=True, check=True, timeout=420)

def apply(items, dry_run=False):
    args = ['apply', '-f', '-']
    if dry_run:
        args.append('--dry-run=server')
    kubectl(*args, payload=json.dumps({'apiVersion': 'v1', 'kind': 'List', 'items': items}))

def main():
    os.umask(0o077)
    ROOT.mkdir(mode=0o700, exist_ok=True)
    with (ROOT / 'deploy.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        revision = sys.stdin.buffer.readline(128).decode('ascii').strip()
        if not re.fullmatch(r'[a-f0-9]{40}', revision):
            raise ValueError('Expected full Git SHA on the first line')
        with tempfile.TemporaryDirectory(prefix='release-', dir=ROOT) as temporary:
            archive = Path(temporary) / 'images.tar.gz'
            with archive.open('wb') as output:
                size = 0
                while chunk := sys.stdin.buffer.read(1024 * 1024):
                    size += len(chunk)
                    if size > 2 * 1024**3:
                        raise ValueError('Release archive exceeds 2 GiB')
                    output.write(chunk)
            validate_archive(archive, revision)
            subprocess.run(['k3s', 'ctr', 'images', 'import', '--all-platforms', '--no-unpack', str(archive)], check=True, timeout=600)
            document = json.loads(TEMPLATE.read_text().replace('0' * 40, revision).replace('0' * 12, revision[:12]))
            items = document['items']
            job = next(item for item in items if item['kind'] == 'Job')
            app = next(item for item in items if item['kind'] == 'Deployment')
            infrastructure = [item for item in items if item['kind'] not in ('Job', 'Deployment')]
            for batch in (infrastructure, [job], [app]):
                apply(batch, dry_run=True)
            apply(infrastructure)
            kubectl('rollout', 'status', 'statefulset/postgres', '--timeout=180s')
            backups = ROOT / 'backups'
            backups.mkdir(exist_ok=True)
            with (backups / f'{revision}.dump').open('wb') as backup:
                subprocess.run(['k3s', 'kubectl', '-n', NAMESPACE, 'exec', 'postgres-0', '--', 'sh', '-c', 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc'], stdout=backup, check=True, timeout=120)
            apply([job])
            kubectl('wait', '--for=condition=complete', f'job/{job["metadata"]["name"]}', '--timeout=320s')
            apply([app])
            kubectl('rollout', 'status', 'deployment/app', '--timeout=320s')
            (ROOT / 'current-revision').write_text(revision + '\n')
            # Retain the three newest release backups; never delete database volumes.
            for old in sorted(backups.glob('*.dump'), key=lambda p: p.stat().st_mtime, reverse=True)[3:]:
                old.unlink()
            print(f'Release deployed: {revision}', flush=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Deployment failed: {type(error).__name__}: {error}', file=sys.stderr)
        sys.exit(1)
