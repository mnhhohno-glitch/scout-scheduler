import jwt from "jsonwebtoken";

function getConfig() {
  const clientId = process.env.LINEWORKS_CLIENT_ID;
  const clientSecret = process.env.LINEWORKS_CLIENT_SECRET;
  const serviceAccount = process.env.LINEWORKS_SERVICE_ACCOUNT;
  const privateKey = process.env.LINEWORKS_PRIVATE_KEY;
  const botId = process.env.LINEWORKS_BOT_ID;
  const channelId = process.env.LINEWORKS_CHANNEL_ID;

  if (!clientId || !clientSecret || !serviceAccount || !privateKey || !botId || !channelId) {
    throw new Error("LINE WORKS environment variables are not fully configured");
  }

  return { clientId, clientSecret, serviceAccount, privateKey, botId, channelId };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, serviceAccount, privateKey } = getConfig();

  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: clientId,
      sub: serviceAccount,
      iat: now,
      exp: now + 3600,
    },
    privateKey,
    { algorithm: "RS256" },
  );

  const params = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
    client_id: clientId,
    client_secret: clientSecret,
    scope: "bot",
  });

  const res = await fetch("https://auth.worksmobile.com/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE WORKS auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function sendLineWorksMessageWithMention(
  text: string,
  lineworksId: string | null,
): Promise<void> {
  if (lineworksId) {
    const mentionText = `<m userId="${lineworksId}"> ` + text;
    try {
      await sendLineWorksMessage(mentionText);
      return;
    } catch (error) {
      console.error("Mention message failed, falling back:", error);
    }
  }
  await sendLineWorksMessage(text);
}

export async function sendLineWorksMessage(text: string): Promise<void> {
  const { botId, channelId } = getConfig();
  const accessToken = await getAccessToken();

  const res = await fetch(
    `https://www.worksapis.com/v1.0/bots/${botId}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: { type: "text", text },
      }),
    },
  );

  if (!res.ok) {
    const responseText = await res.text();
    throw new Error(`LINE WORKS message send failed (${res.status}): ${responseText}`);
  }
}
