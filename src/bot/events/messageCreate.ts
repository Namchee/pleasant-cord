import { Message, EmbedBuilder, TextChannel } from 'discord.js';

import { moderateContent } from '../service/classifier.js';

import { handleError, getCommandFromMessage, getCommands } from '../utils.js';

import { BotContext, CommandHandlerParams } from '../types.js';

import { PREFIX } from '../../constants/command.js';
import { EMPTY_EMBED } from '../../constants/embeds.js';

export default {
  event: 'messageCreate',
  fn: async (
    ctx: BotContext,
    msg: Message
  ): Promise<Message<boolean> | void> => {
    try {
      if (!msg.guild || !msg.channel.isTextBased() || msg.author.bot) {
        return;
      }

      if (msg.partial) {
        await msg.fetch();
      }

      if (msg.content.startsWith(PREFIX)) {
        const commandMap = await getCommands();
        const handler = commandMap[getCommandFromMessage(msg.content)];

        let embeds: EmbedBuilder[] = [EMPTY_EMBED];

        if (handler) {
          const params: CommandHandlerParams = {
            guild: msg.guild,
            channel: msg.channel as TextChannel,
            timestamp: msg.createdTimestamp,
          };
          embeds = await handler.fn(ctx, params);
        }

        return msg.channel.send({ embeds });
      }

      return moderateContent(ctx, msg);
    } catch (err) {
      const errorEmbed = handleError(err as Error);

      if (errorEmbed) {
        return msg.channel.send({ embeds: [errorEmbed] });
      }
    }
  },
};
