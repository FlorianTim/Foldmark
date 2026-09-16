import {
  createAddress,
  createPostalEntry,
  type Address,
  type AddressRole,
  type ContactPoint,
} from '@/domain/address/Address';
import { senderSnapshotOf } from '@/domain/address/SenderProfile';
import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import { createFolder, type Folder } from '@/domain/document/Folder';
import {
  createDocument,
  type DocumentKind,
  type FoldmarkDocument,
  type PostalAddress,
} from '@/domain/document/FoldmarkDocument';
import { renderDemoPng } from '@/application/demo/demoPng';

/**
 * The demo data set (change 0026): twenty contacts across countries and
 * roles, two folders, a handful of documents of every kind — a long letter,
 * one with a table, one with a page break, one with an image, an archived
 * one, two postcards, a free document — and the one image they share.
 *
 * Everything is deterministic: fixed ids (`demo-contact-001`), fixed
 * timestamps, the same PNG bytes every time. Inserting twice changes nothing
 * and removal deletes exactly the records marked `demoData`, so the set can be
 * put in for a screenshot and taken out again without touching what a person
 * wrote. The people and places are invented; the domains are reserved ones.
 */

/** Everything the seed writes, in the order it has to be written. */
export interface DemoDataSet {
  readonly folders: readonly Folder[];
  readonly contacts: readonly Address[];
  readonly asset: { readonly asset: DocumentAsset; readonly data: Blob };
  readonly documents: readonly FoldmarkDocument[];
}

/** The prefix every demo id starts with, so a stray record is still recognisable. */
export const DEMO_ID_PREFIX = 'demo-';

/** The id of the one demo image. */
export const DEMO_ASSET_ID = 'demo-asset-001';
const FOLDER_PRIVATE = 'demo-folder-001';
const FOLDER_CLUB = 'demo-folder-002';

const BASE_TIME = Date.UTC(2026, 8, 1, 9, 0, 0);

/** A fixed instant, `days` after the base and `minutes` into the day. */
function at(days: number, minutes = 0): Date {
  return new Date(BASE_TIME + days * 86_400_000 + minutes * 60_000);
}

function id(kind: 'contact' | 'document', index: number): string {
  return `${DEMO_ID_PREFIX}${kind}-${String(index).padStart(3, '0')}`;
}

interface ContactSeed {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly displayName?: string;
  readonly addresses: readonly {
    readonly label?: string;
    readonly postal: PostalAddress;
    readonly primary?: boolean;
    readonly favorite?: boolean;
  }[];
  readonly emails?: readonly string[];
  readonly phones?: readonly string[];
  readonly websites?: readonly string[];
  readonly roles?: readonly AddressRole[];
  readonly tags?: readonly string[];
  readonly notes?: string;
  readonly footerLines?: readonly string[];
}

const points = (values: readonly string[] | undefined): ContactPoint[] =>
  (values ?? []).map((value, index) => ({ value, primary: index === 0 }));

/** Twenty contacts: countries, cities, roles, several addresses and contact points. */
const CONTACT_SEEDS: readonly ContactSeed[] = [
  {
    firstName: 'Erika',
    lastName: 'Beispiel',
    displayName: 'Erika Beispiel (privat)',
    addresses: [
      {
        label: 'Privat',
        postal: {
          street: 'Lindenallee 12',
          postalCode: '10115',
          city: 'Berlin',
          countryCode: 'DE',
        },
        primary: true,
      },
    ],
    emails: ['erika@example.org', 'erika.beispiel@example.com'],
    phones: ['+49 30 1234567', '+49 171 2345678'],
    websites: ['https://example.org/erika'],
    roles: ['primary', 'sender'],
    tags: ['ich'],
    footerLines: ['IBAN DE00 0000 0000 0000 0000 00', 'Steuernummer 00/000/00000'],
  },
  {
    firstName: 'Erika',
    lastName: 'Beispiel',
    displayName: 'Erika Beispiel (Ferienhaus)',
    addresses: [
      {
        label: 'Ferienhaus',
        postal: { street: 'Am Deich 3', postalCode: '25980', city: 'Sylt', countryCode: 'DE' },
        primary: true,
      },
    ],
    emails: ['erika@example.org'],
    roles: ['home', 'sender'],
    tags: ['ich', 'urlaub'],
  },
  {
    firstName: 'Max',
    lastName: 'Mustermann',
    addresses: [
      {
        label: 'Privat',
        postal: {
          street: 'Musterstraße 1',
          postalCode: '80331',
          city: 'München',
          countryCode: 'DE',
        },
        primary: true,
      },
      {
        label: 'Postfach',
        postal: {
          addressLine2: 'Postfach 10 01 23',
          postalCode: '80001',
          city: 'München',
          countryCode: 'DE',
        },
      },
      {
        label: 'Büro',
        postal: {
          organization: 'Muster & Söhne GmbH',
          department: 'Einkauf',
          street: 'Industriestraße 7',
          postalCode: '85748',
          city: 'Garching',
          countryCode: 'DE',
        },
        favorite: true,
      },
    ],
    emails: ['max@example.com', 'max.mustermann@example.net'],
    phones: ['+49 89 987654', '+49 160 1112223'],
    websites: ['https://example.com', 'https://example.net/max'],
    roles: ['favorite'],
    tags: ['familie', 'verein'],
    notes: 'Bevorzugt Post an das Postfach.',
  },
  {
    displayName: 'Stadt Beispielstadt – Bürgeramt',
    addresses: [
      {
        postal: {
          organization: 'Stadt Beispielstadt',
          department: 'Bürgeramt',
          street: 'Rathausplatz 1',
          postalCode: '12345',
          city: 'Beispielstadt',
          countryCode: 'DE',
        },
        primary: true,
      },
    ],
    emails: ['buergeramt@example.org'],
    phones: ['+49 30 115'],
    websites: ['https://example.org/buergeramt'],
    tags: ['behörde'],
  },
  {
    firstName: 'Anna',
    lastName: 'Müller',
    addresses: [
      {
        postal: {
          street: 'Unter den Linden 5',
          postalCode: '10117',
          city: 'Berlin',
          countryCode: 'DE',
        },
        primary: true,
      },
      {
        label: 'Wochenende',
        postal: { street: 'Seeweg 3', postalCode: '14467', city: 'Potsdam', countryCode: 'DE' },
      },
    ],
    emails: ['anna.mueller@example.org'],
    phones: ['+49 30 5556667'],
    roles: ['favorite'],
    tags: ['verein', 'kasse'],
    notes: 'Kassenwartin des Vereins.',
  },
  {
    firstName: 'Lukas',
    lastName: 'Huber',
    addresses: [
      {
        postal: {
          street: 'Mariahilfer Straße 88',
          postalCode: '1070',
          city: 'Wien',
          countryCode: 'AT',
        },
        primary: true,
      },
    ],
    emails: ['lukas.huber@example.at'],
    phones: ['+43 1 2345678'],
    tags: ['freunde'],
  },
  {
    firstName: 'Sophie',
    lastName: 'Meier',
    addresses: [
      {
        postal: {
          street: 'Bahnhofstrasse 21',
          postalCode: '8001',
          city: 'Zürich',
          countryCode: 'CH',
        },
        primary: true,
      },
    ],
    emails: ['sophie.meier@example.ch', 'sophie@example.org'],
    phones: ['+41 44 123 45 67'],
    websites: ['https://example.ch/sophie'],
    roles: ['favorite'],
    tags: ['freunde', 'geburtstag'],
  },
  {
    firstName: 'Jan',
    lastName: 'de Vries',
    addresses: [
      {
        postal: {
          street: 'Keizersgracht 100',
          postalCode: '1015 CX',
          city: 'Amsterdam',
          countryCode: 'NL',
        },
        primary: true,
      },
    ],
    emails: ['jan.devries@example.nl'],
    phones: ['+31 20 123 4567'],
    tags: ['arbeit'],
  },
  {
    firstName: 'Marie',
    lastName: 'Dubois',
    addresses: [
      {
        postal: {
          street: '12 rue de Rivoli',
          postalCode: '75004',
          city: 'Paris',
          countryCode: 'FR',
        },
        primary: true,
      },
    ],
    emails: ['marie.dubois@example.fr'],
    websites: ['https://example.fr/marie'],
    tags: ['freunde'],
  },
  {
    firstName: 'Giulia',
    lastName: 'Rossi',
    addresses: [
      {
        postal: {
          street: 'Via Roma 15',
          postalCode: '20121',
          city: 'Milano',
          region: 'MI',
          countryCode: 'IT',
        },
        primary: true,
      },
    ],
    emails: ['giulia.rossi@example.it'],
    phones: ['+39 02 1234567'],
    tags: ['arbeit'],
  },
  {
    firstName: 'Carlos',
    lastName: 'García',
    addresses: [
      {
        postal: { street: 'Calle Mayor 3', postalCode: '28013', city: 'Madrid', countryCode: 'ES' },
        primary: true,
      },
    ],
    emails: ['carlos.garcia@example.es'],
    phones: ['+34 91 123 45 67'],
  },
  {
    firstName: 'Emma',
    lastName: 'Johnson',
    addresses: [
      {
        postal: {
          street: '221B Baker Street',
          postalCode: 'NW1 6XE',
          city: 'London',
          countryCode: 'GB',
        },
        primary: true,
      },
    ],
    emails: ['emma.johnson@example.co.uk'],
    phones: ['+44 20 7946 0000'],
    tags: ['arbeit'],
  },
  {
    firstName: 'Liam',
    lastName: 'Smith',
    addresses: [
      {
        postal: {
          street: '1600 Pennsylvania Avenue NW',
          postalCode: '20500',
          city: 'Washington',
          region: 'DC',
          countryCode: 'US',
        },
        primary: true,
      },
    ],
    emails: ['liam.smith@example.com'],
    phones: ['+1 202 555 0100'],
  },
  {
    firstName: 'Yuki',
    lastName: 'Tanaka',
    addresses: [
      {
        postal: { street: '1-1 Chiyoda', postalCode: '100-0001', city: 'Tokyo', countryCode: 'JP' },
        primary: true,
      },
    ],
    emails: ['yuki.tanaka@example.jp'],
    tags: ['freunde'],
  },
  {
    firstName: 'Olivia',
    lastName: 'Brown',
    addresses: [
      {
        postal: {
          street: '10 Collins Street',
          postalCode: '3000',
          city: 'Melbourne',
          region: 'VIC',
          countryCode: 'AU',
        },
        primary: true,
      },
    ],
    emails: ['olivia.brown@example.com.au'],
    phones: ['+61 3 9000 0000'],
  },
  {
    firstName: 'Noah',
    lastName: 'Andersen',
    addresses: [
      {
        postal: { street: 'Strøget 14', postalCode: '1160', city: 'København', countryCode: 'DK' },
        primary: true,
      },
    ],
    emails: ['noah.andersen@example.dk'],
  },
  {
    firstName: 'Zofia',
    lastName: 'Nowak',
    addresses: [
      {
        postal: {
          street: 'ul. Długa 7',
          postalCode: '00-238',
          city: 'Warszawa',
          countryCode: 'PL',
        },
        primary: true,
      },
    ],
    emails: ['zofia.nowak@example.pl'],
    phones: ['+48 22 123 45 67'],
    tags: ['verein'],
  },
  {
    displayName: 'Gartenverein Sonnenhügel e. V.',
    addresses: [
      {
        postal: {
          organization: 'Gartenverein Sonnenhügel e. V.',
          street: 'Am Hang 2',
          postalCode: '01099',
          city: 'Dresden',
          countryCode: 'DE',
        },
        primary: true,
      },
    ],
    emails: ['vorstand@example.org', 'kasse@example.org'],
    phones: ['+49 351 4445556'],
    websites: ['https://example.org/sonnenhuegel'],
    roles: ['sender'],
    tags: ['verein'],
    footerLines: ['Vereinsregister VR 0000 Dresden', 'IBAN DE00 1111 1111 1111 1111 11'],
  },
  {
    displayName: 'Beispiel Versicherung AG',
    addresses: [
      {
        label: 'Schadenabteilung',
        postal: {
          organization: 'Beispiel Versicherung AG',
          department: 'Schaden',
          street: 'Versicherungsweg 9',
          postalCode: '50667',
          city: 'Köln',
          countryCode: 'DE',
        },
        primary: true,
      },
      {
        label: 'Postfach',
        postal: {
          organization: 'Beispiel Versicherung AG',
          addressLine2: 'Postfach 90 01 00',
          postalCode: '50901',
          city: 'Köln',
          countryCode: 'DE',
        },
      },
    ],
    emails: ['schaden@example.com'],
    phones: ['+49 221 9876543'],
    websites: ['https://example.com/versicherung'],
    tags: ['versicherung'],
    notes: 'Vertragsnummer 4711-0815.',
  },
  {
    firstName: 'Ahmed',
    lastName: 'Hassan',
    addresses: [
      {
        postal: {
          street: 'Hafenstraße 44',
          postalCode: '20359',
          city: 'Hamburg',
          countryCode: 'DE',
        },
        primary: true,
      },
    ],
    emails: ['ahmed.hassan@example.org'],
    phones: ['+49 40 3334445'],
    tags: ['freunde', 'nachbarn'],
  },
];

/** The contacts, ids and timestamps fixed. */
export function demoContacts(): readonly Address[] {
  return CONTACT_SEEDS.map((seed, index) =>
    createAddress(
      {
        id: id('contact', index + 1),
        firstName: seed.firstName,
        lastName: seed.lastName,
        displayName: seed.displayName,
        addresses: seed.addresses.map((entry, entryIndex) =>
          createPostalEntry(entry, `${id('contact', index + 1)}-address-${entryIndex + 1}`),
        ),
        emails: points(seed.emails),
        phones: points(seed.phones),
        websites: points(seed.websites),
        roles: seed.roles,
        tags: seed.tags,
        notes: seed.notes,
        stationery: seed.footerLines
          ? { footerLines: seed.footerLines, letterhead: [] }
          : undefined,
        contactVisibility: { email: true, phone: true },
        demoData: true,
      },
      at(index),
    ),
  );
}

/** The two folders documents are filed in. */
export function demoFolders(): readonly Folder[] {
  return [
    createFolder({ name: 'Privat', id: FOLDER_PRIVATE, demoData: true }, at(0)),
    createFolder({ name: 'Verein', id: FOLDER_CLUB, demoData: true }, at(0, 1)),
  ];
}

const LETTER_BODY = `:::salutation
Sehr geehrte Damen und Herren,
:::

hiermit kündige ich den oben genannten Vertrag fristgerecht zum nächstmöglichen Zeitpunkt.

Bitte bestätigen Sie mir den Eingang dieser Kündigung sowie das Datum, zu dem der Vertrag endet, schriftlich.

:::closing
Mit freundlichen Grüßen
:::
`;

const LONG_LETTER_BODY = `:::salutation
Liebe Mitglieder,
:::

das Gartenjahr neigt sich dem Ende zu, und wie jedes Jahr laden wir zur Mitgliederversammlung ein. Es gibt viel zu besprechen: die Wasserleitung am oberen Weg, den neuen Zaun und die Pacht für das kommende Jahr.

## Tagesordnung

1. Begrüßung und Feststellung der Beschlussfähigkeit
2. Bericht des Vorstands
3. Bericht der Kassenwartin
4. Entlastung des Vorstands
5. Wasserleitung am oberen Weg
6. Verschiedenes

## Bericht des Vorstands

${'Das vergangene Jahr war ein gutes Jahr für den Verein. Die Beete am Südhang haben mehr getragen als je zuvor, und die neue Kompostanlage hat sich bewährt. '.repeat(6)}

${'Der Zaun zur Straße hin ist an drei Stellen beschädigt und muss vor dem Winter erneuert werden. Der Vorstand hat zwei Angebote eingeholt, die in der Versammlung vorgestellt werden. '.repeat(6)}

## Bericht der Kassenwartin

${'Die Einnahmen aus Beiträgen und dem Sommerfest decken die laufenden Kosten. Für die Wasserleitung ist eine Rücklage gebildet worden, die im kommenden Jahr aufgelöst werden soll. '.repeat(6)}

:::note{type="info"}
Anträge zur Tagesordnung bitte bis zwei Wochen vor der Versammlung schriftlich an den Vorstand.
:::

${'Wir freuen uns auf einen regen Austausch und bitten um zahlreiches Erscheinen. Für Getränke und einen kleinen Imbiss ist gesorgt. '.repeat(4)}

:::closing
Mit grünen Grüßen
:::
`;

const TABLE_LETTER_BODY = `:::salutation
Sehr geehrte Frau Beispiel,
:::

wie besprochen erhalten Sie die Aufstellung der Kosten für die Reparatur.

| Position | Beschreibung | Betrag |
| --- | --- | ---: |
| 1 | Anfahrt | 45,00 € |
| 2 | Arbeitszeit (2 h) | 120,00 € |
| 3 | Material | 38,50 € |
| | **Summe** | **203,50 €** |

Bitte überweisen Sie den Betrag innerhalb von 14 Tagen.

:::closing
Mit freundlichen Grüßen
:::
`;

const PAGE_BREAK_BODY = `:::salutation
Hallo Max,
:::

anbei die Einladung zur Feier. Alles Weitere steht auf der zweiten Seite.

::page-break

## Programm

- 15:00 Uhr Kaffee und Kuchen
- 17:00 Uhr Spaziergang zum See
- 19:00 Uhr Abendessen

:::closing
Bis bald
:::
`;

const IMAGE_BODY = `:::salutation
Liebe Sophie,
:::

hier ein Blick auf den neuen Garten:

![Der neue Garten](asset:${DEMO_ASSET_ID}){width=80mm}

Im Frühjahr wird gepflanzt.

:::closing
Herzliche Grüße
:::
`;

const FREE_DOCUMENT_BODY = `# Packliste Sylt

:::note{type="warning"}
Fähre um 8:15 Uhr — Tickets ausdrucken!
:::

## Kleidung

- Regenjacke
- Gummistiefel
- Pullover

## Sonstiges

- Fernglas
- Bücher
- Ladekabel

:::small
Stand: September 2026
:::
`;

interface DocumentSeed {
  readonly kind: DocumentKind;
  readonly title: string;
  readonly body?: string;
  readonly printProfileId: string;
  readonly folderId?: string;
  readonly archived?: boolean;
  readonly recipient?: number;
  readonly subject?: string;
  readonly surfaces?: FoldmarkDocument['surfaces'];
  readonly tags?: readonly string[];
}

const DOCUMENT_SEEDS: readonly DocumentSeed[] = [
  {
    kind: 'letter',
    title: 'Kündigung Versicherung',
    body: LETTER_BODY,
    printProfileId: 'din5008-b',
    folderId: FOLDER_PRIVATE,
    recipient: 19,
    subject: 'Kündigung des Vertrags 4711-0815',
    tags: ['versicherung'],
  },
  {
    kind: 'letter',
    title: 'Einladung Mitgliederversammlung',
    body: LONG_LETTER_BODY,
    printProfileId: 'din5008-a',
    folderId: FOLDER_CLUB,
    recipient: 5,
    subject: 'Einladung zur Mitgliederversammlung 2026',
    tags: ['verein'],
  },
  {
    kind: 'letter',
    title: 'Kostenaufstellung Reparatur',
    body: TABLE_LETTER_BODY,
    printProfileId: 'din5008-b',
    recipient: 1,
    subject: 'Kostenaufstellung Reparatur vom 3. September',
  },
  {
    kind: 'letter',
    title: 'Einladung zur Feier',
    body: PAGE_BREAK_BODY,
    printProfileId: 'a4-blank',
    folderId: FOLDER_PRIVATE,
    recipient: 3,
  },
  {
    kind: 'letter',
    title: 'Gartenbrief mit Bild',
    body: IMAGE_BODY,
    printProfileId: 'a4-blank',
    folderId: FOLDER_PRIVATE,
    recipient: 7,
  },
  {
    kind: 'letter',
    title: 'Alter Brief (archiviert)',
    body: LETTER_BODY,
    printProfileId: 'din5008-b',
    recipient: 4,
    subject: 'Antrag auf Meldebescheinigung',
    archived: true,
  },
  {
    kind: 'postcard',
    title: 'Grüße aus Sylt',
    printProfileId: 'postcard-a6-landscape-duplex',
    folderId: FOLDER_PRIVATE,
    recipient: 6,
    surfaces: {
      back: {
        text: 'Liebe Grüße vom Meer! Wind, Wellen und Fischbrötchen — mehr braucht es nicht.',
      },
    },
  },
  {
    kind: 'postcard',
    title: 'Postkarte aus Wien',
    printProfileId: 'postcard-a6-landscape-duplex',
    recipient: 14,
    surfaces: { back: { text: 'Servus aus Wien! Der Kaffee ist gut, der Regen weniger.' } },
  },
  {
    kind: 'custom',
    title: 'Packliste Sylt',
    body: FREE_DOCUMENT_BODY,
    printProfileId: 'a4-blank',
    folderId: FOLDER_PRIVATE,
    tags: ['urlaub'],
  },
];

/** The documents, with their recipients snapshotted from the demo contacts. */
export function demoDocuments(contacts: readonly Address[]): readonly FoldmarkDocument[] {
  return DOCUMENT_SEEDS.map((seed, index) => {
    const created = at(2 + index, index * 7);
    const base = createDocument(
      {
        kind: seed.kind,
        title: seed.title,
        locale: 'de-DE',
        printProfileId: seed.printProfileId,
        bodyMarkdown: seed.body,
        date: seed.kind === 'letter' ? created.toISOString().slice(0, 10) : undefined,
      },
      created,
    );
    const recipient = seed.recipient === undefined ? undefined : contacts[seed.recipient - 1];
    const sender = contacts.find((contact) => contact.roles.includes('primary'));
    return {
      ...base,
      id: id('document', index + 1),
      metadata: {
        ...base.metadata,
        ...(sender && seed.kind === 'letter'
          ? { sender: senderSnapshotOf(sender), senderProfileId: sender.id }
          : {}),
        ...(recipient ? { recipient: recipient.postal } : {}),
        ...(seed.subject ? { subject: seed.subject } : {}),
      },
      surfaces: seed.surfaces ?? {},
      tags: seed.tags ?? [],
      folderId: seed.folderId,
      archived: seed.archived,
      demoData: true,
    };
  });
}

/** The one image the documents share, rendered without a canvas. */
export async function demoAsset(
  checksum: (data: Blob) => Promise<string>,
): Promise<{ asset: DocumentAsset; data: Blob }> {
  const data = await renderDemoPng(320, 200);
  return {
    asset: {
      id: DEMO_ASSET_ID,
      kind: 'image',
      mimeType: 'image/png',
      byteSize: data.size,
      checksum: await checksum(data),
      widthPx: 320,
      heightPx: 200,
      sourceFilename: 'garten.png',
      title: 'Der neue Garten',
      description: 'Beispielbild aus den Demo-Daten.',
      demoData: true,
      createdAt: at(1).toISOString(),
    },
    data,
  };
}

/** The whole set. */
export async function buildDemoDataSet(
  checksum: (data: Blob) => Promise<string>,
): Promise<DemoDataSet> {
  const contacts = demoContacts();
  return {
    folders: demoFolders(),
    contacts,
    asset: await demoAsset(checksum),
    documents: demoDocuments(contacts),
  };
}
