"""Independent extension versions and clean install ZIPs; standard library only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SLUGS = ('bom-list-helper-digikey', 'pcb-guard', 'unit-converter', 'viewer-helper-github')

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf8').strip()

def version(value):
    if not re.fullmatch(r'\d+\.\d+\.\d+', value):
        raise ValueError('Expected MAJOR.MINOR.PATCH: ' + value)
    return tuple(map(int, value.split('.')))

def tags_for(slug):
    prefix = slug + '-v'
    return sorted((t for t in git('tag', '--list', prefix + '*').splitlines()
                   if re.fullmatch(re.escape(prefix) + r'\d+\.\d+\.\d+', t)),
                  key=lambda t: version(t[len(prefix):]))

def runtime_file(name):
    p = Path(name)
    return (not any(part.startswith('.') for part in p.parts)
            and p.parts[0] not in ('docs', 'scripts', 'tests', 'node_modules', '_metadata')
            and p.suffix.lower() not in ('.md', '.log', '.pem', '.crx')
            and name != 'VERSION')

def source_tree(slug, ref):
    # Imported release tags retain their original repository layout/history.
    paths = git('ls-tree', '--name-only', ref).splitlines()
    return ref + ':' + slug if slug in paths else ref + '^{tree}'

def changed(slug, tag, ref='HEAD'):
    paths = git('diff', '--name-only', source_tree(slug, tag), ref + ':' + slug).splitlines()
    return any(runtime_file(p) or p == 'VERSION' for p in paths)

def package(slug, ref='HEAD', destination=None):
    tree = source_tree(slug, ref)
    # git show accepts <tree-ish>:<path>; normalize the tree object first.
    tree_sha = git('rev-parse', tree)
    manifest = json.loads(subprocess.check_output(['git', 'show', tree_sha + ':manifest.json'], cwd=ROOT))
    folder = Path(destination) if destination else ROOT / '.release'
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f'{slug}-{manifest["version"]}.zip'
    names = subprocess.check_output(['git', 'ls-tree', '-rz', '--name-only', tree_sha], cwd=ROOT).decode('utf8').split('\0')
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(filter(None, names)):
            if runtime_file(name):
                data = subprocess.check_output(['git', 'show', tree_sha + ':' + name], cwd=ROOT)
                info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, data)
    return target

def api(path, data=None, method=None, binary=False):
    url = path if path.startswith('https://') else 'https://api.github.com' + path
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None,
        method=method, headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
        'Accept': 'application/octet-stream' if binary else 'application/vnd.github+json',
        'Content-Type': 'application/json', 'User-Agent': 'google-extensions-release'})
    with urllib.request.urlopen(req, timeout=120) as response:
        raw = response.read()
        return raw if binary else json.loads(raw) if raw else None

def publish(slug, tag):
    repo = os.environ['GITHUB_REPOSITORY']
    try:
        release = api(f'/repos/{repo}/releases/tags/{tag}')
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        tags = tags_for(slug)
        index = tags.index(tag)
        previous = tags[index - 1] if index else None
        tree = git('rev-parse', source_tree(slug, tag))
        changes = git('diff', '--name-only', source_tree(slug, previous), tree) if previous else 'Initial release'
        notes = f'## {slug}\n\nBağımsız eklenti sürümü. Kurulum ZIP’ini açıp manifest.json içeren klasörü chrome://extensions üzerinden yükleyin.\n\n### Değişen dosyalar\n' + '\n'.join('- `' + p + '`' for p in changes.splitlines())
        release = api(f'/repos/{repo}/releases', {'tag_name': tag, 'name': slug + ' ' + tag.split('-v')[-1],
            'body': notes, 'draft': False, 'prerelease': False, 'make_latest': 'false'}, 'POST')
    target = package(slug, tag)
    data = target.read_bytes()
    assets = {a['name']: a for a in release['assets']}
    if target.name not in assets:
        from urllib.parse import quote
        req = urllib.request.Request(release['upload_url'].split('{')[0] + '?name=' + quote(target.name),
            data=data, method='POST', headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
            'Content-Type': 'application/zip', 'User-Agent': 'google-extensions-release'})
        with urllib.request.urlopen(req, timeout=120) as response:
            asset = json.load(response)
    else:
        asset = assets[target.name]
    remote = api(asset['url'], binary=True)
    if hashlib.sha256(remote).digest() != hashlib.sha256(data).digest():
        raise RuntimeError('Release ZIP differs: ' + target.name)
    print('Published and verified:', tag, flush=True)

def release(selected):
    git('fetch', 'origin', 'main', '--tags')
    if git('rev-parse', 'HEAD') != git('rev-parse', 'origin/main'):
        print('Newer main exists; its workflow will publish changes.')
        return
    if git('status', '--porcelain', '--untracked-files=no'):
        raise RuntimeError('Release checkout has tracked modifications')
    planned = []
    for slug in SLUGS:
        latest = tags_for(slug)
        previous = latest[-1] if latest else None
        if selected not in ('auto', slug):
            continue
        if selected == 'auto' and previous and not changed(slug, previous):
            continue
        current = version((ROOT / slug / 'VERSION').read_text().strip())
        prior = version(previous[len(slug) + 2:]) if previous else None
        next_version = current if prior is None or current > prior else (*prior[:2], prior[2] + 1)
        number = '.'.join(map(str, next_version))
        (ROOT / slug / 'VERSION').write_text(number + '\n', encoding='utf8')
        manifest_path = ROOT / slug / 'manifest.json'
        manifest = json.loads(manifest_path.read_text(encoding='utf8'))
        manifest['version'] = number
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
        git('add', slug + '/VERSION', slug + '/manifest.json')
        planned.append((slug, slug + '-v' + number))
    if planned:
        git('config', 'user.name', 'github-actions[bot]')
        git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
        git('commit', '--allow-empty', '-m', 'chore: release ' + ', '.join(t for _, t in planned) + ' [skip ci]')
        for _, tag in planned:
            git('tag', tag)
        git('push', '--atomic', 'origin', 'HEAD:main', *(t for _, t in planned))
    # Repair interrupted publication without issuing a new version.
    for slug in SLUGS:
        for tag in tags_for(slug):
            try:
                found = api(f'/repos/{os.environ["GITHUB_REPOSITORY"]}/releases/tags/{tag}')
            except urllib.error.HTTPError as error:
                if error.code != 404:
                    raise
                found = None
            if (slug, tag) in planned or found is None or not found['assets']:
                publish(slug, tag)
    if not planned:
        print('No runtime changes; existing extension versions retained.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    pack = sub.add_parser('package')
    pack.add_argument('extension', choices=SLUGS)
    pack.add_argument('--ref', default='HEAD')
    pub = sub.add_parser('release')
    pub.add_argument('--extension', choices=('auto', *SLUGS), default='auto')
    args = parser.parse_args()
    if args.command == 'package':
        print(package(args.extension, args.ref))
    else:
        release(args.extension)
