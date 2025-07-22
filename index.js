const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PresenceUpdateStatus, ButtonBuilder, ButtonStyle, ActionRowBuilder, Events, ActivityType } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const config = require('./config.json');
let request = require('request');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk')
const rollDataPath = path.join(__dirname, 'rollcounts.json');
const userDataPath = path.join(__dirname, 'userdata.json');
const itemsPath = './useritems.json';
const blacklistPath = './lbBlacklist.json';
const auraDescriptionsPath = path.join(__dirname, 'auradescriptions.json');
const aurasPath = './auras.json';
const baseAuras = JSON.parse(fs.readFileSync('./auras.json'));
const biomeAuras = JSON.parse(fs.readFileSync('./biomeAuras.json'));
const allAuras = [...baseAuras, ...biomeAuras];
let biomeAurasByName = {};
const biomelogsPath = './biomelogs.json';
let biomelogWebhooks = fs.existsSync(biomelogsPath) ? JSON.parse(fs.readFileSync(biomelogsPath)) : {};

function saveBiomelogs() {
  fs.writeFileSync(biomelogsPath, JSON.stringify(biomelogWebhooks, null, 2));
}

// Build a map from aura name → biome
for (const aura of biomeAuras) {
  if (aura.biomeRarity) {
    for (const biomeName of Object.keys(aura.biomeRarity)) {
      biomeAurasByName[aura.name] = biomeName;
    }
  }
}

let auras = [];
if (fs.existsSync(aurasPath)) {
  auras = JSON.parse(fs.readFileSync(aurasPath));
}
const dreamspaceAuras = JSON.parse(fs.readFileSync('./dreamspaceAuras.json'));
const glitchedAuras = JSON.parse(fs.readFileSync('./glitchedAuras.json'));
const pumpkinMoonAuras = JSON.parse(fs.readFileSync('./pumpkinMoonAuras.json'));
const graveyardAuras = JSON.parse(fs.readFileSync('./graveyardAuras.json'));

const combinedAuras = [
  ...auras,
  ...Object.values(biomeAuras).flat(),
  ...dreamspaceAuras,
  ...glitchedAuras,
  ...pumpkinMoonAuras,
  ...graveyardAuras
];

let auraDescriptions = {};

const biomeRarityMap = new Map();

for (const aura of biomeAuras) {
  for (const biomeName in aura.biomeRarity) {
    biomeAurasByName[aura.name] = biomeName;
  }
}

const biomeThumbnails = {
  "Normal": "https://keylens-website.web.app/biomes/NORMAL.png",
  "Windy": "https://keylens-website.web.app/biomes/WINDY.png",
  "Snowy": "https://keylens-website.web.app/biomes/SNOWY.png",
  "Rainy": "https://keylens-website.web.app/biomes/RAINY.png",
  "Sand Storm": "https://keylens-website.web.app/biomes/SAND%20STORM.png",
  "Hell": "https://keylens-website.web.app/biomes/HELL.png",
  "Starfall": "https://keylens-website.web.app/biomes/STARFALL.png",
  "Corruption": "https://keylens-website.web.app/biomes/CORRUPTION.png",
  "Null": "https://keylens-website.web.app/biomes/NULL.png",
  "Pumpkin Moon": "https://keylens-website.web.app/biomes/PUMPKIN%20MOON.png",
  "Graveyard": "https://keylens-website.web.app/biomes/GRAVEYARD.png",
  "Glitched": "https://keylens-website.web.app/biomes/GLITCHED.png",
  "Dreamspace": "https://keylens-website.web.app/biomes/DREAMSPACE.png"
};

try {
  auraDescriptions = JSON.parse(fs.readFileSync(auraDescriptionsPath));
} catch (err) {
  console.log(chalk.redBright('No auraDescriptions.json found, using empty descriptions.'));
}

function reloadAuraPool() {
  try {
    auras = JSON.parse(fs.readFileSync('./auras.json', 'utf8'));

    // Refresh aurasWithWeights
    aurasWithWeights = auras
      .filter(a => !a.disabled)
      .map(aura => ({ aura, weight: aura.chance }));

    // Refresh biomeAuraList and biomeAurasByName
    biomeAuraList = auras.filter(a => a.nativeBiome);
    biomeAurasByName = {};
    for (const aura of biomeAuraList) {
      biomeAurasByName[aura.name.toLowerCase()] = aura;
    }

    console.log('🔄 Aura pool reloaded.');
  } catch (err) {
    console.error('❌ Failed to reload aura pool:', err);
  }
}

reloadAuraPool();

function getAuraColor(chanceIn) {
  if (chanceIn < 998) {
    return null;
  } else if (chanceIn <= 9998) {
    return 0xa464e8;
  } else if (chanceIn <= 99998) {
    return 0xff8000;
  } else if (chanceIn <= 999998) {
    return 0x39ffe8;
  } else if (chanceIn <= 9999998) {
    return 0xff73fd;
  } else if (chanceIn <= 9999999998) {
    return 0xa7e8e8;
  } else {
    return null;
  }
}

let leaderboardBlacklist = [];
if (fs.existsSync(blacklistPath)) {
  const raw = JSON.parse(fs.readFileSync(blacklistPath));
  console.log('🔍 Loaded blacklist raw:', raw);
  leaderboardBlacklist = Array.isArray(raw) ? raw : [];
}

function saveBlacklist() {
  fs.writeFileSync(blacklistPath, JSON.stringify(leaderboardBlacklist, null, 2));
}

const validItems = [
  "Mini Heavenly Potion",
  "BIG Heavenly Potion",
  "DEV POTION OF DOOM",
  "Gurt's Hatred"
  // Add more items here as needed
];

const activeMiniHevUsers = new Set(); // stores user IDs temporarily
const activeBigHevUsers = new Set(); // NEW: track BIG Heavenly Potion users
const activeDevPotionOfDoomUsers = new Set();
const activeGurtsHatredUsers = new Set();

// Load counts from file
let auraCounts = {};
try {
  auraCounts = JSON.parse(fs.readFileSync('rollcounts.json'));
} catch (err) {
  console.log(chalk.yellowBright('No existing roll counts file, starting fresh.'));
}

function saveAuraCounts() {
  fs.writeFileSync(rollDataPath, JSON.stringify(auraCounts, null, 2));
}

let userData = {};
if (fs.existsSync(userDataPath)) {
  userData = JSON.parse(fs.readFileSync(userDataPath));
}

let itemData = {};
if (fs.existsSync(itemsPath)) {
  itemData = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
}

const biomes = JSON.parse(fs.readFileSync('./biomes.json', 'utf8'));
const biomeStatePath = './biomeState.json';
let currentBiome = {
  name: 'Normal',
  endsAt: null,
  isDaytime: true,
  nextDayNightSwitch: Date.now() + 2 * 60 * 1000
};
let previousBiome = null;

if (fs.existsSync(biomeStatePath)) {
  try {
    const saved = JSON.parse(fs.readFileSync(biomeStatePath, 'utf8'));

    if (saved.name && typeof saved.isDaytime === 'boolean') {
      currentBiome.name = saved.name;
      currentBiome.endsAt = saved.endsAt || null;
      currentBiome.isDaytime = saved.isDaytime;
      currentBiome.nextDayNightSwitch = saved.nextDayNightSwitch || (Date.now() + 2 * 60 * 1000);
      console.log(`${chalk.bgGreenBright.black('OK')} Restored biome state: ${currentBiome.name}, ${currentBiome.isDaytime ? 'Day' : 'Night'}`);
    }
  } catch (err) {
    console.warn(chalk.yellowBright(`${chalk.bgYellowBright.black('WARN')} Failed to read biomeState.json:`), err);
  }
}

function saveBiomeState() {
  const state = {
    name: currentBiome.name,
    endsAt: currentBiome.endsAt,
    isDaytime: currentBiome.isDaytime,
    nextDayNightSwitch: currentBiome.nextDayNightSwitch
  };

  fs.writeFileSync(biomeStatePath, JSON.stringify(state, null, 2));
}

async function updateBotStatus() {
  try {
    let status = `${currentBiome.name} (${currentBiome.isDaytime ? 'Day' : 'Night'})`;

    if (currentBiome.name !== 'Normal' && currentBiome.endsAt) {
      const timeLeft = Math.max(0, Math.floor((currentBiome.endsAt - Date.now()) / 1000));
      status += ` | ${timeLeft}s left`;
    }

    await client.user.setActivity(status, { type: ActivityType.Watching });
  } catch (err) {
    console.error(chalk.redBright(`${chalk.bgRedBright.white('ERROR')} Failed to update bot status:`), err);
  }
}

function sendBiomeLog(biome, guildId) {
  const hooks = biomelogWebhooks?.[guildId] || [];

  const displayBiome = biome.name;
  const isNormal = biome.name === 'Normal';
  const thumbKey = Object.keys(biomeThumbnails).find(key => key.toLowerCase() === displayBiome.toLowerCase());
  const thumb = biomeThumbnails[thumbKey];

  const endsAt = currentBiome.endsAt;
  const seconds = endsAt ? Math.max(0, Math.floor((endsAt - Date.now()) / 1000)) : null;

  let description = `# ${displayBiome}`;
  if (!isNormal && seconds !== null) {
    description += `\n${seconds} seconds remain`;
  }

  const payload = {
    content: null,
    embeds: [{
      title: `Biome Started`,
      description: description,
      thumbnail: thumb ? { url: thumb } : undefined,
      color: 0x00bfff,
      timestamp: new Date().toISOString()
    }]
  };

  hooks.forEach(hook => {
    request.post(hook.url, { json: payload }, (err) => {
      if (err) console.error(`${chalk.bgRedBright.white('ERROR')}${chalk.red(` Failed to post biome log to ${hook.name}:`)}`, err);
    });
  });
}

function startBiome(biome, guildId) {
  previousBiome = { ...currentBiome }; // Store previous
  currentBiome.name = biome.name;
  currentBiome.endsAt = Date.now() + biome.duration * 1000;
  saveBiomeState(); // ✅
  updateBotStatus();
  sendBiomeLog(biome, guildId);
}

function startForcedBiome(biome, guildId) {
  previousBiome = { ...currentBiome }; // Store previous
  currentBiome.name = biome.name;
  currentBiome.endsAt = Date.now() + biome.duration * 1000;
  saveBiomeState(); // ✅
  updateBotStatus();
  sendBiomeLog(biome, guildId);
}

function saveItems() {
  fs.writeFileSync(itemsPath, JSON.stringify(itemData, null, 2));
}

function getUserItems(userId) {
  return itemData[userId] || {};
}

function saveUserItems(userId, userItems) {
  itemData[userId] = userItems;
  saveItems();
}

function saveUserData() {
  fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
}

function giveItem(userId, itemName, amount = 1) {
  if (!itemData[userId]) itemData[userId] = {};
  if (!itemData[userId][itemName]) itemData[userId][itemName] = 0;

  itemData[userId][itemName] += amount;
  saveItems();
}

function getInventory(userId) {
  return itemData[userId] || {};
}

function calculateUniqueCollectedStat(userAuras) {
  return Object.keys(userAuras).reduce((total, auraName) => {
    const foundAura = combinedAuras.find(a => a.name === auraName);
    const value = foundAura?.chanceIn || 0;
    return total + value;
  }, 0);
}

// Function to increment and save roll count
function recordRoll(userId) {
  if (!auraCounts[userId]) auraCounts[userId] = 0;

  auraCounts[userId]++;
  const totalRolls = auraCounts[userId];

  let gotPotion = false;

  if (totalRolls % 1750 === 0) {
    giveItem(userId, "Mini Heavenly Potion", 1);
    gotPotion = true;
    console.log(`🎉 Gave ${userId} a Mini Heavenly Potion for reaching a roll milestone!`)
  }

  if (totalRolls % 100000 === 0) {
    giveItem(userId, "Gurt's Hatred", 1);
    gotPotion = true;
    console.log(`🎉 Gave ${userId} a [ GURT'S HATRED ] for reaching a roll milestone!`)
  }

  if (totalRolls % 17500 === 0) {
    giveItem(userId, "BIG Heavenly Potion", 1);
    gotPotion = true;
    console.log(`🎉 Gave ${userId} a BIG Heavenly Potion for reaching a roll milestone!`)
  }

  saveAuraCounts();
  return { gotPotion, totalRolls };
}


// When a user rolls:
function recordAuraRoll(userId, auraCategory) {
  if (!userData[userId]) {
    userData[userId] = {};
  }

  if (!userData[userId][auraCategory]) {
    userData[userId][auraCategory] = 0;
  }

  userData[userId][auraCategory]++;
  saveUserData();
}

function getUserAuraSummary(userId) {
  const userAuras = userData[userId];
  if (!userAuras || Object.keys(userAuras).length === 0) {
    return "No auras rolled yet.";
  }

  const auraWeights = Object.fromEntries(
    [...auras, ...biomeAuras, ...dreamspaceAuras, ...glitchedAuras, ...pumpkinMoonAuras, ...graveyardAuras].map(a => [a.name, a.chanceIn])
  );

  const sorted = Object.entries(userAuras)
    .sort((a, b) => (auraWeights[b[0]] || 0) - (auraWeights[a[0]] || 0));

  return sorted
    .map(([aura, count]) => `${aura} (x${count})`)
    .join('\n');
}

const commands = [
  new SlashCommandBuilder().setName('roll').setDescription('Roll an aura!'),
  new SlashCommandBuilder().setName('biome').setDescription('See the current biome and time.'),
  new SlashCommandBuilder().setName('gurt').setDescription('Gurt!'),
  // new SlashCommandBuilder().setName('yo').setDescription('Yo!'),
  // new SlashCommandBuilder().setName('myrolls').setDescription('Check how many times you’ve rolled.'),
  new SlashCommandBuilder().setName('profile').setDescription('Lets you view info about your progress.'),
  //new SlashCommandBuilder().setName('roll leaderboard').setDescription('See the top rollers.'),
  //new SlashCommandBuilder().setName('stat leaderboard').setDescription('See the people with the highest collected stat.'),
  new SlashCommandBuilder().setName('collection').setDescription(`Shows the auras you've rolled.`),
  new SlashCommandBuilder().setName('inventory').setDescription("Check what's in your item inventory."),
  //new SlashCommandBuilder().setName('forceroll').setDescription('Force a specific aura roll (testing only)').addStringOption(option => option.setName('name').setDescription('Name of the aura to roll').setRequired(true)
  new SlashCommandBuilder().setName('dev').setDescription('Developer tools')
    .addSubcommand(sub =>
      sub.setName('forceroll')
        .setDescription('Force-roll a specific aura (developer only)')
        .addStringOption(option =>
          option.setName('aura')
            .setDescription('Name of the aura to force-roll')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('changebiome')
        .setDescription('Forcefully change the current biome (developer only)')
        .addStringOption(option =>
          option.setName('biome')
            .setDescription('The biome to switch to')
            .setRequired(true)
            .addChoices(
              ...biomes.map(b => ({ name: b.name, value: b.name }))
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('giveitem')
        .setDescription('Give yourself an item (developer only)')
        .addStringOption(option =>
          option.setName('item')
            .setDescription('Name of the item to give')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to recieve the item (defaults to you)')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount to give')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('blacklist')
        .setDescription('Add or remove a user from the leaderboard blacklist (developer only)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to modify in the blacklist')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Whether to add or remove the user')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('multiroll')
        .setDescription('Roll multiple times (developer only)')
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('How many times to roll')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10000000) // safe cap
        )
    )
    /*.addSubcommand(sub =>
      sub.setName('leaveguild')
        .setDescription('self-explanatory. temporary command. (developer only)')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Guild/server ID to leave')
            .setRequired(true)
        )
    )*/
    .addSubcommand(sub =>
      sub.setName('giveauras')
        .setDescription('Give yourself 1 of every aura (developer only)')
    )
    .addSubcommand(sub =>
      sub.setName('wipe')
        .setDescription('Wipe your data (rolls, inventory, auras)')
    )
    .addSubcommand(sub =>
      sub.setName('createaura')
        .setDescription('Create a new aura (developer only)')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Name of the aura')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('rarity')
            .setDescription('Rarity of the aura (1 in X chance)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Aura description')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('deleteaura')
        .setDescription('Delete an existing aura (developer only)')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Name of the aura to delete')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('lb')
    .setDescription('Leaderboards')
    .addSubcommand(sub =>
      sub.setName('stat')
        .setDescription('See the people with the highest collected stat.')
    )
    .addSubcommand(sub =>
      sub.setName('rolls')
        .setDescription('See the people with the most rolls.')
    ),
  new SlashCommandBuilder()
    .setName('useitem')
    .setDescription('Use an item from your inventory')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('The item to use (if theres no options your inv is empty)')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName('aurainfo')
    .setDescription('Get detailed info about an aura you own')
    .addStringOption(option =>
      option.setName('aura')
        .setDescription('The aura to inspect')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName('biomelogs')
    .setDescription('Manage biome logs in this server.')
    .addSubcommand(sub =>
      sub.setName('addhook')
        .setDescription('Add a biomelogs webhook to this server.')
        .addStringOption(option => option
          .setName('webhookurl')
          .setDescription('The URL of the webhook to POST biome messages to')
          .setRequired(true)
        )
    ).addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List the biomelogs webhooks in this server.')
    ).addSubcommand(sub =>
      sub.setName('removehook')
        .setDescription('Remove a biomelogs webhook from this server.')
        .addStringOption(option =>
          option.setName('webhookname')
            .setDescription('Name of the webhook to remove')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);


/*
// Convert "1 in X" odds into weights
function getAuraWeight(aura, currentBiomeName) {
  if (aura.biomeRarity && aura.biomeRarity[currentBiomeName]) {
    return 1 / aura.biomeRarity[currentBiomeName];
  }
  return 1 / aura.chanceIn;
}
*/

function buildAuraPool(biomeName, isDaytime) {
  const timeKey = isDaytime ? 'Daytime' : 'Nighttime';

  return allAuras.map(aura => {
    let weight = 1 / aura.chanceIn;

    if (aura.biomeRarity) {
      if (aura.biomeRarity[biomeName]) {
        weight = 1 / aura.biomeRarity[biomeName];
      } else if (aura.biomeRarity[timeKey]) {
        weight = 1 / aura.biomeRarity[timeKey];
      }
    }

    return { name: aura.name, weight };
  });
}

// Preprocessing step: build cumulative weights
function buildCumulative(auras) {
  let total = 0;
  return auras.map(aura => {
    total += aura.weight;
    return { ...aura, cumulative: total };
  });
}

const auraValues = Object.fromEntries(
  auras.map(aura => [aura.name, aura.chanceIn])
);

async function roll(interaction, isButton = false, couldntDisable) {
  // let rollPool = buildAuraPool(currentBiome.name, currentBiome.isDaytime);
  const usingMiniPotion = activeMiniHevUsers.has(interaction.user.id);
  const usingBigPotion = activeBigHevUsers.has(interaction.user.id);
  const usingDevPotionOfDoom = activeDevPotionOfDoomUsers.has(interaction.user.id);
  const usingGurtsHatred = activeGurtsHatredUsers.has(interaction.user.id);

  let auraPool;

  if (currentBiome.name === 'Dreamspace') {
    auraPool = [
      ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
      ...dreamspaceAuras.map(a => ({
        name: a.name,
        weight: 1 / a.chanceIn
      }))
    ];
  } else if (currentBiome.name === 'Glitched') {
    // Use native biome rarities instead of normal
    auraPool = [
      ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
      ...biomeAuras
        .filter(a => a.biomeRarity)
        .map(a => {
          const biomeChanceIn = Object.values(a.biomeRarity)[0];
          return {
            name: a.name,
            weight: 1 / biomeChanceIn
          };
        }),
      ...glitchedAuras.map(a => ({
        name: a.name,
        weight: 1 / a.chanceIn
      }))
    ];
  } else if (currentBiome.name === 'Pumpkin Moon') {
    auraPool = [
      ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
      ...pumpkinMoonAuras.map(a => ({
        name: a.name,
        weight: 1 / a.chanceIn
      }))
    ];
  } else if (currentBiome.name === 'Graveyard') {
    auraPool = [
      ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
      ...graveyardAuras.map(a => ({
        name: a.name,
        weight: 1 / a.chanceIn
      }))
    ];
  } else {
    auraPool = buildAuraPool(currentBiome.name, currentBiome.isDaytime);
  }

  if (usingBigPotion) {
    auraPool = auraPool.filter(a => 1 / a.weight >= 99000);
    activeBigHevUsers.delete(interaction.user.id); // Consume BIG potion
  } else if (usingMiniPotion) {
    auraPool = auraPool.filter(a => 1 / a.weight >= 9999);
    activeMiniHevUsers.delete(interaction.user.id); // Consume MINI potion
  } else if (usingDevPotionOfDoom) {
    auraPool = auraPool.filter(a => 1 / a.weight >= 99999998);
    activeDevPotionOfDoomUsers.delete(interaction.user.id); // Consume DEV potion OF DOOM!!!
  } else if (usingGurtsHatred) {
    auraPool = auraPool.filter(a => 1 / a.weight >= 999999);
    activeGurtsHatredUsers.delete(interaction.user.id); // Consume GURT'S HATRED
  }
  if (!auras || auras.length === 0) {
    throw new Error("No auras available to roll from.");
  }

  // Final adjustments to auraPool before rolling
  if (activeMiniHevUsers.has(interaction.user.id)) {
    auraPool = auraPool.filter(a => 1 / a.weight >= 9999);
    activeMiniHevUsers.delete(interaction.user.id);
  }

  if (activeBigHevUsers.has(interaction.user.id)) {
    auraPool = auraPool.filter(a => 1 / a.weight >= 99000);
    activeBigHevUsers.delete(interaction.user.id);
  }

  if (activeDevPotionOfDoomUsers.has(interaction.user.id)) {
    auraPool = auraPool.filter(a => 1 / a.weight >= 99999998);
    activeDevPotionOfDoomUsers.delete(interaction.user.id);
  }

  if (activeGurtsHatredUsers.has(interaction.user.id)) {
    auraPool = auraPool.filter(a => 1 / a.weight >= 999999);
    activeGurtsHatredUsers.delete(interaction.user.id);
  }

  const the_aura = getRandomAura(auraPool);

  // calculate coins from aura rarity
  const auraChanceIn = Math.round(1 / the_aura.weight);
  const coinsEarned = Math.min(auraChanceIn, 1000);

  // give the coins as an item
  giveItem(interaction.user.id, 'Coin', coinsEarned);
  // console.log(`💰 ${interaction.user.tag} earned ${coinsEarned} coins`);

  const percentage = the_aura.weight * 100;
  const chanceIn = Math.round(100 / percentage);
  const isEphemeral = chanceIn < 998;

  let identificationObject;

  if (config.identifyConsoleLoggedRolls) {
    identificationObject = {
      username: interaction.user.username,
      id: interaction.user.id
    }
  }

  if (couldntDisable != null) {
    console.log(chalk.bgBlue.white('ROLL'), the_aura, couldntDisable ? '[⚠️]' : '', identificationObject ? identificationObject : '')
  } else { console.log(chalk.bgBlue.white('ROLL'), the_aura, identificationObject ? identificationObject : '') }

  let color;
  if (chanceIn >= 1_000_000_000) {
    color = 0x83ddf1; // Light Blue (1B+)
  } else if (chanceIn >= 100_000_000) {
    color = 0xbb2022; // Deep Red (100M+)
  } else if (chanceIn >= 10_000_000) {
    color = 0x1e0bf1; // Royal Blue (10M+)
  } else if (chanceIn >= 1_000_000) {
    color = 0xf059d1; // Pink (1M+)
  } else if (chanceIn >= 100_000) {
    color = 0x39ffe8; // Cyan
  } else if (chanceIn >= 10_000) {
    color = 0xff8000; // Orange
  } else if (chanceIn >= 998) {
    color = 0xa464e8; // Purple
  } else {
    color = null;
  }



  const { gotPotion, totalRolls } = recordRoll(interaction.user.id);
  let footerText = `Roll #${totalRolls.toLocaleString()} | +${coinsEarned} coins`;
  let description = `# ${the_aura.name}\n[ 1 in ${chanceIn.toLocaleString()} ]`;

  //if (gotPotion) {
  //description += `\n\n🎁 You earned a free **Mini Heavenly Potion** for reaching **${totalRolls} rolls!**`;
  //}

  const replyEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle('You rolled...')
    .setDescription(description)
    .setFooter({ text: footerText });

  const rewardEmbed = new EmbedBuilder()
    .setColor(null)
    .setDescription(`🎁 You earned a free item for reaching **${totalRolls} rolls!**`)

  const againButton = new ButtonBuilder()
    .setCustomId('again')
    .setLabel('Roll Again')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(againButton);

  const replyPayload = {
    content: isEphemeral ? null : `<@${interaction.user.id}>`,
    embeds: [replyEmbed],
    components: [row]
  };

  if (gotPotion) {
    replyPayload.embeds = [replyEmbed, rewardEmbed]
  }

  try {
    if (interaction.isChatInputCommand?.()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ ...replyPayload, ephemeral: isEphemeral });
      } else {
        await interaction.reply({ ...replyPayload, ephemeral: isEphemeral });
      }
    } else if (interaction.isButton?.() || isButton) {
      await interaction.followUp({ ...replyPayload, ephemeral: isEphemeral });
    }
  } catch (err) {
    console.error(chalk.redBright(`${chalk.bgRedBright.white('ERROR')} Failed to respond to interaction:`), err);
  }

  if (config.rollLogWebhookUrl) {
    request.post(
      config.rollLogWebhookUrl,
      {
        json: {
          content: `You rolled: **${the_aura.name}**! [ 1 in ${chanceIn} or ${percentage}% chance ] (<@${interaction.user.id}>)`,
          embeds: null,
          attachments: []
        }
      },
      function (error, response, body) {
        if (error || response.statusCode !== 204) {
          console.error(`${chalk.bgRedBright.white('ERROR')} ${chalk.red(` Failed to send to rollLogWebhookUrl:`)}`, response?.statusCode, error?.message || body);
        }
      }
    );
  }

  recordAuraRoll(interaction.user.id, the_aura.name);
}

function getRandomAura(auras) {
  const cumulativeAuras = buildCumulative(auras);
  const roll = Math.random() * cumulativeAuras[cumulativeAuras.length - 1].cumulative;

  for (let aura of cumulativeAuras) {
    if (roll < aura.cumulative) {
      return aura;
    }
  }

  // Failsafe (should never happen)
  return cumulativeAuras[cumulativeAuras.length - 1].name;
}

client.on('ready', async () => {
  console.log(`${chalk.bgGreenBright.black('OK')} Logged in as ${client.user.tag}!`);
  console.log(`${chalk.bgGreenBright.black('OK')} Valid items loaded:`, validItems);
  console.log(`${chalk.bgBlue.white('!')} Preparing to deploy the following commands:`)
  for (const command of commands.values()) {
    console.log(chalk.bgBlue.white('Command Name:'), command.name);
  }
  const guilds = client.guilds.cache.map(guild => guild.id);
  if (config.rollingAllowed) {
    client.user.setStatus(PresenceUpdateStatus.Online);
    console.log(`Set status to ${chalk.green('Online')}`);
  }
  else {
    client.user.setStatus(PresenceUpdateStatus.Idle);
    console.log(`Set status to ${chalk.yellow('Idle')}`);
  }
  for (const guild of client.guilds.cache.values()) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, guild.id),
        { body: commands }
      );
      console.log(`${chalk.bgGreenBright.black('OK')} Registered commands in guild: ${guild.name} (${guild.id})`);
    } catch (err) {
      console.error(chalk.redBright(`${chalk.bgRedBright.white('ERROR')} Failed to register in guild ${guild.name} (${guild.id}):`), err);
    }
  }
  // Start the biome logic loop (runs every 1 second)
  setInterval(() => {
    try {
      const now = Date.now();

      if (currentBiome.name !== 'Normal' && currentBiome.endsAt && now >= currentBiome.endsAt) {
        for (const guild of client.guilds.cache.values()) {
          startBiome({ name: 'Normal', duration: 0 }, guild.id);
        }
        console.log(`🌍 Biome switched to Normal`);
      }

      if (Math.floor(Math.random() * 300_000) === 0) {
        const dream = biomes.find(b => b.name === 'Dreamspace');
        for (const guild of client.guilds.cache.values()) {
          startBiome(dream, guild.id);
        }
        console.log(`🌍 Biome switched to Dreamspace`);
        return;
      }

      if (currentBiome.name === 'Normal') {
        for (const biome of biomes) {
          if (["Normal", "Glitched", "Dreamspace"].includes(biome.name)) continue;
          if (Math.floor(Math.random() * biome.chance) === 0) {
            // We selected biome; now roll for Glitched
            let finalBiome = biome;
            const glitchedBiome = biomes.find(b => b.name === 'Glitched');
            if (glitchedBiome && Math.floor(Math.random() * glitchedBiome.chance) === 0) {
              finalBiome = biomes.find(b => b.name === 'Glitched');
            }

            previousBiome = { ...currentBiome };
            console.log(`🌍 Biome switched to ${finalBiome.name}`);
            for (const guild of client.guilds.cache.values()) {
              startBiome(finalBiome, guild.id);
            }
            return;
          }
        }
      }

      if (now >= currentBiome.nextDayNightSwitch) {
        currentBiome.isDaytime = !currentBiome.isDaytime;
        currentBiome.nextDayNightSwitch = now + 2 * 60 * 1000;
        console.log(`🌗 Switched to ${currentBiome.isDaytime ? 'day' : 'night'}`);
        saveBiomeState();
      }

    } catch (err) {
      console.error(chalk.redBright(`${chalk.bgRedBright.white('ERROR')} Biome loop error:`), err);
    }
  }, 1000);

  // Start the status update loop (every 5 seconds)
  setInterval(() => {
    updateBotStatus(); // note: this function is async but we don't need to await here
  }, 5000);

});

client.on('guildCreate', async (guild) => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, guild.id),
      { body: commands }
    );
    console.log(`${chalk.bgGreenBright.black('OK')} Registered commands in new guild: ${guild.name} (${guild.id})`);
  } catch (err) {
    console.error(chalk.redBright(`${chalk.bgRedBright.white('ERROR')} Failed to register in new guild ${guild.name} (${guild.id}):`), err);
  }
});

client.on('guildDelete', (guild) => {
  console.log(`${chalk.bgRedBright.white('!!!')} Removed from guild: ` + guild.name + ' (' + guild.id + ')')
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const userId = interaction.user.id;
  const username = interaction.user.username;

  if (interaction.commandName === 'roll') {
    if (config.rollingAllowed) {
      await roll(interaction)
    }
    else {
      if (interaction.user.id != config.adminId) {
        console.log('Cannot roll! Roll service unavailable')
        const replyEmbed = new EmbedBuilder()
          .setColor(0xe65a5a)
          .setTitle('Unavailable')
          .setDescription('# The bot is currently being tested, updated, or is not available at this point.')
          .setFooter({ text: 'Please try again later.', iconURL: null });
        try {
          await interaction.reply({ embeds: [replyEmbed] });
        } catch (err) {
          if (err.code === 10062) {
            console.warn("⚠️ Interaction expired before reply could be sent.");
          } else {
            console.error("❌ Failed to reply to interaction:", err);
          }
        }
      }
      else {
        await roll(interaction)
      }

    }
  }

  if (interaction.commandName === 'profile') {
    const count = auraCounts[userId] || 0;

    // Find their rarest aura (lowest chanceIn)
    const userAuraNames = Object.keys(userData[userId] || {});
    let rarestAura = null;

    for (const auraName of userAuraNames) {
      const aura = combinedAuras.find(a => a.name === auraName);
      if (!aura) continue;

      if (!rarestAura || (aura.chanceIn && aura.chanceIn > rarestAura.chanceIn)) {
        rarestAura = aura;
      }
    }

    // Sort users by rolls
    const sortedRolls = Object.entries(auraCounts)
      .filter(([userId]) => !leaderboardBlacklist.includes(userId)) // 👈 exclude blacklisted users
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id);

    // Sort users by collected stat
    const sortedCollected = Object.entries(userData)
      .filter(([userId]) => !leaderboardBlacklist.includes(userId)) // 👈 exclude blacklisted users
      .map(([id, auras]) => ({
        id,
        stat: calculateUniqueCollectedStat(auras)
      }))
      .sort((a, b) => b.stat - a.stat)
      .map(obj => obj.id);

    const rollRank = sortedRolls.indexOf(userId) + 1;
    const statRank = sortedCollected.indexOf(userId) + 1;

    const profileEmbed = new EmbedBuilder()
      .setColor(6376406)
      .setDescription(`# ${interaction.user.username}'s profile`)
      .setThumbnail(interaction.user.avatarURL())
      .setFields(
        {
          name: "Rolls",
          value: count.toLocaleString(),
          inline: true,
        },
        {
          name: "Collected Stat",
          value: calculateUniqueCollectedStat(userData[userId] || {}).toLocaleString(),
          inline: true,
        },
        {
          name: "Rarest Aura",
          value: rarestAura ? `${rarestAura.name} (1 in ${rarestAura.chanceIn.toLocaleString()})` : "None",
          inline: false,
        },
        {
          name: "Leaderboard Placements",
          value: `Rolls: #${rollRank || "?"}\nCollected Stat: #${statRank || "?"}`,
          inline: false,
        },
      );
    try {
      await interaction.reply({ embeds: [profileEmbed] })
    } catch (err) {
      if (err.code === 10062) {
        console.warn("⚠️ Interaction expired before reply could be sent.");
      } else {
        console.error("❌ Failed to reply to interaction:", err);
      }
    }
  }

  /* if (interaction.commandName === 'myrolls') {
    const count = auraCounts[userId] || 0;
    await interaction.reply(`You’ve rolled **${count}** time${count === 1 ? '' : 's'}.`);
  } */

  if (interaction.commandName === 'biome') {
    const timeLeft = currentBiome.endsAt
      ? Math.max(0, Math.floor((currentBiome.endsAt - Date.now()) / 1000))
      : null;

    const embed = new EmbedBuilder()
      .setTitle(null)
      .setThumbnail(biomeThumbnails[currentBiome.name] || null)
      .setFooter({ text: currentBiome.isDaytime ? "Daytime" : "Nighttime" });

    if (currentBiome.name !== "Normal" && currentBiome.endsAt) {
      const timeLeft = Math.max(0, Math.floor((currentBiome.endsAt - Date.now()) / 1000));
      embed.setDescription(`# ${currentBiome.name}\n⏳ Ends in: ${timeLeft} seconds`);
    }
    if (currentBiome.name == "Normal") {
      const timeLeft = Math.max(0, Math.floor((currentBiome.endsAt - Date.now()) / 1000));
      embed.setDescription(`# ${currentBiome.name}\nThe current biome is normal.`);
    }

    try {
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      if (err.code === 10062) {
        console.warn("⚠️ Interaction expired before reply could be sent.");
      } else {
        console.error("❌ Failed to reply to interaction:", err);
      }
    }
  }

  if (interaction.commandName === 'collection') {
    const userId = interaction.user.id;
    const userAuras = userData[userId];

    if (!userAuras || Object.keys(userAuras).length === 0) {
      const emptyCollectionEmbed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Aura Collection`)
        .setDescription('You haven’t rolled any auras yet.')
        .setColor(0x999999)
      return interaction.reply({
        embeds: [
          emptyCollectionEmbed
        ]
      });
    }

    const auraWeights = Object.fromEntries(
      [...auras, ...biomeAuras, ...dreamspaceAuras, ...glitchedAuras, ...pumpkinMoonAuras, ...graveyardAuras].map(a => [a.name, a.chanceIn])
    );

    const sortedAuras = Object.entries(userAuras)
      .sort((a, b) => (auraWeights[b[0]] || 0) - (auraWeights[a[0]] || 0)); // rarest first

    const perPage = 15;
    const totalPages = Math.ceil(sortedAuras.length / perPage);
    const page = 1;

    const buildPageEmbed = (pageNum) => {
      const start = (pageNum - 1) * perPage;
      const end = start + perPage;
      const pageData = sortedAuras.slice(start, end);

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Aura Collection`)
        .setColor(0x00bfff)
        .setFooter({ text: `Page ${pageNum} of ${totalPages}` });

      const description = pageData
        .map(([aura, count]) => `${aura} (x${count})`)
        .join('\n');

      embed.setDescription(description || 'No auras on this page.');
      return embed;
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`collection_next_${userId}_2`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(totalPages <= 1)
    );

    try {
      await interaction.reply({
        embeds: [buildPageEmbed(page)],
        components: [row]
      });
    } catch (err) {
      if (err.code === 10062) {
        console.warn("⚠️ Interaction expired before reply could be sent.");
      } else {
        console.error("❌ Failed to reply to interaction:", err);
      }
    }
  }

  if (interaction.commandName === 'inventory') {
    const userId = interaction.user.id;
    const inventory = getInventory(userId);

    if (!inventory || Object.keys(inventory).length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Inventory`)
        .setDescription('📦 Your inventory is empty.')
        .setColor(null)
        .setFooter({ iconURL: null, text: "Note: Please do NOT use any two potions at the same time! I haven't made it disallow that yet and it won't give you more luck!" });
      return interaction.reply({ embeds: [emptyEmbed] });
    }

    const description = Object.entries(inventory)
      .map(([item, qty]) => `• **${item}** ×${qty}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Inventory`)
      .setDescription(description)
      .setColor(0x00bfff)
      .setFooter({ iconURL: null, text: "Note: Please do NOT use any two potions at the same time! I haven't made it disallow that yet and it won't give you more luck!" });

    try {
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      if (err.code === 10062) {
        console.warn("⚠️ Interaction expired before reply could be sent.");
      } else {
        console.error("❌ Failed to reply to interaction:", err);
      }
    }
  }

  if (interaction.commandName === 'lb') {

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'stat') {
      await interaction.deferReply();
      const userScores = Object.entries(userData)
        .filter(([userId]) => !leaderboardBlacklist.includes(userId)) // 👈 exclude blacklisted users
        .map(([userId, userAuras]) => {
          return {
            userId,
            score: calculateUniqueCollectedStat(userAuras)
          };
        });

      const topUsers = userScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      const leaderboard = await Promise.all(
        topUsers.map(async ({ userId, score }, index) => {
          let user;
          try {
            user = await client.users.fetch(userId);
          } catch {
            user = { username: "Unknown User" };
          }

          return `**${index + 1}.** ${user.username} — **${score.toLocaleString()}** collected stat`;
        })
      );

      const replyEmbed1 = new EmbedBuilder().setTitle(`🌟 **Top Collected Stat**`).setDescription(`${leaderboard.join('\n')}`)
      await interaction.editReply({ embeds: [replyEmbed1] })
    }
    else if (subcommand === "rolls") {
      await interaction.deferReply();
      const sorted = Object.entries(auraCounts)
        .filter(([userId]) => !leaderboardBlacklist.includes(userId)) // 👈 exclude blacklisted users
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      const leaderboardText = await Promise.all(
        sorted.map(async ([id, count], index) => {
          let user;
          try {
            user = await client.users.fetch(id);
          } catch (e) {
            user = { username: "Unknown User" };
          }

          return `**${index + 1}.** ${user.username} — **${count.toLocaleString()}** roll${count === 1 ? '' : 's'}`;
        })
      );

      const replyEmbed2 = new EmbedBuilder().setTitle(`🏆 **Top Rollers**`).setDescription(`${leaderboardText.join('\n')}`)
      await interaction.editReply({ embeds: [replyEmbed2] })
    }
  }

  if (interaction.commandName === 'dev') {
    const devIds = [config.adminId];

    if (!devIds.includes(interaction.user.id)) {
      return interaction.reply({ content: '<:no:1390740593306632394> You do not have permission to use this.' });
    }

    const subcommand = interaction.options.getSubcommand();


    if (subcommand === 'forceroll') {
      const name = interaction.options.getString('aura');

      if (!name) {
        return interaction.reply({
          content: "⚠️ You must provide an aura name.",
          ephemeral: true
        });
      }

      const allAuras = [...auras, ...biomeAuras, ...dreamspaceAuras, ...glitchedAuras, ...pumpkinMoonAuras, ...graveyardAuras];
      const the_aura = allAuras.find(a => a.name.toLowerCase() === name.toLowerCase());

      if (!the_aura) {
        try {
          await interaction.reply({ content: `<:no:1390740593306632394> Aura "${name}" not found.`, ephemeral: true });
        } catch (err) {
          if (err.code === 10062) {
            console.warn("⚠️ Interaction expired before reply could be sent.");
          } else {
            console.error("❌ Failed to reply to interaction:", err);
          }
        }
        return;
      }

      const chanceIn = the_aura.chanceIn || 1;

      // 🌈 Match roll() embed color logic
      let color;
      if (chanceIn >= 1_000_000_000) {
        color = 0x83ddf1; // Light Blue (1B+)
      } else if (chanceIn >= 100_000_000) {
        color = 0xbb2022; // Deep Red (100M+)
      } else if (chanceIn >= 10_000_000) {
        color = 0x1e0bf1; // Royal Blue (10M+)
      } else if (chanceIn >= 1_000_000) {
        color = 0xf059d1; // Pink (1M+)
      } else if (chanceIn >= 100_000) {
        color = 0x39ffe8; // Cyan
      } else if (chanceIn >= 10_000) {
        color = 0xff8000; // Orange
      } else if (chanceIn >= 998) {
        color = 0xa464e8; // Purple
      } else {
        color = null;
      }



      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('You rolled...')
        .setDescription(`# ${the_aura.name}\n[ 1 in ${chanceIn.toLocaleString()} ]`)
        .setFooter({ text: 'Roll (forced)' });

      // Ensure the aura is granted to the user
      if (!userData[interaction.user.id]) userData[interaction.user.id] = {};
      if (!userData[interaction.user.id][the_aura.name]) {
        userData[interaction.user.id][the_aura.name] = 1;
      } else {
        userData[interaction.user.id][the_aura.name]++;
      }
      fs.writeFileSync(path.join(__dirname, 'userdata.json'), JSON.stringify(userData, null, 2));

      try {
        await interaction.reply({ content: `<@${interaction.user.id}>`, embeds: [embed] });
      } catch (err) {
        if (err.code === 10062) {
          console.warn("⚠️ Interaction expired before reply could be sent.");
        } else {
          console.error("❌ Failed to reply to interaction:", err);
        }
      }
    }
    if (subcommand === 'wipe') {
      const userId = interaction.user.id;
      const devId = config.adminId;

      if (userId !== devId) {
        return interaction.reply({
          content: '<:no:1390740593306632394> Only the bot developer can use this command.',
          ephemeral: true
        });
      }

      // Delete data
      delete auraCounts[userId];
      delete userData[userId];
      delete itemData[userId];

      saveAuraCounts?.();
      saveUserData?.();
      saveItems?.();

      console.log(`🧹 Data wiped for ${userId}`);

      const embed = new EmbedBuilder()
        .setTitle('🧹 Data Wiped')
        .setDescription('Your roll count, aura collection, and inventory have been reset.')
        .setColor(0xff4444);

      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        if (err.code === 10062) {
          console.warn("⚠️ Interaction expired before reply could be sent.");
        } else {
          console.error("❌ Failed to reply to interaction:", err);
        }
      }
    }
    else if (subcommand === 'multiroll') {
      const amount = interaction.options.getInteger('amount') ?? 10;
      const resultMap = new Map();

      await interaction.deferReply(); // Defer to avoid timeout

      let auraPool;
      if (currentBiome.name === 'Dreamspace') {
        auraPool = [
          ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
          ...dreamspaceAuras.map(a => ({
            name: a.name,
            weight: 1 / a.chanceIn
          }))
        ];
      } else if (currentBiome.name === 'Pumpkin Moon') {
        auraPool = [
          ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
          ...pumpkinMoonAuras.map(a => ({
            name: a.name,
            weight: 1 / a.chanceIn
          }))
        ];
      } else if (currentBiome.name === 'Graveyard') {
        auraPool = [
          ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
          ...graveyardAuras.map(a => ({
            name: a.name,
            weight: 1 / a.chanceIn
          }))
        ];
      } else if (currentBiome.name === 'Glitched') {
        auraPool = [
          ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
          ...biomeAuras
            .filter(a => a.biomeRarity?.Glitched)
            .map(a => ({
              name: a.name,
              weight: 1 / a.biomeRarity.Glitched
            })),
          ...glitchedAuras.map(a => ({
            name: a.name,
            weight: 1 / a.chanceIn
          }))
        ];
      } else {
        auraPool = buildAuraPool(currentBiome.name, currentBiome.isDaytime);
      }

      for (let i = 0; i < amount; i++) {
        const aura = getRandomAura(auraPool);
        if (!resultMap.has(aura.name)) {
          resultMap.set(aura.name, { count: 1, chanceIn: Math.round(1 / aura.weight) });
        } else {
          resultMap.get(aura.name).count++;
        }
      }

      const output = [...resultMap.entries()]
        .sort((a, b) => b[1].chanceIn - a[1].chanceIn)
        .map(([name, { count, chanceIn }]) => `**${name}** × ${count} (1 in ${chanceIn})`)
        .join("\n") || "No results.";

      const embed = new EmbedBuilder()
        .setTitle("📎 Multi-Roll (Test) — Results")
        .setDescription(output)
        .setColor(0x5f27cd);

      await interaction.editReply({ embeds: [embed] }); // Proper response after defer
    }
    else if (subcommand === 'changebiome') {
      const biomeName = interaction.options.getString('biome');
      const biome = biomes.find(b => b.name === biomeName);

      if (!biome) {
        return interaction.reply({ content: `<:no:1390740593306632394> Biome "${biomeName}" not found.`, ephemeral: true });
      }

      previousBiome = { ...currentBiome };

      for (const guild of client.guilds.cache.values()) {
        startForcedBiome(biome, guild.id);
      }
      console.log(`🌍 Biome switched to ${biome.name}`);
      await updateBotStatus(); // Force update status now

      const embed = new EmbedBuilder()
        .setTitle('🔧 Biome Changed')
        .setDescription(`The biome has been manually changed to **${biome.name}** for **${biome.duration} seconds**.`)
        .setColor(0xffc107);

      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        if (err.code === 10062) {
          console.warn("⚠️ Interaction expired before reply could be sent.");
        } else {
          console.error("❌ Failed to reply to interaction:", err);
        }
      }
    }
    else if (subcommand === 'giveitem') {
      const item = interaction.options.getString('item');
      const amount = interaction.options.getInteger('amount') || 1;
      const selectedUser = interaction.options.getUser('user') || interaction.user;
      const user = selectedUser.id
      const username = selectedUser.username

      if (!validItems.includes(item)) {
        return interaction.reply({ content: `<:no:1390740593306632394> Invalid item: ${item}`, ephemeral: true });
      }

      giveItem(user, item, amount);
      console.log(`🎒 ${username} received ${amount}x ${item}`)

      const embed = new EmbedBuilder()
        .setTitle('🎁 Item Granted')
        .setDescription(`${selectedUser} received **${amount} ×${item}**.`)
        .setColor(0x90ee90);

      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        if (err.code === 10062) {
          console.warn("⚠️ Interaction expired before reply could be sent.");
        } else {
          console.error("❌ Failed to reply to interaction:", err);
        }
      }
    } else if (subcommand === 'giveauras') {
      const userId = interaction.user.id;
      const devId = config.adminId;

      if (userId !== devId) {
        return interaction.reply({
          content: '<:no:1390740593306632394> Only the bot developer can use this command.',
          ephemeral: true
        });
      }

      if (!userData[userId]) userData[userId] = {};

      const allAuras = [...auras, ...biomeAuras, ...dreamspaceAuras, ...glitchedAuras, ...pumpkinMoonAuras, ...graveyardAuras];
      let added = 0;

      for (const aura of allAuras) {
        const name = aura.name;
        if (!userData[userId][name]) {
          userData[userId][name] = 1;
          added++;
        }
      }

      saveUserData?.();

      console.log(`✨ ${interaction.user.username} received one of each aura from /dev giveauras`);

      const embed = new EmbedBuilder()
        .setTitle('🎁 Full Collection Granted')
        .setDescription(`You received **1** of every aura (${added} new entr${added === 1 ? 'y' : 'ies'}).`)
        .setColor(0x6a5acd);

      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        if (err.code === 10062) {
          console.warn("⚠️ Interaction expired before reply could be sent.");
        } else {
          console.error("❌ Failed to reply to interaction:", err);
        }
      }
    }
    else if (subcommand === 'deleteaura') {
      const name = interaction.options.getString('name');

      const index = auras.findIndex(a => a.name.toLowerCase() === name.toLowerCase());
      if (index === -1) {
        return interaction.reply({ content: `<:no:1390740593306632394> Aura "${name}" not found.`, ephemeral: true });
      }

      // Remove from auras
      const removed = auras.splice(index, 1)[0];
      fs.writeFileSync(aurasPath, JSON.stringify(auras, null, 2));
      console.log(`🗑️ Removed ${name} from auras.json`);

      // Remove from auradescriptions
      delete auraDescriptions[removed.name];
      fs.writeFileSync(auraDescriptionsPath, JSON.stringify(auraDescriptions, null, 2));
      console.log(`🗑️ Removed ${name}'s description from auradescriptions.json`);

      // Update memory
      reloadAuraPool();

      console.log(`${chalk.bgGreenBright.black('OK')} ${name} has been successfully removed. The aura pool has been refreshed.`);

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Aura Deleted')
        .setDescription(`Aura **${removed.name}** has been removed.`)
        .setColor(0xff5555);

      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        if (err.code === 10062) {
          console.warn("⚠️ Interaction expired before reply could be sent.");
        } else {
          console.error("❌ Failed to reply to interaction:", err);
        }
      }
    }
    else if (subcommand === 'blacklist') {
      const targetUser = interaction.options.getUser('user');
      const action = interaction.options.getString('action');
      const userId = targetUser.id;

      if (action === 'add') {
        if (!leaderboardBlacklist.includes(userId)) {
          leaderboardBlacklist.push(userId);
          saveBlacklist();
          const embed = new EmbedBuilder()
            .setTitle('User Blacklisted')
            .setDescription(`**${targetUser.username}** has been **added** to the leaderboard blacklist.`)
            .setColor(0xff5555);
          try {
            await interaction.reply({ embeds: [embed], ephemeral: true });
          } catch (err) {
            if (err.code === 10062) {
              console.warn("⚠️ Interaction expired before reply could be sent.");
            } else {
              console.error("❌ Failed to reply to interaction:", err);
            }
          }
          console.log(`${chalk.bgRedBright.white('!')} ${targetUser.username} has been added to the leaderboard blacklist.`)
        } else {
          try {
            await interaction.reply({ content: `${targetUser.username} is already blacklisted.`, ephemeral: true });
          } catch (err) {
            if (err.code === 10062) {
              console.warn("⚠️ Interaction expired before reply could be sent.");
            } else {
              console.error("❌ Failed to reply to interaction:", err);
            }
          }
        }
      }

      if (action === 'remove') {
        if (leaderboardBlacklist.includes(userId)) {
          leaderboardBlacklist = leaderboardBlacklist.filter(id => id !== userId);
          saveBlacklist();
          const embed = new EmbedBuilder()
            .setTitle('User Unblacklisted')
            .setDescription(`**${targetUser.username}** has been **removed** from the leaderboard blacklist.`)
            .setColor(0x55ff55);
          try {
            await interaction.reply({ embeds: [embed], ephemeral: true });
          } catch (err) {
            if (err.code === 10062) {
              console.warn("⚠️ Interaction expired before reply could be sent.");
            } else {
              console.error("❌ Failed to reply to interaction:", err);
            }
          }
          console.log(`${chalk.bgGreenBright.black('OK')} ${targetUser.username} has been removed from the leaderboard blacklist.`)
        } else {
          try {
            await interaction.reply({ content: `${targetUser.username} is not in the blacklist.`, ephemeral: true });
          } catch (err) {
            if (err.code === 10062) {
              console.warn("⚠️ Interaction expired before reply could be sent.");
            } else {
              console.error("❌ Failed to reply to interaction:", err);
            }
          }
        }
      }
    } else if (subcommand === 'multiroll') {
      await interaction.deferReply({ ephemeral: true });
      const amount = interaction.options.getInteger('amount') ?? 10;
      const resultMap = new Map();

      let auraPool;
      if (currentBiome.name === 'Dreamspace') {
        auraPool = [
          ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
          ...dreamspaceAuras.map(a => ({
            name: a.name,
            weight: 1 / a.chanceIn
          }))
        ];
      } else if (currentBiome.name === 'Pumpkin Moon') {
        auraPool = [
          ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
          ...pumpkinMoonAuras.map(a => ({
            name: a.name,
            weight: 1 / a.chanceIn
          }))
        ];
      } else if (currentBiome.name === 'Graveyard') {
        auraPool = [
          ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
          ...graveyardAuras.map(a => ({
            name: a.name,
            weight: 1 / a.chanceIn
          }))
        ];
      } else if (currentBiome.name === 'Glitched') {
        auraPool = [
          ...buildAuraPool(currentBiome.name, currentBiome.isDaytime),
          ...glitchedAuras.map(a => ({
            name: a.name,
            weight: 1 / a.chanceIn
          }))
        ];
      } else {
        auraPool = buildAuraPool(currentBiome.name, currentBiome.isDaytime);
      }

      for (let i = 0; i < amount; i++) {
        const aura = getRandomAura(auraPool);
        if (!resultMap.has(aura.name)) {
          resultMap.set(aura.name, { count: 1, chanceIn: Math.round(1 / aura.weight) });
        } else {
          resultMap.get(aura.name).count++;
        }
      }

      const output = [...resultMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, { count, chanceIn }]) => `**${name}** × ${count} (1 in ${chanceIn})`)
        .join("\n") || "No results.";

      const embed = new EmbedBuilder()
        .setTitle("📎 Multi-Roll (Test) — Results")
        .setDescription(output)
        .setColor(0x5f27cd);

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === 'createaura') {
      const auraName = interaction.options.getString('name');
      const chanceIn = interaction.options.getInteger('rarity');
      const description = interaction.options.getString('description') || '';

      if (!auraName || !chanceIn || chanceIn < 1) {
        return interaction.reply({ content: '<:no:1390740593306632394> Invalid input.', ephemeral: true });
      }

      // Check if it already exists
      if (auras.find(a => a.name.toLowerCase() === auraName.toLowerCase())) {
        return interaction.reply({ content: `<:no:1390740593306632394> Aura "${auraName}" already exists.`, ephemeral: true });
      }

      const newAura = {
        name: auraName,
        chanceIn: chanceIn
      };
      auras.push(newAura);
      fs.writeFileSync(aurasPath, JSON.stringify(auras, null, 2));
      console.log(`${chalk.bgGreenBright.black('OK')} Added new aura '${auraName}', with a chance of 1 in ${chanceIn}, to auras.json`);

      // Add or update description in auradescriptions.json
      auraDescriptions[auraName] = description;
      fs.writeFileSync(auraDescriptionsPath, JSON.stringify(auraDescriptions, null, 2));
      console.log(`${chalk.bgGreenBright.black('OK')} Added ${auraName}'s description to auradescriptions.json (if applicable)`);

      // Re-read both files so new aura is available immediately
      auras = JSON.parse(fs.readFileSync(aurasPath, 'utf8'));
      auraDescriptions = JSON.parse(fs.readFileSync(auraDescriptionsPath, 'utf8'));
      reloadAuraPool();
      console.log(`${chalk.bgGreenBright.black('OK')} Successfully added aura and refreshed aura pool.`)

      const embed = new EmbedBuilder()
        .setTitle('🌟 New Aura Created')
        .setDescription(`**${auraName}** (1 in ${chanceIn})\n${description || '_No description provided._'}`)
        .setColor(0xa464e8);

      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        if (err.code === 10062) {
          console.warn("⚠️ Interaction expired before reply could be sent.");
        } else {
          console.error("❌ Failed to reply to interaction:", err);
        }
      }
    } else if (subcommand === 'leaveguild') {
      const devId = config.adminId;
      if (interaction.user.id !== devId) {
        return interaction.reply({ content: '<:no:1390740593306632394> You do not have permission to use this.', ephemeral: true });
      }

      const guildId = interaction.options.getString('id');
      try {
        const guild = await client.guilds.fetch(guildId);
        await guild.leave();

        return interaction.reply({
          content: `<:yes:1390740565833945240> Left guild: ${guild.name} (${guild.id})`,
          ephemeral: true
        });
      } catch (err) {
        console.error(chalk.redBright(`${chalk.bgRedBright.white('ERROR')} Failed to leave guild:`), err);
        return interaction.reply({
          content: `<:no:1390740593306632394> Failed to leave guild. Either the ID is invalid or the bot is not in that server.`,
          ephemeral: true
        });
      }
    }
  }

  if (interaction.commandName === 'gurt') {
    try {
      await interaction.deferReply();
      const theThing = Math.floor(Math.random() * 13);
      console.log('I just gurted (' + theThing + ')')
      if (theThing == 0) {
        await interaction.editReply('yo');
      } else if (theThing == 1) {
        await interaction.editReply('sybau');
      } else if (theThing == 2) {
        await interaction.editReply(`Meet up @ 5°22'08.8"S 66°45'19.1"W`)
      } else if (theThing == 3) {
        await interaction.editReply(`Idk what that means`)
      } else if (theThing == 4) {
        await interaction.editReply(`STOPPPP`)
      } else if (theThing == 5) {
        await interaction.editReply(`<@1065016071414890597>`)
      } else if (theThing == 6) {
        await interaction.editReply(`https://media.discordapp.net/attachments/1367301579996266717/1394490992144416769/image.png?ex=68770070&is=6875aef0&hm=aac557498483f68edd21cb0d4951cd586fb5e43e6e4458c364ea54dbf9e9eb72&=`)
      } else if (theThing == 7) {
        await interaction.editReply(`Gurt gurt gurtttt lalalalala`)
      } else if (theThing == 8) {
        const winnerEmbed = new EmbedBuilder()
          .setTitle('Congratulations!')
          .setDescription(`# You won!\nThis message has a 1 in 50,000,000 chance of appearing!\nAs a congratulatory gift, please claim one of the rewards below.`)
          .setFooter({ iconURL: null, text: 'If the button interaction fails, it means the offer has expired.' })
        const rewards = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('primary')
              .setLabel('10,000,000 Robux')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('secondary')
              .setLabel('$100,000 USD')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('tertiary')
              .setLabel('Death')
              .setStyle(ButtonStyle.Danger)
          );
        await interaction.editReply({
          embeds: [winnerEmbed],
          components: [rewards],
        });
      } else if (theThing == 9) {
        await interaction.editReply(`Stop that. Stop it now.`)
      } else if (theThing == 10) {
        const witheredEmbed = new EmbedBuilder()
          .setTitle('You rolled...')
          .setDescription(`# Ruins : Withered\n[ 1 in 800,000,000 ]`)
          .setFooter({ iconURL: null, text: 'Dev Luck Roll' })
          .setColor(0xbb2022)
        await interaction.editReply({ content: `<@${interaction.user.id}>`, embeds: [witheredEmbed] })
      } else if (theThing == 11) {
        await interaction.editReply(`https://cdn.discordapp.com/attachments/1269046535144869900/1395181210816479314/IMG_3290.jpg?ex=68798341&is=687831c1&hm=8b3a1d0008f196666a3fb68ea763c2909f44bdeeab32a4bc019eda1dfe67b11e&`)
      } else if (theThing == 12) {
        const chooseAuraEmbed = new EmbedBuilder()
          .setDescription(`# Hey!\n> As a thanks for using the bot, you may choose an aura to obtain for free!\n> Here are your options 👇`)
        const choices = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('1')
              .setLabel('Luminosity')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('2')
              .setLabel('Oppression')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('3')
              .setLabel('Oblivion')
              .setStyle(ButtonStyle.Secondary)
          )
        await interaction.editReply({ embeds: [chooseAuraEmbed], components: [choices] })
      } else {
        await interaction.editReply(`error: couldn't gurt`)
      }
    } catch (err) {
      if (err.code === 10062) {
        console.warn("⚠️ Interaction expired before reply could be sent.");
      } else {
        console.error("❌ Failed to reply to interaction:", err);
      }
    }
  }

  if (interaction.commandName === 'yo') {
    await interaction.deferReply();
    const theThing = Math.floor(Math.random() * 7);
    console.log('I just yo-ed (' + theThing + ')')
    if (theThing == 0) {
      await interaction.editReply('YO (not gurt)');
    } else if (theThing == 1) {
      await interaction.editReply('wsp wspppp');
    } else if (theThing == 2) {
      await interaction.editReply(`Continue`)
    } else if (theThing == 3) {
      await interaction.editReply('🗑️ `userdata.json` deleted.')
    } else if (theThing == 4) {
      await interaction.editReply(`Ok`)
    } else if (theThing == 5) {
      await interaction.editReply(`<@686748689988976721> We all hate you`)
    } else if (theThing == 6) {
      const reallyDeleteUserDataInquiry = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('reallydelete')
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('nobro')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary))
      await interaction.editReply({ content: 'REALLY delete all user data?', components: [reallyDeleteUserDataInquiry] })
    } else {
      await interaction.editReply(`Something bad happened`)
    }
  }


  if (interaction.commandName === 'useitem') {
    const item = interaction.options.getString('item');
    const userId = interaction.user.id;
    const items = getUserItems(userId);

    if (!validItems.includes(item)) {
      return interaction.reply({ content: '<:no:1390740593306632394> Invalid item.', });
    }

    if (!items[item] || items[item] < 1) {
      return interaction.reply({ content: '<:no:1390740593306632394> You don’t have that item.' });
    }

    // Check before consuming
    if (item === 'Mini Heavenly Potion' && activeMiniHevUsers.has(userId)) {
      const alreadyActiveEmbed = new EmbedBuilder()
        .setTitle('⚠️ Potion Already Active')
        .setDescription('You already have a **Mini Heavenly Potion** active!\nUse it in a roll before using another.')
        .setColor(0xffcc00); // yellow/orange

      return interaction.reply({ embeds: [alreadyActiveEmbed] });
    }

    if (item === 'BIG Heavenly Potion' && activeBigHevUsers.has(userId)) {
      const alreadyActiveEmbed = new EmbedBuilder()
        .setTitle('⚠️ BIG Potion Already Active')
        .setDescription('You already have a **BIG Heavenly Potion** active!\nUse it in a roll before using another.')
        .setColor(0xffcc00);

      return interaction.reply({ embeds: [alreadyActiveEmbed] });
    }

    if (item === 'DEV POTION OF DOOM' && activeDevPotionOfDoomUsers.has(userId)) {
      const alreadyActiveEmbed = new EmbedBuilder()
        .setTitle('⚠️ DEV POTION OF DOOM Active')
        .setDescription('You already have a **DEV POTION OF DOOM** active!\nUse it in a roll before using another.')
        .setColor(0xffcc00);

      return interaction.reply({ embeds: [alreadyActiveEmbed] });
    }

    if (item === "Gurt's Hatred" && activeDevPotionOfDoomUsers.has(userId)) {
      const alreadyActiveEmbed = new EmbedBuilder()
        .setTitle("⚠️ Gurt's Hatred Active")
        .setDescription("You already have a **Gurt's Hatred** active!\nUse it in a roll before using another.")
        .setColor(0xffcc00);

      return interaction.reply({ embeds: [alreadyActiveEmbed] });
    }

    // Consume item now
    items[item]--;
    if (items[item] === 0) delete items[item];
    saveUserItems(userId, items);

    // Apply effect
    if (item === 'Mini Heavenly Potion') {
      activeMiniHevUsers.add(userId);
    }

    if (item === 'BIG Heavenly Potion') {
      activeBigHevUsers.add(userId);
    }

    if (item === 'DEV POTION OF DOOM') {
      activeDevPotionOfDoomUsers.add(userId);
    }

    if (item === "Gurt's Hatred") {
      activeGurtsHatredUsers.add(userId);
    }

    console.log(`✨ ${interaction.user.username} used a ${item}`)

    const embed = new EmbedBuilder()
      .setTitle(`🧪 Used ${item}`)
      .setDescription(`You used one **${item}**.`)
      .setColor(0x00bfff);

    try {
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      if (err.code === 10062) {
        console.warn("⚠️ Interaction expired before reply could be sent.");
      } else {
        console.error("❌ Failed to reply to interaction:", err);
      }
    }
  }

  if (interaction.commandName === 'aurainfo') {
    const auraName = interaction.options.getString('aura');
    const userId = interaction.user.id;

    const userAuras = userData[userId] || {};

    const ownedAura = Object.keys(userAuras).find(a => a.toLowerCase() === auraName.toLowerCase());
    if (!ownedAura) {
      return interaction.reply({
        content: '<:no:1390740593306632394> You do not own that aura.',
        ephemeral: true
      });
    }
    const auraCount = userAuras[ownedAura];

    const aura = [...auras, ...biomeAuras, ...dreamspaceAuras, ...glitchedAuras, ...pumpkinMoonAuras, ...graveyardAuras].find(a => a.name.toLowerCase() === ownedAura.toLowerCase());
    if (!aura) {
      return interaction.reply({
        content: '<:no:1390740593306632394> That aura does not exist.',
        ephemeral: true
      });
    }

    const chanceIn = aura.chanceIn || Math.round(1 / aura.weight);
    const description = auraDescriptions[auraName] || '_No description available._';

    // Count how many users have this aura
    const ownerCount = Object.values(userData).filter(user => user[auraName]).length;

    let color;
    if (chanceIn >= 1_000_000_000) {
      color = 0x83ddf1; // Light Blue (1B+)
    } else if (chanceIn >= 100_000_000) {
      color = 0xbb2022; // Deep Red (100M+)
    } else if (chanceIn >= 10_000_000) {
      color = 0x1e0bf1; // Royal Blue (10M+)
    } else if (chanceIn >= 1_000_000) {
      color = 0xf059d1; // Pink (1M+)
    } else if (chanceIn >= 100_000) {
      color = 0x39ffe8; // Cyan
    } else if (chanceIn >= 10_000) {
      color = 0xff8000; // Orange
    } else if (chanceIn >= 998) {
      color = 0xa464e8; // Purple
    } else {
      color = null;
    }
    const embed = new EmbedBuilder()
      //.setTitle(`**${aura.name}**`)
      .setColor(color)
      .setDescription(`# ${aura.name}\n${description}\n\n**Rarity**\n[ 1 in ${chanceIn.toLocaleString()} ]\n\n**You own:**\n${auraCount}\n\n**Owned by:**\n${ownerCount} user${ownerCount !== 1 ? 's' : ''}`);


    // Determine condition field if aura is biome-exclusive
    let conditionLabel = null;
    let conditionValue = null;

    if (dreamspaceAuras.some(a => a.name === aura.name)) {
      conditionLabel = "Required Conditions";
      conditionValue = "During Dreamspace";
    } else if (pumpkinMoonAuras.some(a => a.name === aura.name)) {
      conditionLabel = "Required Conditions";
      conditionValue = "During Pumpkin Moon";
    } else if (graveyardAuras.some(a => a.name === aura.name)) {
      conditionLabel = "Required Conditions";
      conditionValue = "During Graveyard";
    } else if (glitchedAuras.some(a => a.name === aura.name)) {
      conditionLabel = "Required Conditions";
      conditionValue = "During Glitched";
    } else {
      if (biomeAurasByName[aura.name]) {
        conditionLabel = "Amplify Conditions";
        conditionValue = `During ${biomeAurasByName[aura.name]}`;
      }
    }

    if (conditionLabel && conditionValue) {
      embed.addFields({ name: conditionLabel, value: conditionValue, inline: true });
    }

    return interaction.reply({ embeds: [embed], ephemeral: false });
  }

  if (interaction.commandName === 'biomelogs') {
    const subcommand = interaction.options.getSubcommand();
    if (!interaction.member.permissions.has('ManageChannels')) {
      return interaction.reply({ content: '<:no:1390740593306632394> You need the `Manage Channels` permission to use this.', ephemeral: true });
    }

    if (interaction.commandName === 'biomelogs' && subcommand === 'addhook') {
      if (!interaction.member.permissions.has('ManageChannels')) {
        return interaction.reply({ content: '<:no:1390740593306632394> You need the `Manage Channels` permission to use this.', ephemeral: true });
      }

      const url = interaction.options.getString('webhookurl');
      const guild = interaction.guild;

      try {
        const webhookData = await (await fetch(url)).json();

        if (webhookData.guild_id !== guild.id) {
          return interaction.reply({ content: '<:no:1390740593306632394> That webhook does not belong to this server.', ephemeral: true });
        }

        const entry = {
          name: webhookData.name,
          url: url,
          channelId: webhookData.channel_id
        };

        if (!biomelogWebhooks[guild.id]) biomelogWebhooks[guild.id] = [];
        biomelogWebhooks[guild.id].push(entry);
        saveBiomelogs();

        try {
          await interaction.reply({ content: `<:yes:1390740565833945240> Webhook **${entry.name}** added for biome logs.`, ephemeral: true });
        } catch (err) {
          if (err.code === 10062) {
            console.warn("⚠️ Interaction expired before reply could be sent.");
          } else {
            console.error("❌ Failed to reply to interaction:", err);
          }
        }

      } catch (err) {
        console.error(chalk.redBright(`${chalk.bgRedBright.white('ERROR')} Failed to validate webhook:`), err);
        try {
          await interaction.reply({ content: '<:no:1390740593306632394> Invalid or unreachable webhook URL.', ephemeral: true });
        } catch (err) {
          if (err.code === 10062) {
            console.warn("⚠️ Interaction expired before reply could be sent.");
          } else {
            console.error("❌ Failed to reply to interaction:", err);
          }
        }
      }
    }
    if (subcommand === 'list') {
      const hooks = biomelogWebhooks[interaction.guild.id] || [];
      if (hooks.length === 0) {
        return interaction.reply({ content: '📭 No biome log webhooks registered in this server.', ephemeral: true });
      }

      const description = hooks.map(h => `• **${h.name}** (<#${h.channelId}>)\n\`${h.url}\``).join('\n\n');
      const embed = new EmbedBuilder()
        .setTitle('🧾 Biome Log Webhooks')
        .setDescription(description)
        .setColor(0x00bfff);

      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        if (err.code === 10062) {
          console.warn("⚠️ Interaction expired before reply could be sent.");
        } else {
          console.error("❌ Failed to reply to interaction:", err);
        }
      }
    }
    if (subcommand === 'removehook') {
      const focused = interaction.options.getString('webhookname');
      const hooks = biomelogWebhooks[interaction.guild.id] || [];
      const index = hooks.findIndex(h => h.name === focused);

      if (index === -1) {
        return interaction.reply({ content: '<:no:1390740593306632394> Webhook not found.', ephemeral: true });
      }

      const removed = hooks.splice(index, 1);
      saveBiomelogs();
      try {
        await interaction.reply({ content: `<:yes:1390740565833945240> Removed webhook **${removed[0].name}** from biome logging.`, ephemeral: true });
      } catch (err) {
        if (err.code === 10062) {
          console.warn("⚠️ Interaction expired before reply could be sent.");
        } else {
          console.error("❌ Failed to reply to interaction:", err);
        }
      }
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isAutocomplete()) return;

  try {
    const command = interaction.commandName;
    const sub = interaction.options.getSubcommand(false); // use false to avoid throwing

    const focused = interaction.options.getFocused();

    // DEV > FORCEROLL > AURA NAMES
    if (command === 'dev' && sub === 'forceroll') {
      const choices = [...auras, ...biomeAuras, ...dreamspaceAuras, ...glitchedAuras, ...pumpkinMoonAuras, ...graveyardAuras].map(a => a.name);
      const filtered = choices.filter(choice =>
        choice.toLowerCase().includes(focused.toLowerCase())
      ).slice(0, 25);
      return await interaction.respond(
        filtered.map(choice => ({ name: choice, value: choice }))
      );
    }

    // DEV > GIVEITEM or USEITEM > ITEM NAMES
    // DEV > GIVEITEM
    if (command === 'dev' && sub === 'giveitem') {
      const filtered = validItems
        .filter(item => item.toLowerCase().includes(focused.toLowerCase()))
        .slice(0, 25);
      return await interaction.respond(
        filtered.map(item => ({ name: item, value: item }))
      );
    }

    // USEITEM > ONLY SHOW USER'S ITEMS
    if (command === 'useitem') {
      const items = getUserItems(interaction.user.id);
      const owned = Object.keys(items).filter(
        item => item.toLowerCase().includes(focused.toLowerCase())
      ).slice(0, 25);

      return await interaction.respond(
        owned.map(item => ({ name: item, value: item }))
      );
    }

    if (interaction.commandName === 'aurainfo') {
      const focused = interaction.options.getFocused();
      const userAuras = userData[interaction.user.id] || {};
      const allAuraNames = [...auras, ...biomeAuras, ...dreamspaceAuras, ...glitchedAuras, ...pumpkinMoonAuras, ...graveyardAuras].map(a => a.name);
      const filtered = allAuraNames
        .filter(name => name.toLowerCase().includes(focused.toLowerCase()))
        .slice(0, 25);

      return interaction.respond(filtered.map(name => ({ name, value: name })));
    }

    if (interaction.commandName === 'dev' && sub === 'deleteaura') {
      const choices = auras
        .map(a => a.name)
        .filter(name => name.toLowerCase().includes(focused.toLowerCase()))
        .slice(0, 25); // Discord allows max 25 results

      await interaction.respond(choices.map(name => ({ name, value: name })));
    }
    if (interaction.isAutocomplete() && interaction.commandName === 'biomelogs' && interaction.options.getSubcommand() === 'removehook') {
      const focused = interaction.options.getFocused();
      const hooks = biomelogWebhooks[interaction.guild.id] || [];
      const filtered = hooks
        .filter(h => h.name.toLowerCase().includes(focused.toLowerCase()))
        .slice(0, 25)
        .map(h => ({ name: h.name, value: h.name }));

      return interaction.respond(filtered);
    }


    // fallback — avoid crash
    return await interaction.respond([]);
  } catch (err) {
    console.error(chalk.redBright(`${chalk.bgRedBright.white('ERROR')} Autocomplete error:`), err);
    try {
      await interaction.respond([]); // avoid crash
    } catch { }
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  function hellNo() {
    interaction.reply("`claim() function failed: No such variable exists: chooseEmbed (index.js:2207)`")
  }
  if (interaction.customId === '1') { hellNo() } else if (interaction.customId === '2') { hellNo() } else if (interaction.customId === '3') { hellNo() }
});

/* client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId === 'reallydelete') {
    console.log(`Successfully deleted data, ${interaction.user.username}.`)
    interaction.reply('Successfully deleted data.')
  }
  else if (interaction.customId === 'nobro') {
    console.log(`I don't care, ${interaction.user.username}, I did it anyway.`)
    interaction.reply("I don't care, I did it anyway")
  }
}); */

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'again') {
    if (config.rollingAllowed) {
      try {
        await interaction.deferUpdate(); // acknowledge the click

        // Disable the button on the original message
        const disabledButton = new ButtonBuilder()
          .setCustomId('again')
          .setLabel('Roll Again')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const row = new ActionRowBuilder().addComponents(disabledButton);

        let disabled = false;
        try {
          if (interaction.message?.editable) {
            await interaction.message.edit({ components: [row] });
            disabled = true;
          }
        } catch (err) {
          if (err.code === 10008) {
            //console.warn("⚠️ Could not disable button (message deleted or ephemeral).");
          } else {
            console.error(`${chalk.bgRedBright.white('ERROR')}${chalk.red(` Failed to disable Roll Again button:`)}`, err);
          }
        }

        // Always roll regardless of whether disabling succeeded
        await roll(interaction, true, !disabled); // third arg: force ephemeral if disable failed
      } catch (err) {
        console.error(`${chalk.bgRedBright.white('ERROR')}${chalk.red(` Roll Again button error:`)}`, err);
      }
    } else {
      console.log(`${chalk.bgRedBright.white('ERROR')} Cannot roll! Roll service unavailable`)
      const replyEmbed = new EmbedBuilder()
        .setColor(0xe65a5a)
        .setTitle('Unavailable')
        .setDescription('# The bot is currently being tested, updated, or is not available at this point.')
        .setFooter({ text: 'Please try again later.', iconURL: null });
      try {
        await interaction.reply({ embeds: [replyEmbed] });
      } catch (err) {
        if (err.code === 10062) {
          console.warn("⚠️ Interaction expired before reply could be sent.");
        } else {
          console.error("❌ Failed to reply to interaction:", err);
        }
      }
    }
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;

  if (customId.startsWith('collection_next_') || customId.startsWith('collection_prev_')) {
    const [, , userId, pageStr] = customId.split('_');
    const page = parseInt(pageStr);

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: '❌ This button isn’t for you.', ephemeral: true });
    }

    const userAuras = userData[userId];
    const auraWeights = Object.fromEntries(
      [...auras, ...biomeAuras, ...dreamspaceAuras, ...glitchedAuras, ...pumpkinMoonAuras, ...graveyardAuras].map(a => [a.name, a.chanceIn])
    );
    const sortedAuras = Object.entries(userAuras)
      .sort((a, b) => (auraWeights[b[0]] || 0) - (auraWeights[a[0]] || 0));
    const perPage = 15;
    const totalPages = Math.ceil(sortedAuras.length / perPage);

    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageData = sortedAuras.slice(start, end);

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Aura Collection`)
      .setColor(0x00bfff)
      .setFooter({ text: `Page ${page} of ${totalPages}` })
      .setDescription(pageData.map(([aura, count]) => `${aura} (x${count})`).join('\n') || 'No auras on this page.');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`collection_prev_${userId}_${page - 1}`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 1),

      new ButtonBuilder()
        .setCustomId(`collection_next_${userId}_${page + 1}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages)
    );

    await interaction.update({ embeds: [embed], components: [row] });
  }
});

client.login(config.token);