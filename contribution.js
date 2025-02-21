require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const axios = require('axios');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!DISCORD_TOKEN || !AUTH_TOKEN) {
  console.error('Missing environment variables. Please set DISCORD_TOKEN and AUTH_TOKEN in .env file.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

const ADMIN_ROLE_ID = 'ID OF ADMIN ';// replace this ones with you're own custom ones
const LEADERBOARD_FILE = 'NAME OF FILE YOU WANT';// replace this ones with you're own custom ones

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Function to read leaderboard from JSON file
const readLeaderboard = () => {
  try {
    if (!fs.existsSync(LEADERBOARD_FILE)) {
      fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(LEADERBOARD_FILE));
  } catch (error) {
    console.error('Error reading leaderboard file:', error);
    return {};
  }
};

// Function to update leaderboard
const updateLeaderboard = (userId, username) => {
  let leaderboard = readLeaderboard();
  if (!leaderboard[userId]) {
    leaderboard[userId] = { username, points: 0 };
  }
  leaderboard[userId].points += 1;

  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
};

// Function to reset leaderboard
const resetLeaderboard = () => {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify({}, null, 2));
};

// Function to send the webhook with retry logic and increased timeout
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const sendWebhookWithRetry = async (webhookUrl, payload, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log('Sending request to:', webhookUrl);
      await axios.post(webhookUrl, payload, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // Increased timeout to 30 seconds
      });
      console.log(`Webhook sent successfully on attempt ${attempt}`);
      return true;
    } catch (error) {
      console.error(`Failed attempt ${attempt}:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (attempt < retries) {
        console.log('Retrying...');
        await delay(1000 * attempt);
      } else {
        console.error('All retry attempts failed.');
        return false;
      }
    }
  }
};

// Function to handle webhook sending for all emojis
async function sendWebhook(helper, user, emojiType) {
  const serviceId = helper.id;
  const webhookUrl = `https://dash.gameserverapp.com/system-api/v2/task/${emojiType === '💩' ? '64431' : emojiType === '✅' ? 'TASK ID' : 'TASK ID'}/execute?service_id=${serviceId}`;// replace this ones with you're own custom ones
  
  const payload = {
    helper_id: helper.id,
    helper_username: helper.username,
    description: `${emojiType === '💩' ? 'Administrator' : emojiType === '✅' ? 'Helper' : 'Administrator'} ${user.username} recognized ${helper.username} for helping.`,
    timestamp: new Date().toISOString(),
  };

  console.log('Payload:', payload);

  const success = await sendWebhookWithRetry(webhookUrl, payload);
  if (success) {
    return true;
  } else {
    return false;
  }
}

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  const message = reaction.message;
  const guild = message.guild;

  const member = await guild.members.fetch(user.id).catch(console.error);
  if (!member || !member.roles.cache.has(ADMIN_ROLE_ID)) return;

  const helper = message.author;
  if (!helper || helper.bot) {
    console.error('Invalid helper or bot detected. Skipping.');
    return;
  }

  if (reaction.emoji.name === '💩' || reaction.emoji.name === '✅' || reaction.emoji.id === '1342222265915539516') {// replace this ones with you're own custom ones
    try {
      const success = await sendWebhook(helper, user, reaction.emoji.name);
  
      if (success) {
        updateLeaderboard(helper.id, helper.username);
      }

      if (reaction.emoji.name === '💩') {
        message.channel.send(
          `<@${helper.id}> has been recognized for being a jack ass. 1K tokens being deducted 💩💩`// replace this ones with you're own custom ones
        );
      } else if (reaction.emoji.name === '✅') {
        message.channel.send(
          `<@${helper.id}> has been recognized for helping! 🎉 😊`// replace this ones with you're own custom ones
        );
      } else if (reaction.emoji.id === '1342222265915539516') {
        await message.react('1342219144615166032');// replace this ones with you're own custom ones
      }
    } catch (error) {
      message.channel.send(
        `<@${helper.id}> Failed to send recognition, please add your Discord to our website 😢`// replace this ones with you're own custom ones
      );
    }
  }
});

// Leaderboard Command
client.on('messageCreate', async (message) => {
  if (message.content === '!leaderboard') {
    const leaderboard = readLeaderboard();
    if (Object.keys(leaderboard).length === 0) {
      return message.channel.send('No recognitions yet! 😢');
    }

    // Sort the leaderboard by points
    const sorted = Object.values(leaderboard).sort((a, b) => b.points - a.points);
    
    let leaderboardMessage = '**🏆 Recognition Leaderboard 🏆**\n';
    sorted.slice(0, 10).forEach((user, index) => {
      leaderboardMessage += `**${index + 1}.** ${user.username} - ${user.points} points\n`;
    });

    message.channel.send(leaderboardMessage);
  }

  // Reset Leaderboard Command
  if (message.content === '!resetleaderboard') {
    const member = await message.guild.members.fetch(message.author.id).catch(console.error);
    if (!member || !member.roles.cache.has(ADMIN_ROLE_ID)) {
      return message.channel.send('You do not have permission to reset the leaderboard.');
    }

    resetLeaderboard();
    message.channel.send('The leaderboard has been reset successfully! 🎉');
  }
});

client.login(DISCORD_TOKEN);
