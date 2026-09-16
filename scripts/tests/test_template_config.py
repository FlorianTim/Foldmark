"""Regression tests for template configuration and safe HTML generation."""

from copy import deepcopy
from pathlib import Path
import json
import unittest

from scripts.template_config import (
    TemplateConfigError,
    format_generated_json,
    format_html_attribute,
    resolve_custom_domain,
    update_index_html,
    validate_config,
)

ROOT = Path(__file__).resolve().parents[2]


class TemplateConfigTests(unittest.TestCase):
    """Covers validation and the HTML trust boundary used by the initializer."""

    def setUp(self) -> None:
        self.config = json.loads((ROOT / "template.config.json").read_text(encoding="utf-8"))

    def test_accepts_template_configuration(self) -> None:
        # Derived from the configuration rather than written out: the behaviour
        # under test is "auto resolves to <slug>.<webAppsDomain>", which stays
        # true after an app is initialized and would otherwise fail the moment
        # `npm run template:init` runs.
        application = self.config["application"]
        organization = self.config["organization"]
        expected = f"{application['slug']}.{organization['webAppsDomain']}"

        self.assertEqual(validate_config(self.config), self.config)
        self.assertEqual(resolve_custom_domain(application, organization), expected)

    def test_generated_json_matches_repository_locale_format(self) -> None:
        rendered = format_generated_json(self.config)
        self.assertIn('"supportedLocales": ["de", "en"]', rendered)

    def test_html_attribute_prefers_delimiter_with_fewer_entities(self) -> None:
        self.assertEqual(format_html_attribute('A "quote"'), "'A \"quote\"'")
        self.assertEqual(format_html_attribute("A user's note"), '"A user\'s note"')

    def test_rejects_invalid_slug(self) -> None:
        changed = deepcopy(self.config)
        changed["application"]["slug"] = "Unsafe Slug"
        with self.assertRaises(TemplateConfigError):
            validate_config(changed)

    def test_escapes_html_metadata(self) -> None:
        changed = deepcopy(self.config)
        changed["application"]["name"] = 'Notes <script>alert("x")</script>'
        changed["application"]["description"] = 'Quotes " and <markup>'
        rendered = update_index_html(
            '<html lang="de"><meta name="description" content="old"><title>Old</title>',
            changed["application"],
        )
        self.assertIn("Notes &lt;script&gt;", rendered)
        self.assertIn("content='Quotes \" and &lt;markup&gt;'", rendered)
        self.assertNotIn("<script>", rendered)

    def test_uses_double_quotes_when_description_contains_apostrophe(self) -> None:
        changed = deepcopy(self.config)
        changed["application"]["description"] = "A user's private notes"
        rendered = update_index_html(
            '<meta name="description" content="old">', changed["application"]
        )
        self.assertIn('content="A user\'s private notes"', rendered)


if __name__ == "__main__":
    unittest.main()
