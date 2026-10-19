const fs = require('fs');

// Extends app.json with what must not be committed.
//
// EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY: the "Maps SDK for Android" key the map screen
// needs in a standalone build (Expo Go ships its own key). Set it in `.env.local` for a
// local build (then `npx expo prebuild -p android`, which writes it to the manifest), or as
// an EAS environment variable. It is EXPO_PUBLIC so the map screen can also see whether the
// build has a key: without one it shows a list instead of the map (app/explore/map.tsx).
//
// GOOGLE_SERVICES_JSON: Firebase's google-services.json (push on Android, DECISIONS #132). An
// EAS file variable on EAS builds; locally the file in the workspace root, next to this repo.
// It stays out of git (public repo).
module.exports = ({ config }) => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;
  // Without the file the build still works, with push off.
  const googleServices =
    process.env.GOOGLE_SERVICES_JSON ?? (fs.existsSync('../google-services.json') ? '../google-services.json' : undefined);
  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServices ? { googleServicesFile: googleServices } : {}),
      ...(mapsKey ? { config: { ...config.android?.config, googleMaps: { apiKey: mapsKey } } } : {}),
    },
  };
};
