"""Shared validation and rendering helpers for template configuration."""

from __future__ import annotations

from html import escape
from pathlib import Path
import json
import re
from typing import Any
from urllib.parse import urlparse

SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PACKAGE_PATTERN = re.compile(r"^(?:@[a-z0-9._-]+/)?[a-z0-9._-]+$")
SEMVER_PATTERN = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$"
)
THEMES = {"system", "light", "dark", "paper", "sepia", "high-contrast", "ocean"}
LOCALES = {"de", "en"}


class TemplateConfigError(ValueError):
    """Raised when template configuration violates the public contract."""


def _require_string(container: dict[str, Any], key: str, maximum: int) -> str:
    value = container.get(key)
    if not isinstance(value, str) or not value.strip():
        raise TemplateConfigError(f"{key} must be a non-empty string")
    if len(value) > maximum:
        raise TemplateConfigError(f"{key} must contain at most {maximum} characters")
    return value


def _require_exact_keys(container: dict[str, Any], expected: set[str], label: str) -> None:
    actual = set(container)
    if actual != expected:
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        raise TemplateConfigError(f"{label} keys differ; missing={missing}, extra={extra}")


def load_config(path: Path) -> dict[str, Any]:
    """Loads UTF-8 JSON and validates the complete template configuration."""

    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise TemplateConfigError(f"Cannot read valid JSON from {path}: {exc}") from exc
    return validate_config(value)


def validate_config(value: Any) -> dict[str, Any]:
    """Validates structural, length, identifier and URL constraints without dependencies."""

    if not isinstance(value, dict):
        raise TemplateConfigError("configuration root must be an object")
    _require_exact_keys(value, {"template", "organization", "application", "features"}, "root")

    template = value.get("template")
    organization = value.get("organization")
    application = value.get("application")
    features = value.get("features")
    if not all(isinstance(item, dict) for item in (template, organization, application, features)):
        raise TemplateConfigError("template, organization, application and features must be objects")

    assert isinstance(template, dict)
    assert isinstance(organization, dict)
    assert isinstance(application, dict)
    assert isinstance(features, dict)

    _require_exact_keys(template, {"id", "version", "demo"}, "template")
    if template != {"id": "lambro-web-app-template", "version": "1.0.0", "demo": "todo"}:
        raise TemplateConfigError("template identity, version and demo must match the published template")

    _require_exact_keys(
        organization,
        {"name", "domain", "url", "webAppsDomain", "contactLocalParts"},
        "organization",
    )
    if organization != {
        "name": "LumbreCode",
        "domain": "lumbrecode.de",
        "url": "https://lumbrecode.de",
        "webAppsDomain": "webapps.lumbrecode.de",
        "contactLocalParts": {
            "contact": "Y29udGFjdA==",
            "support": "c3VwcG9ydA==",
            "feedback": "ZmVlZGJhY2s=",
            "bugs": "YnVncw==",
            "privacy": "cHJpdmFjeQ==",
            "security": "c2VjdXJpdHk=",
        },
    }:
        raise TemplateConfigError("organization must match the LumbreCode template identity")

    application_keys = {
        "name",
        "shortName",
        "slug",
        "description",
        "packageName",
        "version",
        "defaultLocale",
        "supportedLocales",
        "repositoryOwner",
        "repositoryName",
        "githubPagesBase",
        "customDomain",
        "theme",
        "license",
    }
    _require_exact_keys(application, application_keys, "application")
    name = _require_string(application, "name", 100)
    _require_string(application, "shortName", 40)
    slug = _require_string(application, "slug", 100)
    _require_string(application, "description", 200)
    package_name = _require_string(application, "packageName", 214)
    version = _require_string(application, "version", 50)
    _require_string(application, "repositoryOwner", 100)
    _require_string(application, "repositoryName", 100)
    _require_string(application, "githubPagesBase", 200)
    _require_string(application, "license", 100)
    if not SLUG_PATTERN.fullmatch(slug):
        raise TemplateConfigError("application.slug must be kebab-case")
    if not PACKAGE_PATTERN.fullmatch(package_name):
        raise TemplateConfigError("application.packageName must be a valid lowercase npm package name")
    if not SEMVER_PATTERN.fullmatch(version):
        raise TemplateConfigError("application.version must be semantic versioning")
    if application.get("defaultLocale") not in LOCALES:
        raise TemplateConfigError("application.defaultLocale must be de or en")
    locales = application.get("supportedLocales")
    if not isinstance(locales, list) or set(locales) != LOCALES or len(locales) != len(LOCALES):
        raise TemplateConfigError("application.supportedLocales must contain de and en exactly once")
    if application.get("theme") not in THEMES:
        raise TemplateConfigError("application.theme is unsupported")
    custom_domain = application.get("customDomain")
    if not isinstance(custom_domain, str) or len(custom_domain) > 253:
        raise TemplateConfigError("application.customDomain must be a hostname string")
    if custom_domain not in {"", "auto"} and (
        urlparse(f"https://{custom_domain}").hostname != custom_domain
    ):
        raise TemplateConfigError("application.customDomain must be a plain hostname")
    if not name.strip():
        raise TemplateConfigError("application.name must not be blank")

    for feature, enabled in features.items():
        if not isinstance(feature, str) or not isinstance(enabled, bool):
            raise TemplateConfigError("feature names must map to boolean values")

    return value


def resolve_custom_domain(application: dict[str, Any], organization: dict[str, Any]) -> str:
    """Resolves the public hostname without accepting paths, schemes or ports."""

    configured = str(application["customDomain"])
    if configured == "auto":
        return f'{application["slug"]}.{organization["webAppsDomain"]}'
    return configured


def format_generated_json(value: object) -> str:
    """Renders repository JSON with the compact locale tuple expected by Prettier."""

    content = json.dumps(value, indent=2, ensure_ascii=False) + "\n"
    return re.sub(
        r'"supportedLocales": \[\s*"([^"]+)",\s*"([^"]+)"\s*\]',
        r'"supportedLocales": ["\1", "\2"]',
        content,
    )


def format_html_attribute(value: object) -> str:
    """Escapes an HTML attribute and chooses the delimiter that needs fewer entities."""

    raw_value = str(value)
    escaped_value = escape(raw_value, quote=False)
    if raw_value.count('"') > raw_value.count("'"):
        return f"'{escaped_value.replace("'", "&#39;")}'"
    return f'"{escaped_value.replace(chr(34), "&quot;")}"'


def update_index_html(index: str, application: dict[str, Any]) -> str:
    """Updates document metadata while escaping configuration as HTML text and attributes."""

    language = escape(str(application["defaultLocale"]), quote=True)
    description_attribute = format_html_attribute(application["description"])
    title = escape(str(application["name"]), quote=False)
    index = re.sub(r'<html lang="[^"]+">', f'<html lang="{language}">', index, count=1)
    index = re.sub(
        r'(<meta\s+name="description"\s+content=)(?:"[^"]*"|\'[^\']*\')',
        lambda match: f"{match.group(1)}{description_attribute}",
        index,
        count=1,
    )
    return re.sub(r"<title>.*?</title>", f"<title>{title}</title>", index, count=1)
