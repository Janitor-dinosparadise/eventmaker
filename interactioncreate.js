const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config(); // Load environment variables from .env file

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Load commands and initialize client.commands
client.commands = loadCommands('./commands');

/**
 * Function to load commands from the specified directory and its subdirectories.
 * @param {string} dir - The directory to load commands from.
 * @returns {Collection} - A collection of commands.
 */
function loadCommands(dir) {
  const commands = new Collection();
  const commandFiles = getFiles(dir);

  for (const commandFile of commandFiles) {
    try {
      const command = require(path.resolve(commandFile));
      if (command.data && command.data.name) {
        commands.set(command.data.name, command);
      } else {
        console.warn(`The file ${commandFile} does not have a valid 'data' property.`);
      }
    } catch (error) {
      console.error(`Failed to load command file ${commandFile}:`, error);
    }
  }
  return commands;
}

/**
 * Recursively get all .js files in a directory and its subdirectories.
 * @param {string} dir - The directory to scan for files.
 * @returns {string[]} - Array of file paths.
 */
function getFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = [...files, ...getFiles(fullPath)];
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Bot ready event
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Error executing command:', error);
    await interaction.reply({ content: 'There was an error executing this command.', flags: 64 });
  }
});

// Log in the bot using the token from .env
client.login(process.env.TOKEN);
