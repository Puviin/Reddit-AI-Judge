// Shared ElevenLabs text-to-speech helpers.

export const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";

export const VOICE_IDS: Record<string, string> = {
  Judge: "JBFqnCBsd6RMkjVDRZzb",
  Plaintiff: "EXAVITQu4vr4xnSDxMaL",
  Defendant: "TxGEqnHWrfWFTfGW9XjX",
  Witness: "ThT5KcBeYPX3keUQqHPh",
  Narrator: "pNInz6obpgDQGcFmaJgB",
};

export function voiceIdForRole(role: string): string {
  return VOICE_IDS[role] || VOICE_IDS.Narrator;
}

export async function requestSpeech(
  text: string,
  apiKey: string,
  voiceId: string
): Promise<Response> {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
}

export async function generateVoice(
  text: string,
  apiKey: string,
  voiceId: string
): Promise<Buffer> {
  const response = await requestSpeech(text, apiKey, voiceId);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error: ${response.status} ${err}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
