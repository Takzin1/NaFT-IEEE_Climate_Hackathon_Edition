#!/usr/bin/env python3
"""Synthetic-only offline abuse tests. No third-party data or requests."""
import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest
import zipfile

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
            "doi": "10.1234/synthetic", "expected_license_id": "cc-by-4.0", "files": [{
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

    def test_license_requires_explicit_pin(self):
        self.row["expected_license_id"] = None
        with self.assertRaisesRegex(ValueError, "SOURCE_LICENSE_NOT_PINNED_OR_CHANGED"):
            tool.acquire(self.row["id"], self.dir, self.fetcher)
        self.row["expected_license_id"] = "cc0-1.0"
        with self.assertRaisesRegex(ValueError, "SOURCE_LICENSE_NOT_PINNED_OR_CHANGED"):
            tool.acquire(self.row["id"], self.dir, self.fetcher)

    def test_duplicate_and_reserved_filename(self):
        self.row["expected_license_id"] = "cc-by-4.0"
        self.row["files"].append(dict(self.row["files"][0]))
        with self.assertRaisesRegex(ValueError, "DUPLICATE_SOURCE_FILE_NAME"):
            tool.acquire(self.row["id"], self.dir, self.fetcher)
        self.row["files"].pop()
        self.row["files"][0]["filename"] = "acquisition-receipt.json"
        with self.assertRaisesRegex(ValueError, "UNSAFE_FILE_NAME"):
            tool.acquire(self.row["id"], self.dir, self.fetcher)


class CommittedGimjeTests(unittest.TestCase):
    def test_exact_original_files_and_safe_source_zip(self):
        original = (tool.ROOT / "research/ieee-observation-datasets-2026-10-19" /
                    "originals/KR_GIMJE_DAILY_2022_2024")
        result = tool.verify_local("KR_GIMJE_DAILY_2022_2024", original)
        self.assertEqual(result["files_verified"], 2)
        self.assertIsNone(result["certified_tco2e"])
        original_receipt = original / "acquisition-receipt.json"
        with tempfile.TemporaryDirectory() as tmp:
            mirror = pathlib.Path(tmp)
            for path in original.iterdir():
                (mirror / path.name).write_bytes(path.read_bytes())
            truth = json.loads((mirror / "acquisition-receipt.json").read_text("utf-8"))
            for field, forged in [
                ("status", "CERTIFIED_REAL_CH4"),
                ("certified_tco2e", 50000),
                ("scientific_replication_verified", True),
                ("source_specific_qc_completed", True),
                ("independent_original_publisher_signature_authenticated", True),
                ("license_metadata_snapshot_reviewed_for_redistribution", "true"),
                ("record_metadata_sha256", "not-a-hash"),
                ("license_as_claimed_by_zenodo_record", "cc0-1.0")
            ]:
                forged_receipt = {**truth, field: forged}
                (mirror / "acquisition-receipt.json").write_text(json.dumps(forged_receipt))
                with self.assertRaisesRegex(ValueError, "RECEIPT_CONTEXT_OR_TRUST"):
                    tool.verify_local("KR_GIMJE_DAILY_2022_2024", mirror)
            (mirror / "acquisition-receipt.json").write_text(json.dumps(truth))
            target = mirror / "ch4.zip"
            target.unlink()
            target.symlink_to(original / "ch4.zip")
            with self.assertRaisesRegex(ValueError, "ORIGINAL_FILE_UNSAFE_OR_SIZE_MISMATCH"):
                tool.verify_local("KR_GIMJE_DAILY_2022_2024", mirror)
        with zipfile.ZipFile(original / "ch4.zip") as archive:
            entries = archive.infolist()
            csv_members = [x for x in entries if x.filename.lower().endswith(".csv")]
            self.assertEqual(len(csv_members), 60)
            self.assertLessEqual(sum(x.file_size for x in entries), 8_000_000)
            for entry in entries:
                self.assertFalse(entry.filename.startswith("/"))
                self.assertFalse(".." in pathlib.PurePosixPath(entry.filename).parts)
                self.assertLessEqual(entry.file_size, 500_000)
            sample = archive.read(csv_members[0]).splitlines()[0].decode(
                "utf-8-sig", errors="replace").strip()
            self.assertEqual(sample.split(","),
                             ["DAT", "tavg", "course_type", "ch4_flux", "rain_mm"])


if __name__ == "__main__":
    unittest.main()
