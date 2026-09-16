# UI/UX and routes

## Proposed routes

- `/` recent documents / start
- `/documents/new`
- `/documents/:id`
- `/addresses`
- `/sender-profiles`
- `/print-profiles`
- `/assets`
- `/settings/general`
- `/settings/privacy`
- `/settings/connections`
- `/settings/about`

## Workspace layout

Desktop: left metadata/editor panel, central paper preview, right context/validation/export panel. Panels can collapse. Mobile uses tabs or a stepper; print preview remains available but advanced geometry editing may require desktop.

## Editing modes

- Form mode for metadata
- Markdown source mode
- optional visual Markdown mode later
- print-profile geometry editor
- postcard front/back switcher

## Key components

- AppShell and command toolbar
- DocumentNavigator
- MetadataForm
- MarkdownEditor
- PaperPreview
- ValidationPanel
- ExportDialog
- AddressPicker and AddressForm
- PrintProfilePicker and ProfileEditor
- AssetLibrary and AssetInspector
- PrivacyNotice and CapabilityConsentDialog
- About/Licenses page

## UX rules

- Preserve unsaved work and show dirty state.
- Never silently change physical dimensions.
- Warnings are contextual and actionable.
- Destructive actions have scope-aware confirmation.
- Connector consent explains data, purpose, provider and withdrawal.
