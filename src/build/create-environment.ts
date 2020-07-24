// Creates environment.ts by replacing fields in environment.sample.ts with values from system environment.
// Used by CircleCI to create environment that points to the right channel.

import {writeFileSync} from 'fs';

function createEnvironmentFile(srcomApiKey: string, webhookChannelId: string, webhookSecret: string) {
  const content = `
    export const environment = {
      srcomApiKey: '${srcomApiKey}',
      webhookChannelId: '${webhookChannelId}',
      webhookSecret: '${webhookSecret}',
    }
  `;

  writeFileSync('src/environment/environment.ts', content, {encoding: 'utf8'});
}

const srcomApiKey = process.env.SRCOM_API_KEY || '';
const webhookChannelId = process.env.DISCORD_WEBHOOK_CHANNEL_ID || '';
const webhookSecret = process.env.DISCORD_WEBHOOK_SECRET || '';
createEnvironmentFile(srcomApiKey, webhookChannelId, webhookSecret);
