// Postet Nachrichten in einen Microsoft-Teams-Kanal via Incoming Webhook bzw.
// "Workflows"-Webhook. Erwartet wird das aktuelle Adaptive-Card-Format
// (type: message + attachments) – kompatibel mit dem Teams-Workflows-Trigger
// "Beim Empfang einer Webhook-Anfrage posten".
//
// Die Webhook-URL steht ausschließlich serverseitig als App-Setting TEAMS_WEBHOOK_URL.

const WEBHOOK = process.env.TEAMS_WEBHOOK_URL;

export function teamsConfigured(): boolean {
  return !!WEBHOOK;
}

interface CardOptions {
  title: string;
  lines: string[]; // Markdown-fähige Textzeilen
  appUrl?: string; // optionaler "Jetzt tippen"-Button
}

export async function postTeamsCard(opts: CardOptions): Promise<void> {
  if (!WEBHOOK) return;

  const body = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              size: 'Large',
              weight: 'Bolder',
              color: 'Accent',
              text: opts.title,
              wrap: true,
            },
            ...opts.lines.map((text) => ({ type: 'TextBlock', text, wrap: true })),
          ],
          actions: opts.appUrl
            ? [{ type: 'Action.OpenUrl', title: 'Zum Tippspiel', url: opts.appUrl }]
            : [],
        },
      },
    ],
  };

  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Teams-Webhook antwortete mit ${res.status}: ${await res.text()}`);
  }
}
