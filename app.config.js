// Extends app.json with what must not be committed.
//
// EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY: the "Maps SDK for Android" key the map screen
// needs in a standalone build (Expo Go ships its own key). Set it in `.env.local` for a
// local build (then `npx expo prebuild -p android`, which writes it to the manifest), or as
// an EAS environment variable. It is EXPO_PUBLIC so the map screen can also see whether the
// build has a key: without one it shows a list instead of the map (app/explore/map.tsx).
module.exports = ({ config }) => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;
  if (!mapsKey) {
    return config;
  }
  return {
    ...config,
    android: {
      ...config.android,
      config: { ...config.android?.config, googleMaps: { apiKey: mapsKey } },
    },
  };
};
