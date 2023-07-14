# WrinklersPlusPlus
A cookie clicker mod that changes the wrinkler limit
## Description
  The wrinkler limit is now based on how many times you've reached the 3rd stage of the grandmapocalypse **in previous ascensions.**

  When loading the mod, very little should noticeably change. To get started, buy the new Heavenly Upgrade named "Memory of the Elders," which is unlocked after buying "Elder spice". The grandmas will now revisit their wrath upon new reincarnations.

  After a while, there will start to be too many wrinklers to pop manually. To combat that, buy the Heavenly Upgrade named "Holy touch," which is unlocked after buying "Memory of the Elders".
 
  Note: after around 100 wrinklers, new wrinklers will spawn on a second row. Also, wrinklers max out at 1000 with around 80 elder pacts (by design).

  Have fun, and make sure to let me know of any problems/suggestions you have!
## Installation
#### Through a bookmark:
Save the link below to a bookmark (or just paste into the searchbar), then click it whenever you want to load the mod. Make sure the "javascript:" part is saved, chrome sometimes deletes that part when pasting. If not, just manually add it.
```
javascript:Game.LoadMod('https://github.com/awes12/WrinklersPlusPlus/blob/main/src/mod.js');
```
#### Through a Userscript (Greasemonkey or Tampermonkey):
Provided you know how to use userscripts, paste the below into a userscript
```
(function() {
    let checkDefined = setInterval(function() {
        if (Game != undefined && Game.LoadMod != undefined) {
          Game.LoadMod('https://github.com/awes12/WrinklersPlusPlus/blob/main/src/mod.js');
            clearInterval(checkDefined );
        }
    }, 100);
})();
```
## Cheat functions
If you just want to have a bit of fun with an obscene amount of wrinklers, you can use these functions. Before you do though, make sure to save to a file. These functions shouldn't mess with the save, but best to be safe.
```
//Summon multiple wrinklers. Replace n with the amount of wrinklers you want
//If you want all the wrinklers to be shiny, set forceShiny to true. If not, leave it out
Game.summonWrinklersSetMax(n, forceShiny); 

//Override the max wrinklers, but don't spawn them
Game.wrinkerInfo.wrinklerOverridenMax = n; //set n to the new max

//change the wrinkler's size (by a multiplier)
Game.wrinklerInfo.wrinklerSizeModifier = p; //p=.5 for half, 2 for double, etc

//remove the wrinkler limit (meaning the max wrinklers through normal, modded gameplay)
Game.wrinklerLimit = n; //new limit
```
## Contributing

Pull requests are welcome, especially to fix bugs. For major changes, please open an issue first to discuss what you would like to change.

## Incompatibilities
None I know of right now, but likely since I redefine some of the cookie clicker functions.

## License

[MIT](https://choosealicense.com/licenses/mit/)
