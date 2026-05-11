import { logger } from "../lib/logger";

export async function sendWhatsAppMessage(phone: string, templateName: string, params: string[]) {
  const apiKey = process.env.INTERAKT_API_KEY;
  if (!apiKey) {
    logger.warn("[WHATSAPP] Missing INTERAKT_API_KEY. Skipping message.");
    return;
  }

  try {
    const response = await fetch("https://api.interakt.ai/v1/public/message/", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        countryCode: "+91",
        phoneNumber: phone,
        type: "Template",
        template: {
          name: templateName,
          languageCode: "en",
          bodyValues: params
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ phone, templateName, error }, "[WHATSAPP] Failed to send message");
    } else {
      logger.info({ phone, templateName }, "[WHATSAPP] Message sent successfully");
    }
  } catch (err: any) {
    logger.error({ phone, templateName, err: err.message }, "[WHATSAPP] Error in sendWhatsAppMessage");
  }
}
