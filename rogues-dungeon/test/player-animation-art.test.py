"""Regression checks for the art acceptance boundary."""
import importlib.util
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

path=Path(__file__).resolve().parents[2]/'scripts/validate-player-animation-art.py'
spec=importlib.util.spec_from_file_location('player_art_validation',path)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class PixelPreservationTests(unittest.TestCase):
    def setUp(self):
        self.source=Image.new('RGBA',(4,4),(28,28,37,255))
        self.palette={(28,28,37,255),(107,68,54,255)}
        self.mask=Image.new('L',(4,4));self.mask.putpixel((3,3),255)

    def test_bounded_repair_passes(self):
        changed=self.source.copy();changed.putpixel((3,3),(107,68,54,255))
        self.assertEqual(module.verify_frame(self.source,changed,self.mask,self.palette),1)

    def test_protected_pixel_change_fails(self):
        changed=self.source.copy();changed.putpixel((0,0),(107,68,54,255))
        with self.assertRaisesRegex(ValueError,'Protected'):module.verify_frame(self.source,changed,self.mask,self.palette)

    def test_translucent_generated_haze_fails(self):
        changed=self.source.copy();changed.putpixel((3,3),(107,68,54,20))
        with self.assertRaisesRegex(ValueError,'Partial alpha'):module.verify_frame(self.source,changed,self.mask,self.palette)

    def test_new_palette_color_fails(self):
        changed=self.source.copy();changed.putpixel((3,3),(255,0,255,255))
        with self.assertRaisesRegex(ValueError,'palette'):module.verify_frame(self.source,changed,self.mask,self.palette)

    def test_canvas_mismatch_fails(self):
        with self.assertRaisesRegex(ValueError,'dimensions'):module.verify_frame(self.source,Image.new('RGBA',(5,4)),self.mask,self.palette)


class LibraryIntegrityTests(unittest.TestCase):
    def setUp(self):
        workspace=path.parents[1].resolve()
        (workspace/'output').mkdir(exist_ok=True)
        temporary=tempfile.TemporaryDirectory(prefix='player-art-test-',dir=workspace/'output')
        self.root=Path(temporary.name).resolve()
        self.root.relative_to(workspace/'output')
        self.addCleanup(temporary.cleanup)
        self.doc=self.root/'art-evidence';self.doc.mkdir()
        source=Image.new('RGBA',(4,4),(28,28,37,255))
        source.save(self.root/'source.png');source.save(self.root/'shadow.png')
        Image.new('L',(4,4)).save(self.root/'repair-mask.png')
        encoded=hashlib.sha256((self.root/'source.png').read_bytes()).hexdigest()
        inventory={'frames':[{'id':'idle/down/0','path':'source.png','encodedSha256':encoded}],
                   'shadow':{'path':'shadow.png','sha256':encoded}}
        self.report={'frames':[{'appearance':appearance,'id':'idle/down/0',
            'file':'source.png','mask':'repair-mask.png','changedPixels':0,
            'pixelHash':hashlib.sha256(source.tobytes()).hexdigest()}
            for appearance in ['sword-only','shield-only','unarmed']]}
        (self.doc/'source-inventory.json').write_text(json.dumps(inventory))
        self.write_report()
        replacement=patch.multiple(module,ROOT=self.root,DOC=self.doc)
        replacement.start();self.addCleanup(replacement.stop)

    def write_report(self):
        (self.doc/'manual-pixel-repair-validation.json').write_text(json.dumps(self.report))

    def test_missing_variant_frame_fails(self):
        self.report['frames'].pop();self.write_report()
        with self.assertRaisesRegex(ValueError,'Missing variant frame'):
            module.validate()

    def test_modified_original_png_bytes_fail(self):
        source=self.root/'source.png'
        source.write_bytes(source.read_bytes()+b'changed')
        with self.assertRaisesRegex(ValueError,'Original PNG bytes changed'):
            module.validate()


if __name__=='__main__':unittest.main()
