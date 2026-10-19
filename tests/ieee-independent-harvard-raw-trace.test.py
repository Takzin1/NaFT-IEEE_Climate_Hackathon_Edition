#!/usr/bin/env python3
"""Real pinned Harvard raw instrument trace: positive and negative trust gates."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parent.parent
file=ROOT/"scripts/ieee-independent-harvard-raw-trace.py"
spec=importlib.util.spec_from_file_location("harvard_trace_source",file)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class TestHarvardSource(unittest.TestCase):
    def test_source_identity_raw_concentration_and_blocked_measurement_event(self):
        a=mod.analyze()
        self.assertEqual(a,mod.analyze())
        self.assertEqual(a["source"]["rank"],"B+")
        self.assertEqual(a["source"]["raw_trace_rows"],35)
        self.assertEqual(a["source"]["source_event_key_rows"],24)
        self.assertEqual(a["source"]["literal_alarm_status_counts"],{"2":35})
        self.assertEqual(a["source"]["key_event_overlaps"],[])
        self.assertEqual(a["provenance"]["raw_original_git_blob"],mod.RAW_BLOB)
        self.assertEqual(a["provenance"]["event_key_original_git_blob"],mod.KEY_BLOB)
        self.assertEqual(len(a["provenance"]["raw_sha256"]),64)
        self.assertEqual(len(a["provenance"]["event_key_sha256"]),64)
        self.assertEqual(a["status"],"PINNED_EXTERNAL_RAW_TRACE_DESCRIPTIVE_CALCULATION_ONLY")
        self.assertFalse(a["human_acceptance_gates"]["chamber_flux_eligible"])
        self.assertFalse(a["human_acceptance_gates"]["Gimje_field_validation"])
        self.assertIsNone(a["human_acceptance_gates"]["certified_tco2e"])
        self.assertTrue(a["independent_numerical_replay"]["no_physical_flux_units"])

    def test_instrument_record_tampering_or_event_key_tampering_fail_closed(self):
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)
            source=folder/"Picarro.dat"
            source.write_bytes(mod.RAW.read_bytes())
            self.assertEqual(mod.analyze(raw_path=source)["source"]["raw_trace_rows"],35)
            source.write_bytes(source.read_bytes().replace(b"1.9267950493E+00",b"1.8267950493E+00"))
            with self.assertRaisesRegex(ValueError,"SOURCE_GIT_BLOB_DRIFT"):
                mod.analyze(raw_path=source)
            key=folder/"times.csv"
            key.write_bytes(mod.KEY.read_bytes()+b"extra")
            with self.assertRaisesRegex(ValueError,"SOURCE_GIT_BLOB_DRIFT"):
                mod.analyze(key_path=key)

    def test_corrupted_time_and_channel_values_never_produce_signed_flux(self):
        data=mod.RAW.read_text("ascii")
        lines=data.strip().splitlines()
        rows=mod.parse_raw(data)
        self.assertEqual(len(rows),35)
        second=lines[2].split()
        second[1]=lines[1].split()[1]
        lines[2]=" ".join(second)
        with self.assertRaisesRegex(ValueError,"TIMESTAMP_NONINCREASING"):
            mod.parse_raw("\n".join(lines))
        broken=data.replace("1.9267950493E+00","NaN",1)
        with self.assertRaisesRegex(ValueError,"NONFINITE"):
            mod.parse_raw(broken)
        malformed=data.replace("CH4_dry","not_CH4",1)
        with self.assertRaisesRegex(ValueError,"RAW_SCHEMA_OR_ROW_COUNT"):
            mod.parse_raw(malformed)

    def test_event_key_bad_intervals_and_null_volume_rejected(self):
        key=mod.KEY.read_text("ascii")
        with self.assertRaisesRegex(ValueError,"NONPOSITIVE_REPLICATE_VOLUME"):
            mod.parse_event_key(key.replace("0.051522076","0",1))
        with self.assertRaisesRegex(ValueError,"EVENT_KEY_LENGTH"):
            mod.parse_event_key("\n".join(key.strip().splitlines()[:-1])+"\n")


if __name__=="__main__":
    unittest.main()
