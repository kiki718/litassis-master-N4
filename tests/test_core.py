import json
import unittest
from pathlib import Path
from unittest.mock import patch

import server


class LiteratureAssistantCoreTest(unittest.TestCase):
    def test_load_targets_from_enriched_catalog(self):
        targets = server.load_targets()
        self.assertEqual(len(targets), 221)
        self.assertEqual(targets[0].id, "280310048")
        self.assertEqual(targets[0].name, "Procyon")
        self.assertIn("TIC 280310048", targets[0].aliases)

    def test_seed_hotspots_validation_reports_unmatched_ids(self):
        validation = server.validate_hotspots(server.load_seed_hotspots(), server.load_targets())
        self.assertTrue(validation["valid"])
        self.assertEqual(validation["matched_count"], 5)
        self.assertEqual(validation["unmatched_ids"], ["4325", "999999999"])

    def test_light_science_extraction_keeps_evidence_and_blank_parameters(self):
        text = """
# Abstract
We observed Procyon with optical interferometry and spectroscopy.

# Results
The distance is 3.5 pc and the effective temperature is 6500 K. We find that Procyon is a useful calibration target.
"""
        record = server.extract_science_from_text("paper_test", text, "markdown")
        self.assertEqual(record.source, "markdown")
        self.assertTrue(any(item["name"].lower() == "procyon" for item in record.targets))
        self.assertTrue(any(item["name"] == "optical interferometry" for item in record.methods))
        params = {item["name"]: item for item in record.parameters}
        self.assertEqual(params["distance"]["value"], "3.5")
        self.assertEqual(params["temperature"]["value"], "6500")
        self.assertEqual(params["mass"]["value"], "")
        self.assertTrue(record.evidence)

    def test_light_science_extraction_uses_entity_boundaries(self):
        text = """
# ABSTRACT
This allows high-precision characterization of directly imaged exoplanets at medium spectral resolution.

# Data
Atmospheric conditions at the Paranal astronomical site were stable.
"""
        record = server.extract_science_from_text("paper_boundary", text, "markdown")
        names = {item["name"].lower() for item in record.targets}
        self.assertNotIn("chara", names)
        self.assertNotIn("rana", names)
        evidence_keys = {(item["kind"], item["label"], item["section"], item["quote"]) for item in record.evidence}
        self.assertEqual(len(evidence_keys), len(record.evidence))

    def test_target_search_strict_filter_keeps_only_expanded_targets(self):
        context = server.build_target_search_context("Procyon optical interferometry")
        extracted = [
            {"id": "280310048", "name": "Procyon", "matched_catalog_id": "280310048"},
            {"id": "HD_61421", "name": "HD 61421", "matched_catalog_id": None},
            {"id": "HD_100546", "name": "HD 100546", "matched_catalog_id": None},
        ]
        kept, filtered = server.constrain_extracted_targets_for_context(extracted, context)
        kept_names = {item["name"] for item in kept}
        self.assertIn("Procyon", kept_names)
        self.assertIn("HD 61421", kept_names)
        self.assertNotIn("HD 100546", kept_names)
        self.assertEqual(filtered, 1)

    def test_first_present_accepts_list_values(self):
        value = server.first_present({"file_urls": ["https://example.test/upload"]}, ["file_urls"])
        self.assertEqual(value, ["https://example.test/upload"])

    def test_ssl_eof_error_detection(self):
        self.assertTrue(server.is_ssl_eof_error(RuntimeError("EOF occurred in violation of protocol (_ssl.c:2406)")))
        self.assertTrue(server.is_ssl_eof_error(RuntimeError("SSL: UNEXPECTED_EOF_WHILE_READING")))
        self.assertFalse(server.is_ssl_eof_error(RuntimeError("HTTP 403")))

    def test_mineru_oss_put_omits_content_type(self):
        calls = []

        class FakeResponse:
            status = 200

            def read(self):
                return b""

        class FakeConnection:
            def __init__(self, netloc, timeout=0):
                self.netloc = netloc
                self.timeout = timeout

            def putrequest(self, *args, **kwargs):
                calls.append(("putrequest", args, kwargs))

            def putheader(self, *args):
                calls.append(("putheader", args))

            def endheaders(self):
                calls.append(("endheaders",))

            def send(self, body):
                calls.append(("send", body))

            def getresponse(self):
                return FakeResponse()

            def close(self):
                calls.append(("close",))

        with patch.object(server.http.client, "HTTPSConnection", FakeConnection):
            server.mineru_oss_put_bytes("https://example.test/upload?a=1", b"%PDF-1.7")

        header_names = [item[1][0].lower() for item in calls if item[0] == "putheader"]
        self.assertNotIn("content-type", header_names)

    def test_generated_output_contract(self):
        result = server.build_hotspots(limit=2, use_seed=False)
        self.assertTrue(result["validation"]["valid"])
        self.assertEqual(result["validation"]["hotspot_count"], 2)
        for item in result["items"]:
            self.assertIn("id", item)
            self.assertIn("heat", item)
            self.assertIn("papers", item)
            self.assertIn("summary", item)
            self.assertTrue(item["matched"])
        output_file = Path(server.ROOT / server.CONFIG["output_file"])
        self.assertTrue(output_file.exists())
        self.assertIsInstance(json.loads(output_file.read_text(encoding="utf-8")), list)


if __name__ == "__main__":
    unittest.main()
