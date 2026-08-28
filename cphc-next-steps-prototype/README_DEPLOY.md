# Deploying the CPHC clickable prototype to Firebase

This folder is a ready-to-go Firebase Hosting project for the "Next Steps · CPHC module"
clickable prototype (ANM / CHO flow, Haryana pilot).

It's pre-configured for the Firebase project **cphc-9505f**, deploying to the named
Hosting site **cphc-next-steps** (so the live URL is `https://cphc-next-steps.web.app`
instead of the default `cphc-9505f.web.app`).

## What's in here
- `public/index.html` — the prototype (originally "Next Steps CPHC.dc.html")
- `public/support.js` — the runtime that powers the clickable interactions
- `public/vendor/` — React + ReactDOM, vendored locally so the page doesn't depend on any
  external CDN at runtime
- `public/_ds/` — the Medtronic Labs design system (fonts, tokens, styles) used by the prototype
- `firebase.json` / `.firebaserc` — Hosting config, already pointed at `cphc-9505f` /
  `cphc-next-steps`

## Deploy it (from Terminal, on your Mac)

1. Open Terminal and `cd` into this folder (e.g. `cd ~/Documents/cphc-next-steps-prototype`).
2. Log in once: `npx firebase-tools login`
   (opens your browser — sign in with the Google account that has access to the
   `cphc-9505f` Firebase project).
3. Create the named site once (only needed the first time):
   `npx firebase-tools hosting:sites:create cphc-next-steps --project cphc-9505f`
4. Deploy: `npx firebase-tools deploy --only hosting`

That's it — the CLI will print your live Hosting URL:
`https://cphc-next-steps.web.app`.

If you'd rather use a different name, edit the `"site"` value in `firebase.json`
(and re-run step 3 with the new name) before deploying. If `cphc-9505f` isn't the
project you meant, edit `.firebaserc` first, or run `npx firebase-tools use --add`
to pick a different one.

## Notes
- I already verified locally that the page renders and the click-through flow works
  (Today → Add patient information → programme picker, etc.) with no console errors.
- This was built from a Claude "Design canvas" (.dc.html) export — it needs to be served
  over http(s) (which Firebase Hosting does), not opened as a bare `file://` page.
