# Print-profile and marker system

## Physical units

Persist canonical dimensions in millimetres. Convert to CSS `mm` for print rendering and to PDF points only inside the PDF adapter.

## Built-in profile candidates

- A4 DIN-style letter, Form A working draft
- A4 DIN-style letter, Form B working draft
- A4 blank
- A5 portrait/landscape card
- A6 postcard landscape duplex
- 10 × 15 cm photo portrait/landscape
- US Letter portrait
- custom profile

## Marker properties

- kind and semantic label
- x/y coordinates
- optional width/height
- orientation or path
- line style and physical stroke width
- preview visibility
- print visibility
- surface/page scope
- locked status for built-ins

## Working letter values

The examples use common working values for Form B: upper fold mark around 105 mm, punch mark 148.5 mm and lower fold mark around 210 mm. Form A examples use 87 mm, 148.5 mm and 192 mm. These values must be treated as unverified draft defaults until checked against an authorized current standards source.

## Profile validation

- page dimensions and margins valid
- content box fits page
- marker coordinates finite
- region boxes do not unintentionally overlap
- duplex surfaces compatible
- printed mark count and kinds make sense for category
- photo profiles warn when fold marks are enabled
- email PDF defaults to suppress physical guides
