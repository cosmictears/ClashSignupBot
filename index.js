import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const roles = {
  top: { label: "🛡️ Top", max: 1, users: [] },
  jungle: { label: "🌲 Jungle", max: 1, users: [] },
  mid: { label: "✨ Mid", max: 1, users: [] },
  adc: { label: "🏹 ADC", max: 1, users: [] },
  support: { label: "💙 Support", max: 1, users: [] },
  sub: { label: "🔄 Sub", max: 2, users: [] }
};

let locked = false;
let signupMessageId = null;

function buildEmbed() {
  const embed = new EmbedBuilder()
    .setTitle("🏆 CLASH TEAM SIGNUP")
    .setColor(0x5865F2);

  for (const key in roles) {
    const r = roles[key];
    embed.addFields({
      name: r.label,
      value: r.users.length
        ? r.users.map(u => `• ${u}`).join("\n")
        : "—",
      inline: false
    });
  }

  embed.setFooter({ text: locked ? "🔒 Signups locked" : "Click a role to join" });
  return embed;
}

function clearUser(user) {
  for (const r of Object.values(roles)) {
    const i = r.users.indexOf(user);
    if (i !== -1) r.users.splice(i, 1);
  }
}

function buttonsRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("top").setLabel("🛡️ Top").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("jungle").setLabel("🌲 Jungle").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("mid").setLabel("✨ Mid").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("adc").setLabel("🏹 ADC").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("support").setLabel("💙 Support").setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("sub").setLabel("🔄 Sub").setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}


client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "clash") {
        const sub = interaction.options.getSubcommand();

        if (sub === "create") {
          await interaction.deferReply({ ephemeral: true });

          for (const r of Object.values(roles)) r.users = [];
          locked = false;

          const msg = await interaction.channel.send({
            embeds: [buildEmbed()],
            components: buttonsRows()
          });

          signupMessageId = msg.id;

          await interaction.editReply("Clash signup created.");
        }

        if (sub === "lock") {
          await interaction.deferReply({ ephemeral: true });
          locked = true;
          await interaction.editReply("Signups locked.");
        }

        if (sub === "export") {
          await interaction.deferReply({ ephemeral: true });

          let out = "";
          for (const r of Object.values(roles)) {
            out += `${r.label}: ${r.users.join(", ") || "—"}\n`;
          }

          await interaction.editReply("```\n" + out + "\n```");
        }
      }
    }

    if (interaction.isButton()) {
      if (locked) {
        return interaction.reply({ content: "Signups are locked.", ephemeral: true });
      }

      if (interaction.message.id !== signupMessageId) return;

      const role = roles[interaction.customId];
      if (!role) return;

      clearUser(interaction.user.username);

      if (role.users.length >= role.max) {
        return interaction.reply({ content: "That role is full.", ephemeral: true });
      }

      role.users.push(interaction.user.username);

      await interaction.update({
        embeds: [buildEmbed()],
        components: buttonsRows()
      });
    }
  } catch (err) {
    console.error("Interaction error:", err);
    if (interaction.isCommand() && !interaction.replied) {
      await interaction.reply({ content: "An error occurred.", ephemeral: true }).catch(() => {});
    }
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

const commands = [
  new SlashCommandBuilder()
    .setName("clash")
    .setDescription("Clash signup controls")
    .addSubcommand(s => s.setName("create").setDescription("Create signup"))
    .addSubcommand(s => s.setName("lock").setDescription("Lock signups"))
    .addSubcommand(s => s.setName("export").setDescription("Export team"))
];

// Wrap all async startup in main()
async function main() {
  try {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    await client.login(process.env.DISCORD_TOKEN);

    console.log("Bot deployed and ready!");
  } catch (error) {
    console.error("Error starting bot:", error);
  }
}

main();
