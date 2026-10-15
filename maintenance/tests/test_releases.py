import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('extensions', Path(__file__).resolve().parents[1] / 'scripts/extensions.py')
ext = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ext)

class Releases(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / 'repo'
        self.root.mkdir()
        self.root_patch = patch.object(ext, 'ROOT', self.root)
        self.root_patch.start()
        self.run_git('init', '-b', 'main')
        self.run_git('config', 'user.name', 'Test')
        self.run_git('config', 'user.email', 'test@example.invalid')
        for slug in ext.SLUGS:
            p = self.root / slug
            p.mkdir()
            (p / 'manifest.json').write_text(json.dumps({'manifest_version': 3, 'name': slug, 'version': '1.0.0'}))
            (p / 'VERSION').write_text('1.0.0\n')
            (p / 'app.js').write_text('const answer = 42;\n')
            (p / 'README.md').write_text('Documentation')
            for folder in ('docs', 'scripts', 'tests'):
                (p / folder).mkdir()
                (p / folder / 'excluded.js').write_text('test')
        self.commit()
        for slug in ext.SLUGS:
            self.run_git('tag', slug + '-v1.0.0')

    def tearDown(self):
        self.root_patch.stop()
        self.temp.cleanup()

    def run_git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root, stderr=subprocess.DEVNULL).decode().strip()

    def commit(self):
        self.run_git('add', '.')
        self.run_git('commit', '-m', 'Fixture')

    def test_docs_and_siblings_do_not_change_extension(self):
        slug = ext.SLUGS[0]
        (self.root / slug / 'README.md').write_text('Updated documentation')
        (self.root / ext.SLUGS[1] / 'app.js').write_text('const answer = 43;')
        self.commit()
        self.assertFalse(ext.changed(slug, slug + '-v1.0.0'))
        self.assertTrue(ext.changed(ext.SLUGS[1], ext.SLUGS[1] + '-v1.0.0'))

    def test_zip_only_contains_selected_runtime_at_root(self):
        slug = ext.SLUGS[0]
        with zipfile.ZipFile(ext.package(slug)) as z:
            self.assertEqual(set(z.namelist()), {'manifest.json', 'app.js'})
            self.assertEqual(json.loads(z.read('manifest.json'))['name'], slug)

    def test_version_tags_are_independent(self):
        self.run_git('tag', ext.SLUGS[1] + '-v99.0.0')
        self.run_git('tag', ext.SLUGS[0] + '-v1.0.9')
        self.run_git('tag', ext.SLUGS[0] + '-v1.0.10')
        self.assertEqual(ext.tags_for(ext.SLUGS[0])[-1], ext.SLUGS[0] + '-v1.0.10')

    def test_imported_tag_original_root_layout(self):
        slug = ext.SLUGS[0]
        self.run_git('tag', '-d', slug + '-v1.0.0')
        tree = self.run_git('rev-parse', 'HEAD:' + slug)
        commit = subprocess.run(['git', 'commit-tree', tree], cwd=self.root, input='Historical release\n', text=True, capture_output=True, check=True).stdout.strip()
        self.run_git('tag', slug + '-v1.0.0', commit)
        self.assertFalse(ext.changed(slug, slug + '-v1.0.0'))
        with zipfile.ZipFile(ext.package(slug, slug + '-v1.0.0')) as z:
            self.assertIn('manifest.json', z.namelist())

    def test_release_updates_only_changed_extension(self):
        remote = Path(self.temp.name) / 'remote.git'
        subprocess.run(['git', 'init', '--bare', str(remote)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.run_git('remote', 'add', 'origin', str(remote))
        slug = ext.SLUGS[1]
        (self.root / slug / 'app.js').write_text('const answer = 43;')
        self.commit()
        self.run_git('push', 'origin', 'main', '--tags')
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'test/collection'}), patch.object(ext, 'api', return_value={'assets': [{'name': 'existing.zip'}]}), patch.object(ext, 'publish') as publish:
            ext.release('auto')
            publish.assert_called_once_with(slug, slug + '-v1.0.1')
        self.assertEqual((self.root / slug / 'VERSION').read_text().strip(), '1.0.1')
        for sibling in set(ext.SLUGS) - {slug}:
            self.assertEqual((self.root / sibling / 'VERSION').read_text().strip(), '1.0.0')
            self.assertEqual(ext.tags_for(sibling), [sibling + '-v1.0.0'])
        self.assertEqual(self.run_git('rev-parse', 'origin/main'), self.run_git('rev-parse', 'HEAD'))

if __name__ == '__main__':
    unittest.main()
