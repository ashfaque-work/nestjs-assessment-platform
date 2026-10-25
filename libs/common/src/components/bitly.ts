import { Injectable, Logger } from '@nestjs/common';

// Shortens links for SMS and email through Bitly's v4 API. The access token comes from
// BITLY_TOKEN; without one, links are sent as they are rather than failing the message.
@Injectable()
export class BitlyService {
  private readonly token = process.env.BITLY_TOKEN;

  async shorten(url: string): Promise<string> {
    if (!this.token) {
      Logger.warn('BITLY_TOKEN is not set; sending the link unshortened');
      return url;
    }
    const response = await fetch('https://api-ssl.bitly.com/v4/shorten', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ long_url: url }),
    });
    if (!response.ok) {
      throw new Error(`Bitly answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
    const { link } = (await response.json()) as { link: string };
    return link;
  }
}
