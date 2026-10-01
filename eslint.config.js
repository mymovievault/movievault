export default [
  {
    ignores: ["node_modules/**", ".git/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Buffer: "readonly",
        Blob: "readonly",
        FormData: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        document: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        structuredClone: "readonly",
        window: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { "args": "none" }],
      "no-unreachable": "error",
    },
  },
];
