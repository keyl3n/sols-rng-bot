## Sol's RNG Bot v3.6.4
### Embed tweak
- BiomeLogs embeds no longer have a blue stripe on them
### Update to `/nextreward`
- The command now uses `interaction.deferReply()` before calculating everything

## Sol's RNG Bot v3.6.3
### New dev command: `/dev setrolls`
- Allows you to change your roll count

## Sol's RNG Bot v3.6.2
### New Scoobert aura
- **Scoob**, 1 in 12

## Sol's RNG Bot v3.6.1
### New auras
- Added Honey, Watt, Warlock, and EQUINOX

# Sol's RNG Bot v3.6.0
## Hotfix
- Fixed an issue that prevented Glitched biome (and maybe other biomes I honestly don't know) from having an effect when a potion was active for the user
## New dev biome
- Added a secret Scoobert biome (just for funsies!)
## New Glitched biome aura
- Defect, 1 in 49

## Sol's RNG Bot v3.5.3
### My bad guys
- Fixed a critical bug that would pretty much cause rollcounts.json to be reset every time the bot went online

## Sol's RNG Bot v3.5.2
### Say goodbye
- `/gurt` and `/yo` are forever erased.
### Moving house
- User data files now have their own folder!

## Sol's RNG Bot v3.5.1
### Thing
- `/dev forceroll` now gives coins like normal rolls

# Sol's RNG Bot v3.5.0
## Bugfix
- Added Coins to the `validItems` array (I forgot to do that earlier)  
## New Internal Feature
### `unusableItems`
- Any items added to this array will not show up in the autocomplete for `/useitem` and will give an error message when someone attempts to use one of them  
## New embeds
- If someone tries to use an item that doesn't exist, they don't have, or cannot be used, an embed will show why the `/useitem` command could not be completed instead of just a normal message.  
## Rearranged files
- `auras.json`, `biomeAuras.json`, `glitchedAuras.json`, `dreamspaceAuras.json`, `graveyardAuras.json`, and `pumpkinMoonAuras.json` are now in the new `auras` folder.
<hr>

## Sol's RNG Bot v3.4.5
### Coins
- You can now obtain coins from rolling! These will be given a use in an update soon.  
The way they work is:
The rarity of the aura you roll is 1 in x. x = the "chance in" of your aura AND how many coins you get from the roll.
If the rarity of the aura you roll exceeds 1 in 1,000, you will just be given 1,000 coins.

## Sol's RNG Bot v3.4.4
### Gurt is Gone
- He's gone.
### No more Yo, either
- Sorry!

## Sol's RNG Bot v3.4.3
### Return of Gurt
- The Gurt command is back!
- It also has more possible responses
### Tweak to leaderboards
- Roll counts and collected stat amounts in the leaderboards will now have commas in them

## Sol's RNG Bot v3.4.2
Just reorganized and renamed some stuff in config.json
ALSO
### New Config Option
- `identifyConsoleLoggedRolls`: When enabled, rolls logged in the console will show some basic information about who rolled the aura next to the roll result.

## Sol's RNG Bot v3.4.1
### Removed-ish a Command
- Stopped `/gurt` from registering as a command for now (it was just a joke command anyway)

(all updates below this line were made before the creation of this file, meaning the only available update logs are ones made public on discord. internal changes will not be available)

# Sol's RNG Bot v3.4.0
### New obtainable items
- **BIG Heavenly Potion**: You get one every 17,500 rolls
- **Gurt's Hatred**: You get one every 100,000 rolls
### How much luck do they give?
- A **BIG Heavenly Potion** guarantees an aura of at least 1 in 100,000.
- A **Gurt's Hatred** guarantees an aura of at least 1 in 1,000,000.
<sub>These effects will likely be tweaked in the near future.</sub>

## Sol's RNG Bot v3.3.3
### Hotfix
- Fixed an issue that caused the `Roll Again` button to do nothing
<sub>(hopefully)</sub>

## Sol's RNG Bot v3.3.1
### Change to `/profile`
- Now shows the user's profile picture inside the embed

# Sol's RNG Bot v3.3.0
### New command
- `/profile`: Lets you see your roll count, collected stat, rarest aura, and leaderboard placements
### Removed `/myrolls`
- It's obsolete now

## Sol's RNG Bot v3.2.5
- Changed Dreamspace to 1 in 300k (it was supposed to be that this whole time oops)

## Sol's RNG Bot v3.2.4
Experimenting a little more with the biome chances
- glitch biome is now 1 in 5k every biome change
- dreamspace is now 1 in 50k every second  
<sub>(EXTREMELY subject to change)</sub>

# Sol's RNG Bot v3.2.0
### Bugfixes
- Fixed an issue that prevented Dreamspace from starting
- Fixed an issue that caused Glitched biome to trigger improperly
### Balance Changes
*To be clear:*

Glitched biome chance: `1 in 20,000 every biome change`  
Dreamspace biome chance: `1 in 3,000,000 every second`  
Other biome chances: `Unchanged`

## Sol's RNG Bot v3.1.7
### An Event  
10X DREAMSPACE EVENT!! (1 IN 300K)!!! LASTS UNTIL I PUT IT BACK AT 3M (LIKE 6 HOURS)

## Sol's RNG Bot v3.1.5
### Balance Change
- Glitched Biome Rarity: `1 in 15,000` -> `1 in 20,000` (per biome change)  
<sub>sorry!!</sub>

## Sol's RNG Bot v3.1.2
### Bugfix
- Fixed an issue where auras with native rarities would not count towards your collected stat

## Sol's RNG Bot v3.1.1
### Balance Changes
Glitched Biome Rarity: `1 in 30,000` -> `1 in 15,000` (per biome change)
Dreamspace Biome Rarity: `1 in 5,000,000` -> `1 in 3,000,000` (per second)

# Sol's RNG Bot v3.0.0
### New System: Biomes
- You can see the current biome in the bot's status or with /biome
- Has an effect on the rarities of some auras
- Glitched and Dreamspace have been added!
- Daytime and Nighttime are also a thing
### New auras
- All the 10m, 100m, and 1b auras that weren't already there
- Fault
- Star auras
- Removed that one secret aura that nobody got
### New commands
- `/biome`: Lets you see the current biome and time  
<sub>`/dev changebiome`: i can change the biome sometimes. idk</sub>
### Updates to commands
- `/aurainfo` shows the native biome/time of an aura
### Things that WEREN'T added
- Limbo auras/content
- Auto-roll (yet)
- Gears (yet?)
### Known issues
- Dreamspace auras are unobtainable in Glitched. Too lazy to fix right now
- Rolling might be slower than usual. I'll do something about it probably