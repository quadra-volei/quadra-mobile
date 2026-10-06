// Extends app.json with what must not be committed.
//
// GOOGLE_MAPS_ANDROID_API_KEY: the "Maps SDK for Android" key the map screen needs in a
// standalone build (Expo Go ships its own key; an APK without one shows a blank map).
// Set it as an EAS environment variable / secret, or in the shell for a local build.
module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
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
