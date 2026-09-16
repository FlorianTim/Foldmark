# Letter layouts

## Initial layouts

1. DIN-style A4 Form B working profile with address window and fold/punch marks.
2. DIN-style A4 Form A working profile.
3. Blank A4 correspondence profile without physical guides.
4. A4 letterhead profile allowing a local logo/background.
5. US Letter profile without DIN-specific assumptions.

## Letter regions

- header/letterhead
- return-address line
- recipient/address-window box
- information block/date/reference
- subject
- body
- closing and signature
- footer/page number

## Rules

- The body renderer must not overlap fixed regions.
- Multi-page continuation pages may use different header/footer rules.
- Address-window and return-line content are profile/template concepts, not hard-coded globally.
- Physical marks belong to the print profile, not the document text.
