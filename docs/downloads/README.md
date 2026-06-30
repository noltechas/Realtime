# Mobile App Downloads

GitHub Pages serves this folder at `https://noltechas.github.io/Realtime/downloads/`.
The companion website's download prompt (see `docs/js/render/auth.js` →
`renderDownloadPrompt`) links here for the Android install.

## Android

Drop the latest signed APK at:

```
docs/downloads/realtime-karaoke.apk
```

Then commit + push. The download button on the companion site picks this up
automatically (URL is configured in `docs/js/state.js` as `ANDROID_APP_URL`).

Build it with EAS from `packages/mobile`:

```
cd packages/mobile
eas build --platform android --profile preview
```

`preview` profiles in `eas.json` produce a directly-installable APK. Download
the artifact from the EAS dashboard and rename it to `realtime-karaoke.apk`
before committing.

## iOS

iOS apps cannot be installed via a direct download — Apple requires App Store
or TestFlight. Once you have a TestFlight invite URL (or App Store link), paste
it into `IOS_APP_URL` in `docs/js/state.js`. The iOS download button on the
companion site will switch from "Coming soon" to an active link automatically.

Currently set to the unlisted App Store listing:
`https://apps.apple.com/us/app/lake-house-karaoke/id6781926955`.
