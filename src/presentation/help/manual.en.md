<!-- Generated from docs/public-site/. Do not edit directly. -->

# User manual

This manual ships **with the app**. It works offline, and it is what a reviewer sees without leaving
the page.

> Replace this file when you derive an app from the template. The convention stays:
> `src/presentation/help/<document>.<locale>.md`.

## Getting around

- **Todos** — the demo view. Replace it with your first real feature.
- **Settings** — language, appearance, help, privacy and data, Pro status.
- **About** — application metadata, third-party notices and the website.

The settings hub with language, appearance and the sections below

## Language and appearance

Both are changed in Settings and remembered in this browser only. Nothing is sent anywhere. Themes
are local CSS tokens; no font or stylesheet is loaded from a third party.

## Your data

Everything the app stores lives in this browser — IndexedDB for content, local storage for
preferences. There is no account and no server.

Two separate actions take it back, and they do different things:

- **Delete local data** — clears all content, keeps your preferences.
- **Reset settings** — puts language, appearance and every other preference back to its default,
  keeps your content.

Both are on the **Privacy and data** page and both ask before they act.

Privacy and data, showing the danger zone

## The intro

The introduction shown on your first visit can be reopened at any time: **Settings → Show the intro
again**.

## Getting help

- The FAQ in this app answers the most common questions offline.
- **Settings → Privacy and data** has the contact addresses.
- Clearing your browser data removes everything this app stored, including the record that you have
  seen the intro.
