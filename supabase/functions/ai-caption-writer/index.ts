import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Login required." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return json({ error: "Login required." }, 401);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY is not configured in Supabase Edge Function secrets." }, 500);

    const body = await req.json();
    const file = body.file;
    if (!file?.base64 || !file?.mime_type) return json({ error: "Please upload an image or PDF." }, 400);
    if (file.base64.length > 14_000_000) return json({ error: "The AI analysis file is too large. Use an image below about 10 MB." }, 413);

    const platform = body.platform || "Instagram";
    const title = body.title || "";
    const clientName = body.client_name || "";
    const industry = body.industry || "";
    const services = body.services || "";
    const language = body.language || "English";

    const prompt = `You are Loopify's senior social-media caption writer. Analyze the uploaded creative itself before writing. Identify only details that are actually visible/readable; never invent offers, prices, dates, people, locations or claims.\n\nClient: ${clientName}\nIndustry: ${industry}\nServices/context: ${services}\nContent title: ${title}\nPlatform: ${platform}\nPreferred language: ${language}\n\nCreate platform-appropriate social media copy that is engaging, natural and conversion-focused. Return ONLY valid JSON with these keys:\nprimary: polished caption with suitable line breaks and emojis where appropriate\nshort: short alternative caption\ncta: clear call to action\nhashtags: array of 8-15 relevant hashtags\nhook: strongest opening line\nvisual_summary: concise factual summary of what you detected in the creative.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const ai = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType: file.mime_type, data: file.base64 } },
            { text: prompt }
          ]
        ]
      })
    });
    const raw = await ai.json();
    if (!ai.ok) return json({ error: raw?.error?.message || "Gemini analysis failed." }, 502);

    const text = raw?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    let result;
    try { result = JSON.parse(cleaned); }
    catch { return json({ error: "AI returned an invalid response. Please try again." }, 502); }

    return json({ result });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected AI error." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
