import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std@0.203.0/crypto/mod.ts"

// ===============================
// ENV
// ===============================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const WEBHOOK_SECRET = Deno.env.get("LEMON_WEBHOOK_SECRET")!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ===============================
// VERIFY SIGNATURE
// ===============================
async function verifySignature(payload: string, signature: string) {
  const encoder = new TextEncoder()
  const key = encoder.encode(WEBHOOK_SECRET)
  const data = encoder.encode(payload)

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signed = await crypto.subtle.sign("HMAC", cryptoKey, data)

  const hash = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return hash === signature
}

// ===============================
// SERVER
// ===============================
serve(async (req) => {
  console.log("🍋 Lemon webhook HIT")

  const signature = req.headers.get("x-signature")
  if (!signature) {
    return new Response("Missing signature", { status: 401 })
  }

  const rawBody = await req.text()
  const valid = await verifySignature(rawBody, signature)

  if (!valid) {
    console.error("❌ Invalid signature")
    return new Response("Invalid signature", { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const eventName = event.meta?.event_name

  console.log("📩 Event:", eventName)

  // ===============================
  // LICENSE CREATED
  // ===============================
  if (eventName === "license_key_created") {
    const licenseKey = event.data.attributes.key

    await supabase.from("license_tokens").insert({
      token: licenseKey,
      status: "inactive",
      created_at: new Date().toISOString()
    })

    console.log("✅ License created:", licenseKey)
  }

  // ===============================
  // AUTO DEACTIVATE EVENTS
  // ===============================
  const deactivateEvents = [
    "order_refunded",
    "subscription_cancelled",
    "subscription_expired",
    "license_key_updated"
  ]

  if (deactivateEvents.includes(eventName)) {
    const licenseKey =
      event.data?.attributes?.key ||
      event.data?.attributes?.license_key

    if (licenseKey) {
      await supabase
        .from("license_tokens")
        .update({ status: "inactive" })
        .eq("token", licenseKey)

      console.log("🛑 License deactivated:", licenseKey)
    }
  }

  return new Response("ok", { status: 200 })
})
