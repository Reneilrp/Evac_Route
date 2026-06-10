// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // React Native's Animated.Value uses useRef().current in style props,
    // which is a false positive for React 19's react-hooks/refs rule.
    // Animated values are not React refs — .current access in render is intentional.
    rules: {
      "react-hooks/refs": "off",
    },
  },
]);
