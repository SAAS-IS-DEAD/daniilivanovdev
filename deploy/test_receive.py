import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from receive import validate_archive

class ArchiveTests(unittest.TestCase):
    def archive(self, tags):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / 'release.tar.gz'
        data = json.dumps([{'RepoTags': tags}]).encode()
        with tarfile.open(path, 'w:gz') as archive:
            info = tarfile.TarInfo('manifest.json')
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
        return path

    def test_only_expected_release_images_are_accepted(self):
        sha = 'a' * 40
        tags = [f'card-runtime:{sha}', f'card-setup:{sha}', 'postgres:17.6-bookworm']
        validate_archive(self.archive(tags), sha)
        for unexpected in ['other-app:latest', f'card-runtime:{"b" * 40}']:
            with self.assertRaises(ValueError):
                validate_archive(self.archive(tags + [unexpected]), sha)

    def test_mutable_revision_and_missing_image_are_rejected(self):
        with self.assertRaises(ValueError):
            validate_archive(self.archive([]), 'latest')
        with self.assertRaises(ValueError):
            validate_archive(self.archive(['postgres:17.6-bookworm']), 'a' * 40)

if __name__ == '__main__':
    unittest.main()
