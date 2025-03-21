import { Guild } from 'discord.js';

import { BotContext } from '../types.js';
import { handleError } from './../utils.js';

export default {
  event: 'guildDelete',
  fn: async ({ service }: BotContext, guild: Guild): Promise<void> => {
    try {
      // delete server config if the bot is removed from a guild.
      await service.deleteConfig(guild.id);
    } catch (err) {
      handleError(err as Error);
    }
  },
};
