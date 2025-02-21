import { Client, Events, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
let deck = [];

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

  function initializeDeck() {
    deck = [];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push({ rank, suit });
      });
    });
  }
  

const winnerWebhook = 'https://dash.gameserverapp.com/system-api/v2/task/70494/execute?service_id=';
const gameStartWebhook = 'https://dash.gameserverapp.com/system-api/v2/task/70495/execute?service_id=';
const gameState = new Map();
const gameChannelId = process.env.GAME_CHANNEL_ID;

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function drawCard() {
    return deck.pop();
}

function formatHand(hand) {
    return hand.map(card => cardEmojis[`${card.rank}${card.suit[0]}`] || `${card.rank}${card.suit[0]}`).join(' ');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.channel.id !== gameChannelId) return;

    if (message.content === '!texas') {
        initializeDeck();
        shuffleDeck();

        const playerHand = [drawCard(), drawCard()];
        const dealerHand = [drawCard(), drawCard()];
        const communityCards = [drawCard(), drawCard(), drawCard(), drawCard(), drawCard()];

        gameState.set(message.author.id, { playerHand, dealerHand, communityCards, isGameOver: false });

        const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle("Texas Hold'em Started!")
            .addFields(
                { name: "Your Hand", value: formatHand(playerHand) },
                { name: "Community Cards", value: formatHand(communityCards) }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('reveal').setLabel('Reveal').setStyle(ButtonStyle.Primary)
        );

        await message.reply({ embeds: [embed], components: [row] });
        await sendAPIRequest(gameStartWebhook, message.author.id);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    const userId = interaction.user.id;
    const state = gameState.get(userId);
    if (!state || state.isGameOver) return;

    if (interaction.customId === 'reveal') {
        state.isGameOver = true;

        const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle("Final Hands")
            .addFields(
                { name: "Your Hand", value: formatHand(state.playerHand) },
                { name: "Dealer's Hand", value: formatHand(state.dealerHand) },
                { name: "Community Cards", value: formatHand(state.communityCards) }
            );

        let resultMessage = "It's a tie!";
        const winner = determineWinner(state.playerHand, state.dealerHand, state.communityCards);
        if (winner === 'player') {
            resultMessage = "You win!";
            await sendAPIRequest(winnerWebhook, userId);
        } else if (winner === 'dealer') {
            resultMessage = "You lose!";
        }

        embed.setDescription(resultMessage);
        await interaction.update({ embeds: [embed], components: [] });
    }
});

// Placeholder winner determination function (needs proper hand evaluation)
function determineWinner(playerHand, dealerHand, communityCards) {
    return Math.random() > 0.5 ? 'player' : 'dealer'; // Random for now
}

// Improved API request function with debugging
async function sendAPIRequest(url, userId) {
    const serviceId = userId;
    if (!serviceId) {
        console.error("Service ID is undefined");
        return;
    }

    const apiUrl = `${url}${serviceId}`;
    console.log(`Sending API request to: ${apiUrl}`);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.AUTH_TOKEN}`
            }
        });

        const responseBody = await response.text();
        console.log("API Response:", responseBody);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error sending API request:', error);
    }
}

client.login(process.env.BOT_TOKEN);