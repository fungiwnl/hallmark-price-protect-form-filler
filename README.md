# HallmarkInsurance Price Protection Autofill Extension

Chrome extension to securely store personal details and autofill the personal-details section of a claim form.

- Lets you enter personal details in the extension popup.
- Supports claim-details (step 2) fields in the same popup profile.
- Encrypts and stores them locally in `chrome.storage.local` using AES-GCM with a memory-hard scrypt KDF.
- Requires your passphrase to decrypt before loading/filling.
- Fills matching fields only on `https://maplc.outsystemsenterprise.com/HallmarkInsurance/CustomerClaim`.

## Project structure

- `src/popup.ts`: popup UI + storage workflow.
- `src/popup/crypto.ts`: encryption/decryption and base64 helpers.
- `src/content.ts`: content script message handler.
- `src/content/fillers.ts`: DOM fill logic.
- `tests/*.test.ts`: unit tests.

## Development

Prerequisite: install Bun ([https://bun.sh](https://bun.sh)).

1. Install dependencies:
   - `bun install`
2. Build extension scripts from TypeScript:
   - `bun run build`
3. Run unit tests:
   - `bun run test`
4. Run static type checks:
   - `bun run typecheck`
5. Install Git hooks:
   - `bun run hooks:install`

The build step outputs extension-ready binaries in `dist/` (`dist/popup.js` and `dist/content.js`).

## Build extension binary output

Use these steps when you want the compiled JS binaries that Chrome/Brave loads:

1. From the project root, build:
   - `bun run build`
2. Confirm compiled binaries exist:
   - `dist/popup.js`
   - `dist/content.js`
3. Load unpacked extension in browser from project root:
   - `/Users/bfung/p/lat-price-protect-form-fill`

Optional package step (for sharing):

1. Build first:
   - `bun run build`
2. Create zip bundle:
   - `zip -r extension-build.zip manifest.json popup.html popup.css dist`

## Install in Chromium based browser

1. Open extensions page:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select `/Users/bfung/p/lat-price-protect-form-fill`.
5. After code changes, rebuild and reload:
   - `bun run build`
   - Click `Reload` on the extension card in `chrome://extensions` / `brave://extensions`.

## Notes

- The passphrase is not stored. After a successful save or decrypt, decrypted profile data is cached for 60 seconds in `chrome.storage.session` (with non-persistent in-memory fallback only) so next-step fill actions do not require re-entering passphrase.
- A background service-worker alarm actively clears the decrypted session cache at the TTL boundary, even after the popup closes.
- Encryption uses AES-GCM with authenticated metadata and hardened scrypt defaults (`N=131072`, `r=8`, `p=2`, `dkLen=32`) to increase brute-force resistance.
- New passphrases must be at least 12 characters and include uppercase, lowercase, number, and symbol.
- Autofill is blocked unless the active tab URL is `https://maplc.outsystemsenterprise.com/HallmarkInsurance/CustomerClaim`.
- For step 2, ensure values are entered under `Claim Details (Step 2)` in the extension before saving.
- If the claim form changes field IDs, selector mappings in `src/content/fillers.ts` may need updates.
