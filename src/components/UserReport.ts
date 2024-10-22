import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

import { InteractionReplyData } from '@utils/Types';
import { capitalize } from '@utils/index';

import Component from '@managers/components/Component';

export default class UserReportComponent extends Component {
  constructor() {
    super({ matches: /^user-report-(accept|deny|disregard)$/m });
  }

  async execute(interaction: ButtonInteraction<'cached'>): Promise<InteractionReplyData | null> {
    const report = await this.prisma.userReport.findUnique({
      where: {
        id: interaction.message.id,
        guildId: interaction.guildId
      }
    });

    if (!report) {
      setTimeout(async () => {
        await interaction.message.delete().catch(() => null);
      }, 7000);

      return {
        error: 'Failed to fetch the related report. Log will delete in **7 seconds**.',
        temporary: true
      };
    }

    const action = interaction.customId.split('-')[2] as 'accept' | 'deny' | 'disregard';

    switch (action) {
      case 'disregard': {
        await this.prisma.userReport.update({
          where: { id: interaction.message.id },
          data: { status: 'Disregarded' }
        });

        await interaction.message.delete().catch(() => null);

        return {
          content: 'Successfully disregarded the report.',
          temporary: true
        };
      }

      case 'deny':
      case 'accept': {
        const reasonText = new TextInputBuilder()
          .setCustomId(`reason`)
          .setLabel('Reason')
          .setPlaceholder(`Enter the reason for ${action === 'accept' ? 'accepting' : 'denying'} this report`)
          .setRequired(true)
          .setMaxLength(1024)
          .setStyle(TextInputStyle.Paragraph);

        const actionRow = new ActionRowBuilder<TextInputBuilder>().setComponents(reasonText);

        const modal = new ModalBuilder()
          .setCustomId(`user-report-${action}-${report.id}`)
          .setTitle(`${capitalize(action)} Report`)
          .setComponents(actionRow);

        await interaction.showModal(modal);
        return null;
      }

      default:
        return {
          error: 'Unknown action.',
          temporary: true
        };
    }
  }
}