import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextCoreWebVitals,
  {
    settings: {
      react: { version: "19" },
    },
  },
];
