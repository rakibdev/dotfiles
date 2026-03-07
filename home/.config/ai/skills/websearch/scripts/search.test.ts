import { test, expect } from "bun:test"
import { search } from "./search"

test("vercel blob in results", async () => {
  const result = await search("vercel cloudflare like object storage")
  expect(result.toLowerCase()).toContain("vercel blob")
}, { timeout: 20000 })
