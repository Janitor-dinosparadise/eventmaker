import { Client, Events, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];// replace this ones with you're own custom ones
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];// replace this ones with you're own custom ones
let deck = [];

// replace this ones with you're own custom ones 
const cardEmojis = {
  '2H': '<:2H:1341372262489522187>',
  '3H': '<:3H:1341372270760693760>',
  '4H': '<:4H:1341372276246839296>',
  '5H': '<:5H:1341373101916557343>',
  '6H': '<:6H:1341372290163806308>',
  '7H': '<:7H:1341372301387497493>',
  '8H': '<:8H:1341372257666072577>',
  '9H': '<:9H:1341372955065843712>',
  '10H': '<:10H:1341372322111688756>',
  'JH': '<:JH:1341178771520098324>',
  'QH': '<:QH:1341178776662310952>',
  'KH': '<:KH:1341178915041050736>',
  'AH': '<:AH:1341178763412639856>',

  '2D': '<:2D:1341372260916793404>',
  '3D': '<:3D:1341372264230424576>',
  '4D': '<:4D:1341372272149266432>',
  '5D': '<:5D:1341372286715822080>',
  '6D': '<:6D:1341372296828555397>',
  '7D': '<:7D:1341373106874224650>',
  '8D': '<:8D:1341372953421549641>',
  '9D': '<:9D:1341372313928728586>',
  '10D': '<:10D:1341376454671204452>',
  'JD': '<:JD:1341178773000683531>',
  'QD': '<:QD:1341178778436767764>',
  'KD': '<:KD:1341178786183643226>',
  'AD': '<:AD:1341178764805148742>',

  '2C': '<:2C:1341372265920725002>',
  '3C': '<:3C:1341372268772851775>',
  '4C': '<:4C:1341372278432337993>',
  '5C': '<:5C:1341372283163250811>',
  '6C': '<:6C:1341373105573990450>',
  '7C': '<:7C:1341372952029167688>',
  '8C': '<:8C:1341372304571109390>',
  '9C': '<:9C:1341372312238424085>',
  '10C': '<:10C:1341372325429514262>',
  'JC': '<:JC:1341178769972531220>',
  'QC': '<:QC:1341179573420818482>',
  'KC': '<:KC:1341178975380308009>',
  'AC': '<:AC:1341178768395341915>',

  '2S': '<:2S:1341372259486535691>',
  '3S': '<:3S:1341372267313233932>',
  '4S': '<:4S:1341373100427837500>',
  '5S': '<:5S:1341373103497941032>',
  '6S': '<:6S:1341372293258940487>',
  '7S': '<:7S:1341376390800609310>',
  '8S': '<:8S:1341372308694241342>',
  '9S': '<:9S:1341372318164713472>',
  '10S': '<:10S:1341372956714205226>',
  'JS': '<:JS:1341178774313635970>',
  'QS': '<:QS:1341178781947269210>',
  'KS': '<:KS:1341178790180818954>',
  'AS': '<:AS:1341178767078588416>',
};

// Populate the deck
function initializeDeck() {
  deck = [];
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({ rank, suit });
    });
  });
}

// API for sending win notifications
const winnerWebhook = 'https://dash.gameserverapp.com/system-api/v2/task//execute?service_id=';// replace this ones with you're own custom ones
const gameStartWebhook = 'https://dash.gameserverapp.com/system-api/v2/task//execute?service_id=';// replace this ones with you're own custom ones
const gameState = new Map();

// Get game channel ID from environment variables
const gameChannelId = process.env.GAME_CHANNEL_ID; // Set this to your specific channel ID

// Shuffle deck
function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap
  }
}

// Draw a card from the deck
function drawCard() {
  return deck.pop();
}

// Format the hand using custom card emojis
function formatHand(hand) {
  return hand.map(card => cardEmojis[`${card.rank}${card.suit[0]}`] || `${card.rank}${card.suit[0]}`).join(' ');
}

// Calculate hand total for Blackjack
function calculateHandTotal(hand) {
  let total = 0;
  let aceCount = 0;

  hand.forEach(card => {
    if (card.rank === 'A') {
      aceCount++;
      total += 11;
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank);
    }
  });

  // Adjust for aces
  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount--;
  }

  return total;
}

// Function to send API requests with delay and retry mechanism
async function sendAPIRequest(url, userId, delay = 2000) { // Default delay of 2 seconds
  const authToken = process.env.AUTH_TOKEN;
  const serviceId = userId;

  if (!serviceId) {
    console.error("Error: Couldn't retrieve service_id.");
    return;
  }

  const apiUrl = `${url}${serviceId}`;
  let retries = 10;
  let backoffTime = 1000; // start with 1s delay

  await new Promise(resolve => setTimeout(resolve, delay)); // Initial delay before first request

  while (retries > 0) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        console.log("API request successfully sent.");
        return; // Exit if the request was successful
      } else if (response.status === 429) {
        // Handle rate-limiting (HTTP 429)
        console.log("Rate limit reached, retrying...");
        await new Promise(resolve => setTimeout(resolve, backoffTime)); // Wait for backoff time
        backoffTime *= 2; // Exponential backoff
        retries--;
      } else {
        // Handle other failed requests
        console.error("Failed to send API request:", response.statusText);
        return;
      }
    } catch (error) {
      console.error('Error sending API request:', error);
      return;
    }
  }

  console.error('Max retries reached, failed to send API request');
}


const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  const userId = message.author.id;

  // Check if the message is in the allowed game channel for both games
  if (message.content === '!blackjack' || message.content === '!texas') {
    if (message.channel.id !== gameChannelId) {
      return message.reply(`Please use commands in the <#${gameChannelId}> channel.`);
    }
  }

  // Start the Blackjack game
  if (message.content === '!blackjack') {
    initializeDeck();
    shuffleDeck();

    // Deal hole cards for player and dealer
    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard()];

    // Store game state
    gameState.set(userId, { playerHand, dealerHand, isGameOver: false });

    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle("Blackjack Game Started")
      .setDescription("Press **Hit** to draw a card or **Stand** to end your turn.")
      .addFields(
        { name: "Your Hand", value: `${formatHand(playerHand)} (Total: ${calculateHandTotal(playerHand)})` },
        { name: "Dealer's Hand", value: `${formatHand(dealerHand)} (Total: ${calculateHandTotal(dealerHand)})` }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
    );

    await message.reply({ embeds: [embed], components: [row] });

    // Send API request when the game starts
    await sendAPIRequest(gameStartWebhook, userId);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const state = gameState.get(userId);
  if (!state || state.isGameOver) return;

  try {
    // Defer the interaction to avoid timeout issues
    await interaction.deferUpdate();

    if (interaction.customId === 'hit') {
      const playerCard = drawCard();
      state.playerHand.push(playerCard);

      const playerTotal = calculateHandTotal(state.playerHand);
      const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle("Your Turn")
        .setDescription("Press **Hit** to draw a card or **Stand** to end your turn.")
        .addFields(
          { name: "Your Hand", value: `${formatHand(state.playerHand)} (Total: ${playerTotal})` },
          { name: "Dealer's Hand", value: `${formatHand(state.dealerHand)} (Total: ${calculateHandTotal(state.dealerHand)})` }
        );

      await interaction.editReply({ embeds: [embed] });

      if (playerTotal > 21) {
        state.isGameOver = true;
        const resultEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle("You Bust!")
          .setDescription("You exceeded 21! You lose.")
          .addFields(
            { name: "Your Hand", value: `${formatHand(state.playerHand)} (Total: ${playerTotal})` },
            { name: "Dealer's Hand", value: `${formatHand(state.dealerHand)} (Total: ${calculateHandTotal(state.dealerHand)})` }
          );

        await interaction.editReply({ embeds: [resultEmbed], components: [] });
      }
    }

    if (interaction.customId === 'stand') {
      let dealerTotal = calculateHandTotal(state.dealerHand);
      while (dealerTotal < 17) {
        state.dealerHand.push(drawCard());
        dealerTotal = calculateHandTotal(state.dealerHand);
      }

      const playerTotal = calculateHandTotal(state.playerHand);
      let resultMessage = 'It\'s a draw!';
      if (playerTotal > dealerTotal || dealerTotal > 21) {
        resultMessage = 'You win!';
        await sendAPIRequest(winnerWebhook, userId);
      } else if (playerTotal < dealerTotal) {
        resultMessage = 'You lose!';
      }

      state.isGameOver = true;

      const resultEmbed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle(resultMessage)
        .addFields(
          { name: "Your Hand", value: `${formatHand(state.playerHand)} (Total: ${playerTotal})` },
          { name: "Dealer's Hand", value: `${formatHand(state.dealerHand)} (Total: ${dealerTotal})` }
        );

      await interaction.editReply({ embeds: [resultEmbed], components: [] });
    }
  } catch (error) {
    console.error("Error handling interaction:", error);
  }
});




client.login(process.env.BOT_TOKEN);
