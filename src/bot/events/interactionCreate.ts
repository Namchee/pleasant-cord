import { Interaction, Message, EmbedBuilder, TextChannel } from 'discord.js';

import {
  EMPTY_EMBED,
  UNKNOWN_COMMAND_EMBED,
} from './../../constants/embeds.js';
import { BotContext, CommandHandlerParams } from '../types.js';

import { getCommands, handleError } from '../utils.js';

export default {
  event: 'interactionCreate',
  fn: async (ctx: BotContext, interaction: Interaction) => {
    if (
      !interaction.guild ||
      !interaction.channel ||
      !(interaction.isCommand() || interaction.isContextMenuCommand())
    ) {
      return;
    }

    let message = undefined;

    if (
      interaction.isMessageContextMenuCommand() &&
      interaction.targetMessage instanceof Message
    ) {
      message = interaction.targetMessage;
    }

    try {
      const commandMap = await getCommands();
      const handler = commandMap[interaction.commandName];

      let embeds: EmbedBuilder[] = [UNKNOWN_COMMAND_EMBED];

      if (handler) {
        const params: CommandHandlerParams = {
          guild: interaction.guild,
          channel: interaction.channel as TextChannel,
          timestamp: interaction.createdTimestamp,
          message,
        };

        const handlerEmbeds = await handler.fn(ctx, params);

        if (handlerEmbeds.length) {
          embeds = handlerEmbeds;
        } else {
          embeds = [EMPTY_EMBED];
        }
      }

      return interaction.reply({ embeds });
    } catch (err) {
      const errorEmbed = handleError(err as Error);

      if (errorEmbed) {
        return interaction.reply({ embeds: [errorEmbed] });
      }
    }
  },
};
