require('events').setMaxListeners(20); // Or any suitable limit

const { Client, GatewayIntentBits, SlashCommandBuilder, Collection } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Load the janitor role ID from environment variables
const JANITOR_ROLE_ID = process.env.JANITOR_ROLE_ID; // Add this to your .env

// Define the file path to store the to-do list
const todoFilePath = path.join(__dirname, 'data', 'todo.json');

// Ensure the 'data' directory exists, create it if not
if (!fs.existsSync(path.dirname(todoFilePath))) {
  fs.mkdirSync(path.dirname(todoFilePath), { recursive: true });
}

const token = process.env.TOKEN;

// Initialize the client with the correct intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages
  ]
});

// Initialize commands collection and task list
client.commands = new Collection();
const todoList = [];

// Create the /todo command with subcommands
const todoCommand = new SlashCommandBuilder()
  .setName('todo')
  .setDescription('Manage the to-do list.')
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Add a task to the to-do list.')
      .addStringOption(option =>
        option.setName('task')
          .setDescription('The task to add.')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List all tasks in the to-do list.'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove a task from the to-do list by index.')
      .addIntegerOption(option =>
        option.setName('index')
          .setDescription('The index of the task to remove.')
          .setRequired(true)));

// Register the /todo slash command on bot startup
client.once('ready', () => {
  console.log('Bot is online!');

  // Load to-do list from file
  if (fs.existsSync(todoFilePath)) {
    const fileData = fs.readFileSync(todoFilePath, 'utf-8');
    todoList.push(...JSON.parse(fileData)); // Load tasks into memory
  } else {
    console.log('To-do list is empty or file does not exist, initializing...');
  }

  const guildId = '1203398643030302851';
  const guild = client.guilds.cache.get(guildId);

  if (guild) {
    guild.commands.create(todoCommand)
      .then(() => {
        console.log('Todo command registered successfully');
        client.commands.set(todoCommand.name, todoCommand);
      })
      .catch(err => console.error('Error registering command:', err));
  }
});

// Handle interaction for slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  if (interaction.commandName === 'todo') {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const task = interaction.options.getString('task');
      todoList.push(task);

      // Save the updated to-do list to the file
      fs.writeFileSync(todoFilePath, JSON.stringify(todoList, null, 2), 'utf-8');
      
      await interaction.reply(`Task added: "${task}"`);
    } else if (subcommand === 'list') {
      if (todoList.length === 0) {
        await interaction.reply('The to-do list is currently empty.');
      } else {
        const list = todoList.map((task, index) => `${index + 1}. ${task}`).join('\n');
        await interaction.reply(`**To-Do List:**\n${list}`);
      }
    } else if (subcommand === 'remove') {
      // Check if the user has the "janitor" role instead of ADMINISTRATOR permission
      if (!interaction.member.roles.cache.has(JANITOR_ROLE_ID)) {
        return interaction.reply('You do not have the required "janitor" role to remove tasks.');
      }

      const index = interaction.options.getInteger('index') - 1;

      if (index < 0 || index >= todoList.length) {
        return interaction.reply('Invalid task index.');
      }

      const removedTask = todoList.splice(index, 1);

      // Save the updated to-do list to the file
      fs.writeFileSync(todoFilePath, JSON.stringify(todoList, null, 2), 'utf-8');

      await interaction.reply(`Removed task: "${removedTask}"`);
    }
  }
});

// Login the bot
client.login(token);
