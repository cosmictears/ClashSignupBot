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

function buttonsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("top").setLabel("🛡️ Top").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("jungle").setLabel("🌲 Jungle").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("mid").setLabel("✨ Mid").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("adc").setLabel("🏹 ADC").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("support").setLabel("💙 Support").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("sub").setLabel("🔄 Sub").setStyle(ButtonStyle.Secondary)
  );
}

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "clash") {
      const sub = interaction.options.getSubcommand();

      if (sub === "create") {
        for (const r of Object.values(roles)) r.users = [];
        locked = false;

        const msg = await interaction.channel.send({
          embeds: [buildEmbed()],
          components: [buttonsRow()]
        });

        signupMessageId = msg.id;
        await interaction.reply({ content: "Clash signup created.", ephemeral: true });
      }

      if (sub === "lock") {
        locked = true;
        await interaction.reply({ content: "Signups locked.", ephemeral: true });
      }

      if (sub === "export") {
        let out = "";
        for (const r of Object.values(roles)) {
          out += `${r.label}: ${r.users.join(", ") || "—"}\n`;
        }
        await interaction.reply({ content: "```\n" + out + "\n```", ephemeral: true });
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
      components: [buttonsRow()]
    });
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

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

await rest.put(
  Routes.applicationGuildCommands(
    process.env.CLIENT_ID,
    process.env.GUILD_ID
  ),
  { body: commands }
);

client.login(process.env.DISCORD_TOKEN);
