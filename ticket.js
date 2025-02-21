const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const { ChannelType } = require('discord.js');
require('dotenv').config();

console.log('TICKET_CHANNEL_ID:', process.env.TICKET_CHANNEL_ID);
console.log('ADMIN_ROLE_ID:', process.env.ADMIN_ROLE_ID);
console.log('TICKET_CATEGORY_ID:', process.env.TICKET_CATEGORY_ID);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

// Paths and required variables
const ADMIN_ROLE_IDS = process.env.ADMIN_ROLE_ID.split(',');
const TICKET_CHANNEL_ID = process.env.TICKET_CHANNEL_ID;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const GAME_SERVER_BOT_NAME = 'GameServerApp';

// Ensure tickets file exists
const TICKET_FILE_PATH = './tickets.json';
if (!fs.existsSync(TICKET_FILE_PATH)) {
    fs.writeFileSync(TICKET_FILE_PATH, JSON.stringify([])); // Initialize empty array if the file doesn't exist
}

// Read tickets from the file
function readTicketsFromFile() {
    const data = fs.readFileSync(TICKET_FILE_PATH);
    return JSON.parse(data);
}

// Write tickets to the file
function writeTicketsToFile(tickets) {
    fs.writeFileSync(TICKET_FILE_PATH, JSON.stringify(tickets, null, 2));
}

client.once('ready', async () => {
    console.log(`${client.user.tag} is online!`);
    console.log("TICKET_CHANNEL_ID:", process.env.TICKET_CHANNEL_ID);
    console.log("TICKET_CATEGORY_ID:", TICKET_CATEGORY_ID);

    if (!TICKET_CATEGORY_ID) {
        console.error('TICKET_CATEGORY_ID is not set or is invalid!');
        return;
    }

    try {
        const category = await client.channels.fetch(TICKET_CATEGORY_ID);
        console.log('Fetched category:', category.name);
    } catch (error) {
        console.error('Error fetching category:', error);
    }
});

client.on('messageCreate', async (message) => {
    console.log(`Message received in ${message.channel.id}: ${message.content}`);

    // Check if the message is from the correct channel
    if (message.channel.id === TICKET_CHANNEL_ID) {
        console.log("Message is from the correct channel.");

        // Check if it's from a user or the GameServerApp bot
        if (!message.author.bot || message.author.username.toLowerCase() === GAME_SERVER_BOT_NAME.toLowerCase()) {
            console.log("Sending ticket embed...");

            const embed = new EmbedBuilder()
                .setTitle('🎟️ Ticket System')
                .setDescription('Press the button below to open a ticket.')
                .setColor(Colors.Blue);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('Open Ticket')
                        .setStyle(ButtonStyle.Primary)
                );

            await message.channel.send({ embeds: [embed], components: [row] });
        } else {
            console.log("Message ignored. It was from a different bot or another source.");
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, member, guild, channel } = interaction;

    // Create Ticket
    if (customId === 'create_ticket') {
        try {
            const tickets = readTicketsFromFile();

            const closedTicket = tickets.find(ticket => ticket.user_id === member.id && ticket.status === 'closed');

            if (closedTicket) {
                return interaction.reply({
                    content: 'You already have a closed ticket. Click below to reopen it!',
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('reopen_ticket')
                                .setLabel('Reopen Ticket')
                                .setStyle(ButtonStyle.Primary)
                        )
                    ],
                    flags: 64
                });
            }

            const existingTicket = tickets.find(ticket => ticket.user_id === member.id && ticket.status === 'open');
            if (existingTicket) {
                return interaction.reply({ content: 'You already have an open ticket!', flags: 64 });
            }

            const category = await guild.channels.fetch(TICKET_CATEGORY_ID);
            if (!category) return interaction.reply({ content: 'Ticket category not found!', flags: 64 });

            const ticketChannel = await guild.channels.create({
                name: `ticket-${member.user.username}`,
                type: ChannelType.GuildText, // text channel
                parent: category.id,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    ...ADMIN_ROLE_IDS.map(roleID => ({
                        id: roleID,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    }))
                ]
            });

            tickets.push({ user_id: member.id, channel_id: ticketChannel.id, status: 'open' });
            writeTicketsToFile(tickets);

            await interaction.reply({ content: `Ticket created: ${ticketChannel}`, flags: 64 });

            const ticketEmbed = new EmbedBuilder()
                .setTitle('📩 Support Ticket')
                .setDescription(`Hello <@${member.id}>, an admin will assist you shortly.`)
                .setColor(Colors.Green);

            await ticketChannel.send({ content: `<@${member.id}>`, embeds: [ticketEmbed] });

            const closeTicketRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                );

            await ticketChannel.send({ content: 'Click below to close this ticket.', components: [closeTicketRow] });

        } catch (error) {
            console.error('Error while creating ticket:', error);
            interaction.reply({ content: 'An error occurred while creating your ticket. Please try again later.', flags: 64 });
        }
    }

    // Close Ticket
    if (customId === 'close_ticket') {
        const tickets = readTicketsFromFile();
        const ticket = tickets.find(ticket => ticket.channel_id === channel.id);
    
        if (!ticket) {
            return interaction.reply({ content: 'This ticket was not found!', flags: 64 });
        }
    
        try {
            await interaction.deferUpdate();
    
            // Mark ticket as closed
            ticket.status = 'closed';
            writeTicketsToFile(tickets);
    
            const logsChannel = interaction.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
            if (logsChannel) {
                const reopenTicketRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('reopen_ticket')
                            .setLabel('Reopen Ticket')
                            .setStyle(ButtonStyle.Primary)
                    );
    
                const reopenTicketEmbed = new EmbedBuilder()
                    .setTitle('📩 Ticket Closed')
                    .setDescription(`The ticket has been closed. You can reopen it by clicking the button below. <@${ticket.user_id}>`)
                    .setColor(Colors.Yellow);
    
                await logsChannel.send({ embeds: [reopenTicketEmbed], components: [reopenTicketRow] });
            }
    
            await channel.delete();
    
        } catch (error) {
            console.error('Error while closing ticket:', error);
            interaction.followUp({ content: 'There was an error closing this ticket. Please try again later.', flags: 64 });
        }
    }
    

    // Reopen Ticket
    if (customId === 'reopen_ticket') {
        const tickets = readTicketsFromFile();
        const ticket = tickets.find(ticket => ticket.user_id === interaction.user.id && ticket.status === 'closed');
    
        if (!ticket) {
            return interaction.reply({ content: 'No closed ticket found for you!', flags: 64 });
        }
    
        try {
            await interaction.deferUpdate();
    
            // Update status to 'open'
            ticket.status = 'open';
            writeTicketsToFile(tickets);
    
            const category = interaction.guild.channels.cache.get(TICKET_CATEGORY_ID);
            const newChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                ],
            });
    
            // Update the ticket's channel ID
            ticket.channel_id = newChannel.id;
            writeTicketsToFile(tickets);
    
            const embed = new EmbedBuilder()
                .setColor(Colors.Blurple)
                .setTitle('Welcome back to your ticket!')
                .setDescription(`Hello <@${interaction.user.id}>, your ticket has been reopened. Please provide further details or ask your question here.`);
    
            await newChannel.send({ embeds: [embed] });
    
            const closeTicketRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                );
    
            await newChannel.send({ content: `Click below to close this ticket. You can access your ticket here: ${newChannel}`, components: [closeTicketRow] });
    
            return interaction.followUp({
                content: `Your ticket has been reopened! You can continue the conversation here: ${newChannel}`,
                flags: 64
            });
    
        } catch (error) {
            console.error('Error while reopening ticket:', error);
            interaction.followUp({ content: 'There was an error reopening your ticket. Please try again later.', flags: 64 });
        }
    }
    
});

client.login(process.env.TOKEN);
