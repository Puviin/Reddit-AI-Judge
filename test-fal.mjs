import { readFileSync } from "fs";

// Load env
const envContent = readFileSync("/opt/.manus/webdev.sh.env", "utf-8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^export\s+([^=]+)="?([^"]*)"?/);
  if (match) envVars[match[1]] = match[2];
}

const falKey = envVars.FAL_API_KEY;
console.log("FAL_API_KEY present:", !!falKey, falKey ? falKey.substring(0, 10) + "..." : "MISSING");

if (!falKey) {
  console.error("No FAL_API_KEY found in env");
  process.exit(1);
}

// Test 1: minimax-video (current endpoint)
console.log("\n--- Testing fal-ai/minimax-video/text-to-video ---");
try {
  const r1 = await fetch("https://fal.run/fal-ai/minimax-video/text-to-video", {
    method: "POST",
    headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "anime courtroom scene, dramatic lighting", duration: 6 }),
  });
  console.log("Status:", r1.status, r1.statusText);
  const t1 = await r1.text();
  console.log("Response:", t1.substring(0, 500));
} catch (e) {
  console.error("Error:", e.message);
}

// Test 2: fast-animatediff (simpler, faster)
console.log("\n--- Testing fal-ai/fast-animatediff/text-to-video ---");
try {
  const r2 = await fetch("https://fal.run/fal-ai/fast-animatediff/text-to-video", {
    method: "POST",
    headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "anime courtroom scene, dramatic lighting, manga style" }),
  });
  console.log("Status:", r2.status, r2.statusText);
  const t2 = await r2.text();
  console.log("Response:", t2.substring(0, 500));
} catch (e) {
  console.error("Error:", e.message);
}

// Test 3: kling-video (popular)
console.log("\n--- Testing fal-ai/kling-video/v1.6/standard/text-to-video ---");
try {
  const r3 = await fetch("https://fal.run/fal-ai/kling-video/v1.6/standard/text-to-video", {
    method: "POST",
    headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "anime courtroom scene, dramatic lighting", duration: "5" }),
  });
  console.log("Status:", r3.status, r3.statusText);
  const t3 = await r3.text();
  console.log("Response:", t3.substring(0, 500));
} catch (e) {
  console.error("Error:", e.message);
}

// Test 4: image generation (simpler fallback)
console.log("\n--- Testing fal-ai/flux/schnell (image) ---");
try {
  const r4 = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "anime courtroom scene, manga style, dramatic lighting" }),
  });
  console.log("Status:", r4.status, r4.statusText);
  const t4 = await r4.text();
  console.log("Response:", t4.substring(0, 500));
} catch (e) {
  console.error("Error:", e.message);
}
