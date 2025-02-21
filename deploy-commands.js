const fs = require('node:fs');
const path = require('node:path');

function getCommands() {
  const commandFiles = fs
    .readdirSync('./commands')
    .filter((file) => file.endsWith('.js'));

  const commands = [];

  for (const file of commandFiles) {
    const command = require(path.join(__dirname, '../commands', file));

    if (!command || !command.data) {
      console.error(`Command file ${file} is missing a 'data' property.`);
      continue;
    }

    if (typeof command.data.toJSON !== 'function') {
      console.error(
        `Command file ${file} has an invalid 'data' property. It must be a SlashCommandBuilder instance.`
      );
      continue;
    }

    commands.push(command.data.toJSON());
  }

  return commands;
}

module.exports = { getCommands };
