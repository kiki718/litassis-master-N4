import json
import unittest
from pathlib import Path

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
