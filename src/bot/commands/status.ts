import { APIEmbedField, EmbedBuilder } from 'discord.js';

import { readFile } from 'fs/promises';

import { BotContext, CommandHandlerParams } from '../types.js';
import { BLUE, ORANGE } from '../../constants/color.js';

export default {
  command: 'status',
  description: 'Show the bot status',
  type: 'CHAT_INPUT',
  fn: async (
    { client }: BotContext,
    { timestamp }: CommandHandlerParams
  ): Promise<EmbedBuilder[]> => {
    const time = Date.now() - timestamp;

    const file = await readFile(
      new URL('../../../package.json', import.meta.url)
    );

    const packageInfo = JSON.parse(file.toString());

    let packageVersion: string = packageInfo.dependencies['discord.js'];

    if (/^[^\d]/.test(packageVersion)) {
      packageVersion = packageVersion.slice(1);
      packageVersion = `v${packageVersion}`;
    }

    const fields: APIEmbedField[] = [
      {
        name: 'Bot Environment',
        // eslint-disable-next-line max-len
        value: `**NodeJS Version**: ${process.version.slice(
          1
        )}\n**Framework**: DiscordJS ${packageVersion}`,
      },
      {
        name: 'Active Servers',
        value: `${client.guilds.cache.size} servers`,
        inline: true,
      },
      {
        name: 'Response Time',
        value: `~${time} ms`,
        inline: true,
      },
    ];

    return [
      new EmbedBuilder({
        author: {
          name: 'pleasantcord',
          iconURL: process.env.IMAGE_URL,
        },
        title: 'Status Report',
        fields,
        color: process.env.NODE_ENV === 'development' ? BLUE : ORANGE,
      }),
    ];
  },
};
