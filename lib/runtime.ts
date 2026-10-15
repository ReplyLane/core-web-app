import { database } from "./database";

// Read runtime variables on the server; never embed credentials in client code.
export const env = new Proxy({} as Record<string, unknown>, {
  get(_target, key) {
    return key === "DB" ? database() : typeof key === "string" ? process.env[key] : undefined;
  },
});
