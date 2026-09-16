# Proposal: Fix product metadata in the About view

Status: Accepted (1.0.x hotfix)

## Motivation

The About view still says "About this template" and the intro says the app "was built from the
LumbreCode web template". Both are inherited strings the initialization did not replace. The view
also shows less than a user of a local-first app should be able to check without leaving it: there
is no product description, no privacy link and no repository link, and `repositoryOwner` is still
the placeholder `CHANGE_ME`.

## Scope

- Replace the remaining template wording in both locales: About title, intro welcome text.
- About view shows: application name and description, version, organization (LumbreCode), licence,
  third-party notices, privacy view link, website and repository links, and an optional build id.
- `repositoryOwner` becomes the real owner so the repository link resolves.
- A test asserts that no shipped UI string contains "template" in either locale, so the wording
  cannot come back through a merge.

## Out of scope

- Tagging the 1.0.0 release. The application version is `1.0.0` in every authoritative file; the tag
  and the CHANGELOG release entry follow when the hotfixes are done.
- Renaming the organization. The feedback says "Lambro Code"; the configuration and the schema say
  LumbreCode, which the initialization log already records as the same organization.

## Acceptance

- Neither `de.json` nor `en.json` contains the word "template" (case-insensitive) in a user-facing
  message.
- The About view renders every field listed above; the repository link points at
  `https://github.com/<owner>/<name>`.
