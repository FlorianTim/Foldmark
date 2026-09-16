# MVP acceptance criteria

The MVP is acceptable when:

1. A user can create a letter in German or English.
2. The document is saved locally and survives reload.
3. The document exports and re-imports as Markdown/YAML without material loss.
4. A built-in A4 letter profile renders configurable fold and hole marks at stored physical coordinates.
5. Preview zoom does not mutate export geometry.
6. Browser printing produces an A4 page and the UI warns about 100% scaling.
7. A local sender profile and recipient address can populate the letter.
8. Validation distinguishes errors, warnings and information for the selected target.
9. The privacy center exports and deletes local application data.
10. Startup causes no intentional third-party network requests.
11. German and English strings exist for all MVP UI.
12. Keyboard operation and contrast meet the defined accessibility baseline.
13. Tests, lint, typecheck, build, security/privacy/license checks and Git hooks pass.
14. OpenSpec, arc42, ADRs and diagrams reflect the implemented product.
