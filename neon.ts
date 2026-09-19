import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  buckets: {
    "karaoke-assets": { access: "public_read" },
  },
  functions: {
    machiparty: {
      name: "Machi Party Realtime",
      source: "./functions/party.ts",
    },
  },
});
