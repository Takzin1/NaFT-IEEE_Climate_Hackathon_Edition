#!/usr/bin/env python3
"""Synthetic-only offline abuse tests. No third-party data or requests."""
import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest

path = pathlib.Path(__file__).resolve().parent.parent / "scripts/ieee-research-original-acquire.py"
spec = importlib.util.spec_from_file_location("research_original_acquire", path)
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


class IntakeTests(unittest.TestCase):
    def setUp(self):
        self.raw = b"start_utc,end_utc,value,qc_status\\nSYNTHETIC,ONLY,0,OBSERVED_GOOD\\n"
        self.md5 = hashlib.md5(self.raw).hexdigest()
        self.sha = hashlib.sha256(self.raw).hexdigest()
        self.row = {
            "id": "SYNTHETIC_ZENODO_TEST", "source": "ZENODO", "record_id": "123",
            "doi": "10.1234/synthetic", "files": [{
                "filename": "synthetic.csv", "published_md5": self.md5,
                "previous_ephemeral_sha256": self.sha,
                "expected_size_bytes": len(self.raw)}]
        }
        self.old_loader = tool.load_catalog
        tool.load_catalog = lambda: {"schema": "naft-ieee-external-rice-observation-intake-v1",
                                     "datasets": [self.row]}
        self.record = {
            "id": 123, "doi": "10.1234/synthetic",
            "access": {"status": "open"},
            "metadata": {"rights": [{"id": "cc-by-4.0"}]},
            "files": {"entries": {"synthetic.csv": {
                "key": "synthetic.csv", "checksum": "md5:" + self.md5,
                "size": len(self.raw)}}}
        }
        self.temp = tempfile.TemporaryDirectory()
        self.dir = pathlib.Path(self.temp.name) / "originals"

    def tearDown(self):
        tool.load_catalog = self.old_loader
        self.temp.cleanup()

    def fetcher(self, url, limit):
        self.assertTrue(url.startswith("https://zenodo.org/api/records/123"))
        return (json.dumps(self.record).encode() if url.endswith("/123") else self.raw)

    def test_valid_original_and_reverification(self):
        proof = tool.acquire(self.row["id"], self.dir, self.fetcher)
        self.assertEqual(proof["status"], "PUBLISHER_RECORD_CHECKSUM_AND_PREVIOUS_SHA_MATCHED")
        self.assertEqual(proof["license_as_claimed_by_zenodo_record"], "cc-by-4.0")
        self.assertFalse(proof["source_specific_qc_completed"])
        self.assertIsNone(proof["certified_tco2e"])
        self.assertEqual(tool.verify_local(self.row["id"], self.dir)["files_verified"], 1)
        with self.assertRaisesRegex(ValueError, "OUTPUT_ALREADY_EXISTS"):
            tool.acquire(self.row["id"], self.dir, self.fetcher)
        (self.dir / "synthetic.csv").write_bytes(self.raw + b"tamper")
        with self.assertRaisesRegex(ValueError, "ORIGINAL_FILE_CHANGED"):
            tool.verify_local(self.row["id"], self.dir)

    def test_refuse_ambiguous_and_disallowed_license(self):
        for rights in ([], [{"id": "cc-by-nc-4.0"}],
                       [{"id": "cc-by-4.0"}, {"id": "cc0-1.0"}]):
            self.record["metadata"]["rights"] = rights
            with self.assertRaisesRegex(ValueError, "LICENSE_UNVERIFIED_OR_NOT_REDISTRIBUTABLE"):
                tool.acquire(self.row["id"], self.dir, self.fetcher)
            self.assertFalse(self.dir.exists())

    def test_refuse_changed_remote_identity_and_bad_byte_hash(self):
        self.record["id"] = 456
        with self.assertRaisesRegex(ValueError, "ZENODO_RECORD_ID_CHANGED"):
            tool.acquire(self.row["id"], self.dir, self.fetcher)
        self.record["id"] = 123
        self.record["files"]["entries"]["synthetic.csv"]["checksum"] = "md5:" + "0"*32
        with self.assertRaisesRegex(ValueError, "ZENODO_FILE_METADATA_MD5_MISMATCH"):
            tool.acquire(self.row["id"], self.dir, self.fetcher)
        self.record["files"]["entries"]["synthetic.csv"]["checksum"] = "md5:" + self.md5
        self.row["files"][0]["previous_ephemeral_sha256"] = "0"*64
        with self.assertRaisesRegex(ValueError, "PUBLISHER_AND_PREVIOUS_CHECKSUM_MISMATCH"):
            tool.acquire(self.row["id"], self.dir, self.fetcher)

    def test_refuse_unsafe_or_portal_sources(self):
        self.row["source"] = "FLUXNET_PORTAL_FORM_REQUIRED"
        with self.assertRaisesRegex(ValueError, "PORTAL_OR_MANUAL_DOWNLOAD_REQUIRED"):
            tool.acquire(self.row["id"], self.dir, self.fetcher)
        self.row["source"] = "ZENODO"
        self.row["files"][0]["filename"] = "../bad.csv"
        with self.assertRaisesRegex(ValueError, "UNSAFE_FILE_NAME"):
            tool.acquire(self.row["id"], self.dir, self.fetcher)

    def test_refuse_nonpublisher_network_addresses(self):
        with self.assertRaisesRegex(ValueError, "NON_ZENODO_URL"):
            tool.fetch_bytes("https://example.com/data", 100)


if __name__ == "__main__":
    unittest.main()
