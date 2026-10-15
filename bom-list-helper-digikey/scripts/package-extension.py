"""Build a clean unpacked-extension ZIP from committed source files."""
from pathlib import Path
import json
import subprocess
import zipfile

root = Path.cwd()
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf8'))
folder = root / '.release'
folder.mkdir(exist_ok=True)
slug = '-'.join(manifest['name'].lower().split())
target = folder / f'{slug}-{manifest["version"]}.zip'
paths = subprocess.check_output(['git', 'ls-files', '-z']).decode('utf8').split('\0')
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for relative in paths:
        if not relative or relative.startswith(('.', 'docs/', 'scripts/', 'tests/')):
            continue
        if relative.endswith(('.md', '.log', '.pem', '.crx')) or relative == 'VERSION':
            continue
        path = root / relative
        if path.is_file():
            archive.write(path, relative)
print(target.name)
