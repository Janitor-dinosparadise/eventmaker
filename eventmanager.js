// eventManager.js
const EventEmitter = require('events');
class BotEvents extends EventEmitter {}
const botEvents = new BotEvents();

// Set the max listeners to avoid memory warnings
botEvents.setMaxListeners(50);

// Export the event manager for other parts of your app
module.exports = botEvents;
