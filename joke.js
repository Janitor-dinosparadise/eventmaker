const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });


client.once('ready', () => {
  console.log('Joke Bot is online!');
});

client.on('messageCreate', async (message) => {
  if (message.content.toLowerCase() === '!joke') {
    try {
      const response = await axios.get('https://v2.jokeapi.dev/joke/Any', {
        params: { type: 'single', lang: 'en' },
      });

      if (response.data.type === 'single') {
        message.channel.send(response.data.joke);
      } else if (response.data.type === 'twopart') {
        message.channel.send(`${response.data.setup} - ${response.data.delivery}`);
      } else {
        message.channel.send("Sorry, I couldn't find a joke for you.");
      }
    } catch (error) {
      console.error(error);
      message.channel.send("Oops, something went wrong while fetching a joke.");
    }
  }
});

client.login(process.env.BOT_TOKEN);
