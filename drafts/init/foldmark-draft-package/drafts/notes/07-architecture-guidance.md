# Architecture guidance

## Layers

- `domain`: pure models, invariants and validation concepts
- `application`: use cases and ports
- `infrastructure`: Dexie, file APIs, Markdown codec, sanitizers, render/export/delivery adapters
- `presentation`: Vue components, routes, Pinia workspace/UI state and i18n
- `app`: composition root and dependency wiring

## Essential ports

- `DocumentRepository`
- `AddressRepository`
- `SenderProfileRepository`
- `PrintProfileRepository`
- `AssetRepository`
- `SettingsRepository`
- `CapabilitySettingsRepository`
- `MarkdownDocumentCodec`
- `DocumentRenderer`
- `PdfExporter`
- `EmailRenderer`
- `DeliveryAdapter`
- `BackupExporter` / `BackupImporter`

## Render pipeline

`Document + PrintProfile + RenderOptions + resolved Assets → RenderPlan → target-specific Renderer → Exporter/DeliveryAdapter`

Keep `RenderPlan` deterministic and testable without Vue or DOM where possible. DOM rendering is an adapter detail.

## State

Pinia is a presentation/workspace coordinator, not the database or domain layer. Stores call application use cases and expose loading/error/dirty state.

## Plugin/capability model

Capabilities are statically built but dynamically imported. Do not execute downloaded arbitrary code. A capability declares permissions and data flows before activation.
