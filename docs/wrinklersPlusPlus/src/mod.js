//feel free to use my code, just make sure to credit me before it!
(function(){
    let modID = "wrinklersPlusPlus";
    let modVersion = "1.0.0";
    if(!localStorage.getItem('allowLoading')){
        let capitalizedModId = modID[0].toUpperCase() + modID.substring(1);
        let allowLoad = confirm(`${capitalizedModId} will turn your save into a modded save (it's not just a cosmetic mod). Do you want to proceed?`);
        if(!allowLoad){
            alert(capitalizedModId + " loading canceled.");
            return;
        }
        localStorage.setItem('allowLoading', 'true');
    }
    if(!Object.keys(Game.mods).includes(modID)){
        // Game.wrinklerInfo.wrinklersPerRow = 100; //the wrinklers per circle (used in my getWrinklerPos method)
        // Game.wrinklerInfo.baseWrinklerMax = 10;
        // Game.wrinklerInfo.wrinklerSizeModifier = 1;
        // Game.wrinklerInfo.maxWrinklersFirstRow = 100;
        // Game.wrinklerInfo.maxSuckedValue = .99;
        Game.wrinklerInfo = {
            wrinklersPerRow: 100,
            baseWrinklerMax: 10,
            optimalMaxVanilla: 14,
            wrinklerSizeModifier: 1,
            maxWrinklersFirstRow: 100,
            maxSuckedValue: 6, //can have -6x cps at maximum
            wrinklersAvailable: 0,
            wrinklersSucking: [],
            wrinklersAvailableByRow: []
        };
    }
    window.wrinklersPlusPlus = {
        ModID: modID,
        styleName: "wrinklersPlusPlusStylesheet",
        loaded: false,
        modUpgrades: [],
        version: modVersion,
        init:function(){
            //this function is called as soon as the mod is registered
            //declare hooks here
            Game.elderPactNum = 0;
            if(document.querySelector('#' + this.styleName) == undefined){
                let style = document.createElement('style');
                style.id = this.styleName;
                document.head.appendChild(style);
                style.sheet.insertRule(`
                    div#popWrinklers {
                        background: rgb(0 0 0 / 65%);
                        position: absolute;
                        bottom: 28px;
                        right: 0px;
                        /* height: fit-content; */
                        margin: 0;
                        color: gray;
                        text-transform: uppercase;
                        padding: 4px;
                        z-index: 10;
                        /* font-variant: small-caps; */
                        font-weight: bold;
                        font-size: 11px;
                        display: none;
                        cursor: pointer;
                    }
                `);
                style.sheet.insertRule(`
                    div#popWrinklers:hover {
                        color: white;
                    }
                `);
                style.sheet.insertRule(`
                    :root {
                        --popAllWrinklersText: "Pop all wrinklers";
                        --popAllWrinklersHoverText: var(--popAllWrinklersText);
                    }
                `);
                style.sheet.insertRule(`
                    div#popWrinklers:before {
                        content: var(--popAllWrinklersText);
                    }
                `);
                style.sheet.insertRule(`
                    div#popWrinklers:hover:before {
                        content: var(--popAllWrinklersHoverText);
                    }
                `);
            }
            
            let popWrinklers = document.createElement("div");
            popWrinklers.id="popWrinklers";
            document.querySelector('#sectionLeftExtra').insertAdjacentElement('afterbegin', popWrinklers);
            //popWrinklers.textContent="Pop all wrinklers"; //used a css pseudo-class
            Game.registerHook('reincarnate', ()=>wrinklersPlusPlus.setPopAllDisplay(false));
            let shortcut = new Shortcut(()=>{
                setCSSVar('--popAllWrinklersHoverText', '"Keep Shinies"');
            },'Shift').addReleaseFunc(e=>removeCSSVar('--popAllWrinklersHoverText'));
            popWrinklers.addEventListener('click', Game.popAllWrinklers);
            Game.AddMoreLoc(
                {"EN": {
                        'The grandmas will remember that': '/',
                        'Exploded %1 wrinklers': '/',
                        ', %1 of which were shinies': '/',
                        'Exploded 1 wrinkler': '',
                        ' which was a shiny': '/',
                        ', 1 of which was a shiny': '/',
                        [`${this.ModID.capitalize()} is now loaded`]: ''
                    }
                }
            );
            if(Game.OnAscend == 0){
                //change below to "create" hook
                // Game.registerHook("create", ()=>{
                //     let tempFuncPact = Game.Upgrades["Elder Pact"].buyFunction;
                //     Game.Upgrades["Elder Pact"].buyFunction = ()=>{
                //         tempFuncPact();
                //         Game.elderPactNum++; //amount of times you've purchase elder pact
                //     };
                //     let tempFuncMind = Game.Upgrades["One mind"].buyFunction;
                //     Game.Upgrades["One mind"].buyFunction = ()=>{
                //         tempFuncMind();
                //         if(Game.Has('Holy touch')) wrinklersPlusPlus.setPopAllDisplay(true); //amount of times you've purchase elder pact
                //     };
                //     wrinklersPlusPlus.modUpgrades.push(Game.createPrestigeUpgrade([-165, -768], 'Memory of the Elders',loc('Scales the maximum wrinklers based on how many time you\'ve reached stage 3 of the Grandmapocalypse.<br><q>The grandmas will remember that.</q'),1000000,[8,9], ['Elder spice'], ()=>{
                //         // if(Game.elderWrath >= 3){
                //         //     Game.elderPactNum = 1;
                //         // }
                //     }));
                //     wrinklersPlusPlus.modUpgrades.push(Game.createPrestigeUpgrade([-84, -950], 'Holy touch',loc('Unlocks the pop all wrinkler option.<br><q>The wrinklers flee from your hand.</q>'),10000000,[28,11], ['Memory of the Elders'], ()=>{}));
                // });
                this.addUpgrades();
                if(Game.vanilla === undefined){
                    Game.registerHook("create", this.modifyUpgrades); //wait for upgrades to be created, then modify
                } else {
                    this.modifyUpgrades();
                }
                //old coords:-200,-780
                this.finishInit();
            } else{
                //maybe just add hooks
                // alert(`Can't load ${ModID} when in between ascensions`);
                let addThenDelete = ()=>{ //arrow function so "this" is saves
                    this.addUpgrades();
                    Game.removeHook('reincarnate',addThenDelete);
                }
                this.modifyUpgrades(); //because in ascension, upgrades are def already created
                Game.registerHook('reincarnate', addThenDelete);
                this.finishInit(true);
            }
            loaded = true;
        },
        save:function(type = 0){
            //use this to store persistent data associated with your mod
            let str = '';
            let wrinklers = Game.saveModWrinklers();
            str+=
                (type==3?'\n	ascensions : ':'')+parseInt(Math.floor(Game.resets)) + ';' + //wrinklers don't carry over ascensions, so here to make sure you don't reload this save from a while back
                (type==3?'\n	number of times you\'ve incurred the Elder\'s wrath : ':'')+parseInt(Math.floor(Game.elderPactNum)) + ';' +	
                (type==3?'\n	amount of cookies contained in mod wrinklers : ':'')+parseFloat(Math.floor(wrinklers.amount))+';'+
                (type==3?'\n	number of mod wrinklers : ':'')+parseInt(Math.floor(wrinklers.number))+';'+
                (type==3?'\n	number of mod shiny wrinklers : ':'')+parseInt(Math.floor(wrinklers.shinies))+';'+
                (type==3?'\n	amount of cookies contained in mod shiny wrinklers : ':'')+parseFloat(Math.floor(wrinklers.amountShinies));
                
                //saving upgrades 
            str+='|';
            if(type == 3) str+= '\n	Mod upgrades unlocked:';
            str+=this.modUpgrades.map(e=>(e.unlocked ? (e.bought ? 2 : 1) : (e.bought ? 2 : 0))).join('');//0 for not unlocked, 1 for unlocked, 2 for bought	
            //str+=';';
            return str;
        },
        load:function(str){
            //do stuff with the string data you saved previously
            this.funcBeforeLoad();
            saveSections = str.split('|'); //0 is misc, 1 is upgrades
            for(let i = 0; i < saveSections[1].length && i < this.modUpgrades.length; i++){
                this.modUpgrades[i].unlocked = parseInt(saveSections[1][i]) >=1 ? 1 : 0;
                this.modUpgrades[i].bought = parseInt(saveSections[1][i]) >=2 ? 1 : 0;
            }
            let misc = saveSections[0].split(';');
            console.log(str);
            Game.elderPactNum = parseInt(misc[1]);
            Game.buildWrinklerSlots(); //build so can summon later (and so summoning is random by row)
            if(Game.resets===parseInt(misc[0])){ //same ascension
                Game.loadModWrinklers(parseInt(misc[3]), parseFloat(misc[2]), parseInt(misc[4]), parseFloat(misc[5]));
            } else if(Game.elderWrath >= 3){
                Game.elderPactNum++; //loaded in a new ascension, but got to lvl 3
            }
            console.log('loaded');
            this.funcAfterLoad();
        },
        modifyUpgrades:function(){
            let tempFuncPact = Game.Upgrades["Elder Pact"].buyFunction;
            Game.Upgrades["Elder Pact"].buyFunction = ()=>{
                tempFuncPact();
                Game.elderPactNum++; //amount of times you've purchase elder pact
            };
            let tempFuncMind = Game.Upgrades["One mind"].buyFunction;
            Game.Upgrades["One mind"].buyFunction = ()=>{
                tempFuncMind();
                if(Game.Has('Holy touch')) wrinklersPlusPlus.setPopAllDisplay(true); //amount of times you've purchase elder pact
            };
            console.log('upgrades modified');
        },
        addUpgrades:function(){
            if(Game.Upgrades["Memory of the Elders"] === undefined){
                wrinklersPlusPlus.modUpgrades.push(Game.createPrestigeUpgrade([-165, -768], 'Memory of the Elders',loc('Scales the maximum wrinklers based on how many time you\'ve reached stage 3 of the Grandmapocalypse.<br><q>The grandmas will remember that.</q'),1000000,[8,9], ['Elder spice'], ()=>{
                    // if(Game.elderWrath >= 3){
                    //     Game.elderPactNum = 1;
                    // }
                }));
                wrinklersPlusPlus.modUpgrades.push(Game.createPrestigeUpgrade([-84, -950], 'Holy touch',loc('Unlocks the pop all wrinkler option.<br><q>The wrinklers flee from your hand.</q>'),10000000,[28,11], ['Memory of the Elders'], ()=>{}));    
                LocalizeUpgradesAndAchievs();
                return true;
            } else {
                return false;
            }
        },
        finishInit:function(btwAscensions = false){
            //LocalizeUpgradesAndAchievs();
            
        },
        funcBeforeLoad: function(){
            overwriteCookieClickerFunctions();
            Game.wrinklers = Game.wrinklers.map(e=>Wrinkler.makeWrinkler(e));
            //#region //variables with getters and setters, here to avoid problems with pre-loading
            let oldWrinklers = Game.wrinklers;
            setVarAttribute(Game, 'wrinklers', Game.wrinklers, e=>{
                if(e != undefined && e.length != Game.wrinklerLen || e != oldWrinklers){
                    oldWrinklers = e;
                    Game.buildWrinklerSlots(e);
                    Game.wrinklerLen = e.length;
                }
                return e;
            }, e=>{return e;});
            //more of a getter and setter method, will be Game.wrinklerInfo.wrinklerOverridenMax if set
            setVarAttribute(Game, 'wrinklerLimit', Game.wrinklerLimit, e=>{
                return Game.wrinklerInfo.wrinklerOverridenMax ?? e;
            }, changeWrinklerArrSize);

            setVarAttribute(Game.wrinklerInfo, 'wrinklerOverridenMax', undefined, undefined, changeWrinklerArrSize);
            setVarAttribute(Game, 'elderMemory', 0, e=>{
                if(Game.Has('Memory of the Elders')) return Game.elderPactNum - (Game.elderWrath >= 3);
                else return 0;
            },null);
            //the 2 below effect the size of the rows, so the wrinkler slots array has to be rebuilt if they are changed
            setVarAttribute(Game.wrinklerInfo, 'wrinklerSizeModifier', Game.wrinklerInfo.wrinklerSizeModifier, undefined, (e)=>{
                Game.buildWrinklerSlots();
                return e;
            });
            setVarAttribute(Game.wrinklerInfo, 'maxWrinklersFirstRow', Game.wrinklerInfo.maxWrinklersFirstRow, undefined, (e)=>{
                Game.buildWrinklerSlots();
                return e;
            });
            //#endregion
            Game.wrinklerLimit = 1000;
            Wrinkler.phaseChecker = true;
        },
        funcAfterLoad: function(){
            
            //does stuff after the game has loaded the save
            if(Game.Has("One mind") && Game.Has('Holy touch')){
                wrinklersPlusPlus.setPopAllDisplay(true);
            }
            Game.wrinklerInfo.prevMax = Game.getWrinklersMax();
            Game.buildWrinklerSlots();
            console.log(this.ModID + ' loaded');
            this.loaded = true;
            if(Game.OnAscend == 0){
                Game.Notify(loc(`${this.ModID.capitalize()} is now loaded`),"",[19,8],6);
            } else {
                alert(loc(`${this.ModID.capitalize()} is now loaded`));
            }
        },
        setPopAllDisplay: function(showBool = (getComputedStyle(elem).display == 'none')){
            let elem = document.querySelector('#popWrinklers');
            if(elem != undefined){
                elem.style.display = showBool ? 'block' : 'none';
            } else {
                throw new ReferenceError('Can\'t find an element with an ID of "popWrinklers"');
            }
        } 
    }
    class Wrinkler{
        static #wrinklerNum = 0;
        static phaseChecker = false;
        static scheduleWrinklerRebuild = false;
        id;
        close=0;
        sucked=0;
        x=0;
        y=0;
        r=0;
        hurt=0;
        hp=Game.wrinklerHP;
        selected=0;
        type=0;
        clicks=0;
        #phase = 0;
        constructor(i=Wrinkler.#wrinklerNum+1, shiny = 0){
            this.id = i;
            this.type = shiny;
            Wrinkler.#wrinklerNum++;
        }
        static makeWrinkler(obj){
            let test = new Wrinkler(); //this increases _wrinklerNum
            Object.assign(test, obj);
            return test;
        }
        static resetIndex(){
            Wrinkler.#wrinklerNum = 0;
        }
        get available(){
            return this.id < Game.getWrinklersMax();
        }
        set phase(val){
            if(Wrinkler.phaseChecker && !Wrinkler.scheduleWrinklerRebuild && !(this.#phase == 1 && val == 2)){ //if the mod is loaded and it isn't a phase change of coming to came
                Game.updateWrinklersAvailable(this, val);
            }
            if(Wrinkler.phaseChecker && val == 2){
                if(!Game.wrinklerInfo.wrinklersSucking.includes(this)){
                    Game.wrinklerInfo.wrinklersSucking.push(this);
                }
            }
            this.#phase = val;
            return val;
        }
        get phase(){
            return this.#phase;
        }
        
    }
    Game.buildWrinklerSlots = function(wrinklerArr = Game.wrinklers){
        Game.wrinklerInfo.wrinklersAvailableByRow = [];
        Game.wrinklerInfo.wrinklersSucking = [];
        let max = Game.getWrinklersMax();
        let available = 0;
        Game.wrinklerInfo.wrinklersAvailableByRow = wrinklerArr.reduce((objArr,me,i)=>{
            //objArr is a 2-D array, but may have gaps in indices (like empty 0-index or 1-index)
            if(me.phase == 0 && i < max){
                index = Game.findWrinklerRow(i);
                if(objArr[index] != undefined){
                    objArr[index].push(me);
                } else {
                    objArr[index] = [me];
                }
                available++;
            } else if(me.phase == 2 && i < max){
                Game.wrinklerInfo.wrinklersSucking.push(me);
            }
            return objArr;
        },[]);
        Game.wrinklerInfo.wrinklersAvailable = available;
        return Game.wrinklerInfo.wrinklersAvailableByRow;
    }
    Game.updateWrinklersAvailable = function(me, phase){
        //phase is newPhase
        let rowIndex = Game.findWrinklerRow(me.id);
        let row = Game.wrinklerInfo.wrinklersAvailableByRow[rowIndex];
        if(row == undefined && phase == 0){
            Game.wrinklerInfo.wrinklersAvailableByRow[rowIndex] = [me];
            Game.wrinklerInfo.wrinklersAvailable++;
            Game.wrinklerInfo.wrinklersSucking.remove(me);
        } else if(phase == 0){ //and row isn't undefined
            //if this space is available
            if(!row.includes(me)){
                for(let i = 0; i < row.length; i++){ //using binary search would be overkill
                    if(row[i].id > me.id){
                        row.splice(i, 0, me);
                        break;
                    }
                }
                Game.wrinklerInfo.wrinklersAvailable++;
            }
            Game.wrinklerInfo.wrinklersSucking.remove(me);
        } else if(row != undefined){
            //if this space is taken, delete it
            if(row.includes(me)){
                row.splice(row.indexOf(me), 1); //delete me (pun intended)
                Game.wrinklerInfo.wrinklersAvailable--;
            }
        }
        if(row != undefined && row.length == 0){
            Game.wrinklerInfo.wrinklersAvailableByRow[rowIndex] = undefined; //delete that part
        }
    }
    //#endregion
    function changeWrinklerArrSize(newMax){ //will keep private bc shouldn't rlly be called often
        if(newMax > 0 && Number.isInteger(newMax)){
            if(Game.wrinklers == undefined){
                console.log('setting wrinkler arr');
                Game.wrinklers = new Array(newMax);
            } else {
                Game.wrinklers.length = newMax;
            }
            
            //fill in the new wrinklers, if applicable
            for(let i = 0; i < newMax; i++){ //also could have used array.apply to make it undefined, but this way's faster
                if(Game.wrinklers[i] == undefined) Game.wrinklers[i]=new Wrinkler(i);
            }
            //codingSkill-- (a coder's skill is inversely proportional to how may setTimeouts they write, acc to a random person on reddit.)
            //could have used a promise, but this is faster
            setTimeout(Game.buildWrinklerSlots, 0); //do this after the variable is set, if this is used as a setter
        } else if(newMax != undefined){
            throw new Error("New max must be an integer greater than 0");
        }
        return newMax;
    }
    Game.calcWrinklerMaxFunction = function(minWrinklers){
        let power = 1.4424;
        let mult = 2;
        let x = Game.elderMemory;
        let carryingCapacity = 9000;
        if(Game.elderWrath >= 3 && x > 0) x--; //the current ascension doesn't count
        let multiplyingThing = mult * Math.pow(Game.elderMemory, power);
        return Math.min(Game.wrinklerLimit, Math.round(carryingCapacity * (minWrinklers + multiplyingThing) / (carryingCapacity + multiplyingThing)));
    }

    Game.calcWrinklerSpawnProb = function(multiplier, available = Game.wrinklerInfo.wrinklersAvailable){ //second param is for testing
        if(!multiplier){
            multiplier=Game.elderWrath;
            multiplier*=Game.eff('wrinklerSpawn');
            if (Game.Has('Unholy bait')) multiplier*=5;
            if (Game.hasGod){
                var godLvl=Game.hasGod('scorn');
                if (godLvl==1) multiplier*=2.5;
                else if (godLvl==2) multiplier*=2;
                else if (godLvl==3) multiplier*=1.5;
            }
            if (Game.Has('Wrinkler doormat')) multiplier=1000;
        }
        //Game.wrinklerInfo.wrinklersAvailableByRow.reduce((a,b)=>a+b.length,0)
        //let x = Game.getWrinklersMax()-Game.wrinklers.filter(e=>e.phase != 0).length; //todo: use Game.wrinklerInfo.wrinklersAvailableByRow
        let x = available;
        let power = 1.06;
        let mult = .01 * multiplier / 30;
        let carryingCapacity = .005;
        let multiplyingThing = mult * Math.pow(x/30, power);
        let prob = carryingCapacity * multiplyingThing / (carryingCapacity + multiplyingThing);
        return prob;
    }
    Game.calcCpsSuckedFunction = function(sucking, coefficient){
        if(coefficient === undefined){
            coefficient=1/20;//each wrinkler eats a twentieth of your CpS
            coefficient*=Game.eff('wrinklerEat');
            coefficient*=1+Game.auraMult('Dragon Guts')*0.2;
        }
        if(sucking < 1/coefficient){
            return coefficient * sucking;
        } else {
            return 1+coefficient*Math.pow(sucking-1/coefficient,2/3);
        }
    }
    Game.calcWrinklerSuckedFunction = function(sucking){
        let cookies = (Game.cookiesPs/Game.fps);
        if(sucking <= Game.wrinklerInfo.optimalMaxVanilla) return ((cookies*Game.cpsSucked))
        let addValue = cookies * Game.wrinklerInfo.optimalMaxVanilla*Game.calcCpsSuckedFunction(Game.wrinklerInfo.optimalMaxVanilla)*(1*-Math.pow(Game.wrinklerInfo.optimalMaxVanilla, -2/3))/sucking;
        return Math.pow(sucking, -2/3)*cookies*Game.calcCpsSuckedFunction(sucking)+addValue;
    }
    //wrinkler function: g(x)=Math.round(67786660+(14.05944-67786660)/(1+Math.pow(x/193895.2,1.429257)))
    /*
    //wrinklerfunction
    old: g(x) = Math.round(carryingCapacity + (addingThing * (minimumWrinklers - carryingCapacity) / (addingThing + Math.pow(numberElderPact, power))))
    addingTHing = carryingCapacity / 2 old: 449^power old:249720^{power}
    new: g(x) = carryingCapacity * (minimumWrinklers + mult * Math.pow(numberElderPact, power)) / (carryingCapacity + mult * Math.pow(numberElderPact, power)
    carryingCapacity = 9000 old: 92043870
    power = 1.4424
    mult = 2
    */
    //#region //useful funcs
    //feel free to use my code, just make sure to credit me before it!
    function toFixed(val, places){
        return Math.round((val + Number.EPSILON) * Math.pow(10, places)) / Math.pow(10, places);
    }
    function getCSSVar(variable){
        return getComputedStyle(document.body).getPropertyValue(variable);
    }
    function setCSSVar(variable, value){
    document.documentElement.style.setProperty(variable, " " + value);
    }
    function removeCSSVar(variable){
        document.documentElement.style.removeProperty(variable);
    }
    class Shortcut{
        keysObj = {};
        fired = false;
        releaseFunc = ()=>{};
        constructor(triggerFunc, ...Args){
            this.triggerFunc = triggerFunc;
            this.keys = Args;
            this.keys.forEach(e=>this.keysObj[e] = false);
            document.addEventListener('keydown', this.downListener = (e)=>{
                if(this.keysObj.hasOwnProperty(e.key)){
                    this.keysObj[e.key] = true;
                    if(Object.values(this.keysObj).every(e=>e) && !this.fired){
                        this.triggerFunc();
                        this.fired = true;
                    }
                }
            });
            document.addEventListener('keyup', this.upListener = 
    (e)=>{
                if(this.keysObj.hasOwnProperty(e.key)){
                    this.keysObj[e.key] = false;
                    if(this.fired){
                        this.releaseFunc();
                        this.fired = false;
                    }
                }
            });
        }
        addReleaseFunc = (func)=>{
            this.releaseFunc = func;
            return this;
        }
        removeShortcut = ()=> {
        document.removeEventListener('keydown', this.downListener);
            document.removeEventListener('keyup', this.upListener);
        }
    }
    function setVarAttribute(parent, varName, defaultVal, getter = e=>e, setter = e=>e, isConfigurable = true, isEnumerable = true){
        if(setter === null) setter = (e,obj)=>obj; //does not set
        if(Object.getOwnPropertyDescriptor(parent, varName)?.configurable === false){ //=== false bc can be undefined
            throw new Error("This property is already defined and unconfigurable, so you can't redefine it.");
        } else if(parent[varName] != undefined){
            console.warn(`Redefining property "${varName}" in parent ${parent.constructor.name}`);
        }
        var _tempVar = defaultVal;
        Object.defineProperty(parent, varName, {
        get: function() {
            return getter(_tempVar);
        },
        set: function (val) {
            _tempVar = setter(val,_tempVar);
        },
        configurable: isConfigurable,
        enumerable: isEnumerable
        });
        parent[varName] = defaultVal;
    }
    function repeat(func, num) {
        for(let i=0; i<num; i++) func();
    }
    function addFunction(obj, name, func, isConfigurable=true){
        //the below makes it not show up in for in loops
        Object.defineProperty(obj.prototype, name, {
            value: func,
            configurable: isConfigurable
        })
    }
    addFunction(Array, 'random', function(){return this[Math.floor(Math.random() * this.length)]});
    addFunction(Array, 'insert', function(i,...vals){
        this.splice(i,0,...vals);
    });
    addFunction(Array, 'remove', function(obj){
        let i = this.indexOf(obj);
        if(i != -1){
            this.splice(i,1);
            return true;
        } else {
            return false;
        }
    });
    addFunction(String, 'capitalize', function(){
        return this[0].toUpperCase() + this.substring(1);
    });
    //#endregion
    //#region //useful cc functions
    Game.AddMoreLoc = function(objs){
        for(let key in objs){
            if(locId === key){
                for(let obj in objs[key]){
                    if(objs[key][obj] === "/") objs[key][obj] = obj;
                }
                AddLanguage(key, undefined, objs[key], true);
            }
            return;
        }
    }
    Game.createPrestigeUpgrade = function(pos,name, desc, price, icon, parentArr, callback = undefined, localizeUpgrades = false){
        let upgrade = new Game.Upgrade(name,desc,price,icon,callback);
        Game.last.pool='prestige';
        Game.last.parents=parentArr;

        Game.PrestigeUpgrades.push(upgrade);
        if (upgrade.parents.length==0 && upgrade.name!='Legacy') upgrade.parents=['Legacy'];
        for (var i in upgrade.parents) {
            upgrade.parents[i]=Game.Upgrades[upgrade.parents[i]];
        }
        upgrade.posX = pos[0];
        upgrade.posY = pos[1];
        upgrade.vanilla = 0; //just in case
        if(localizeUpgrades) LocalizeUpgradesAndAchievs();
        return upgrade;
    }
    // Game._changeWrinklerMax = function(newMax){ //changed to a setter function
    //     if(newMax > 0 && Number.isInteger(newMax)){
    //         Game.wrinklers.length = newMax;
    //         //Game.wrinklerInfo.wrinklerOverridenMax = newMax; //will cause infinite loop
    //         //fill in the new wrinklers, if applicable
    //         for(let i = 0; i < newMax; i++){ //also could have used array.apply to make it undefined, but this way's faster
    //             if(Game.wrinklers[i] == undefined) Game.wrinklers[i]={id:i,close:0,sucked:0,phase:0,x:0,y:0,r:0,hurt:0,hp:Game.wrinklerHP,selected:0,type:0,clicks:0};;
    //         }
    //     } else {
    //         throw new Error("newMax must be an integer greater than 0");
    //     }
    // }
    //#endregion

    /* 

    Game.createPrestigeUpgrade([-200, -780], 'Wrath of the Elders',loc('The grandmas will remember that'),1000000,[8,9], ['Elder spice']);
    Game.AddMoreLoc(
        {"EN": {
                'The grandmas will remember that': '/'
            }
        }
    );

    LocalizeUpgradesAndAchievs();

    */

    //#region //my custom cookie clicker methods
    //changes the wrinklers position based on the index
    Game.getWrinklerPos = function(xBase, yBase, rad, bigCookieSize, index){
    //   let wrinklersInFullRows = Math.floor(maxWrinklers/Game.wrinklerInfo.wrinklersPerRow)*Game.wrinklerInfo.wrinklersPerRow;
        let rowIndex = Game.findWrinklerRow(index);
        //   let divisor = index <= (wrinklersInFullRows  * Game.wrinklerInfo.wrinklersPerRow) ? wrinklersInFullRows : maxWrinklers - wrinklersInFullRows;
        return [xBase + Math.sin(rad)*bigCookieSize*(1+.5*Game.wrinklerInfo.wrinklerSizeModifier*rowIndex),yBase+Math.cos(rad)*bigCookieSize*(1+.5*Game.wrinklerInfo.wrinklerSizeModifier*rowIndex)];
    }
    Game.findWrinklerRow = function(index){
    //   let rowIndex = 0;
    //   while(index > Game.getMaxWrinklersPerRow(rowIndex)){
    //     index-=Game.getMaxWrinklersPerRow(rowIndex);
    //     rowIndex++;
    //   }
    //   return rowIndex;
        let a = Game.wrinklerInfo.wrinklerSizeModifier;
        let b = Game.wrinklerInfo.wrinklerSizeModifier+4;
        let c = 4*(1-index/Game.wrinklerInfo.maxWrinklersFirstRow);
        return Math.floor((-b + Math.sqrt(b*b-4*a*c))/(2*a) + 10)-9; //+10 is to fix problems with it being -.0000001 and becoming -1
    }
    Game.getMaxWrinklersPerRow = function(rowIndex){
        //circ1/amount1=circ2/amount2
        //amount1*circ2/circ1 = amount2
        //circ1 = bigCookieSize *pi
        //circ2 = bigCookieSize*(1+.5*rowIndex)*pi
        //(n-1)*Game.wrinklerInfo.maxWrinklersFirstRow + Game.wrinklerInfo.maxWrinklersFirstRow*.5*Game.wrinklerInfo.wrinklerSizeModifier*rowIndex
        return Game.wrinklerInfo.maxWrinklersFirstRow * (1+.5*Game.wrinklerInfo.wrinklerSizeModifier*rowIndex);
    }
    Game.getMaxWrinklersBeforeRow = function(n){
        //using a solved summation
        return .25*Game.wrinklerInfo.maxWrinklersFirstRow*n*(Game.wrinklerInfo.wrinklerSizeModifier*(n-1)+4);
    }
    Game.calculateWrinklerRadius = function(i){
        let row = Game.findWrinklerRow(i);
        let maxBefore = Game.getMaxWrinklersBeforeRow(row);
        let maxWrinklersInRow = Game.getMaxWrinklersPerRow(row);
        let maxLeft = Game.getWrinklersMax() - maxBefore;
        if(maxLeft < maxWrinklersInRow){
            maxWrinklersInRow = maxLeft;
        }
        return (i-maxBefore)/maxWrinklersInRow*360 % 360;
    }
    Game.summonMultipleWrinklers = function(amount, forceShiny = false){ 
        for (var i = 0; i < amount; i++) Game.SpawnWrinkler(undefined, forceShiny); //may just fail later on
    }
    Game.popAllWrinklers = function(keepShinies = false){
        if(keepShinies instanceof Event){
            keepShinies = keepShinies.shiftKey;
        }
        //let promise = new Promise((resolve, reject)=>{
        let maxNotif = 0; //not used now, changed how it works
        let shinies = 0;
        let wrinklers = 0;
        let totalSucked = 0;
        let max = Game.getWrinklersMax();
        Game.wrinklers.forEach((e,i)=>{
            if(i < max && (!keepShinies || e.type != 1)){
                if(e.sucked > .5 && i < maxNotif){
                    i++;
                    e.suppressNotification = false;
                } else {
                    e.suppressNotification = true;
                }
                if(e.close != 0 && e.type == 1){
                    shinies++;
                } 
                if(e.close != 0){
                    wrinklers++;
                    totalSucked+=e.sucked;
                }
                e.hp = 0;
            }
        });
        // Game.Notify(me.type==1?loc("Exploded a shiny wrinkler"):loc("Exploded a wrinkler"),loc("Found <b>%1</b>!",loc("%1 cookie",LBeautify(me.sucked))),[19,8],6);
                // Game.Popup('<div style="font-size:80%;">'+loc("+%1!",loc("%1 cookie",LBeautify(me.sucked)))+'</div>',Game.mouseX,Game.mouseY);
        if(wrinklers > 0){
            Game.Notify((wrinklers === 1 ? loc("Exploded 1 wrinkler") : loc("Exploded %1 wrinklers", wrinklers)) + (shinies > 0 ?  (wrinklers == 1 ? loc(" which was a shiny"): (shinies === 1 ? loc(", 1 of which was a shiny") : loc(", %1 of which were shinies", shinies))) : ''), loc("Found <b>%1</b>!",loc("%1 cookie",LBeautify(totalSucked))), [19,8],6);
            Game.Popup('<div style="font-size:80%;">'+loc("+%1!",loc("%1 cookie",LBeautify(totalSucked)))+'</div>',Game.mouseX,Game.mouseY);
        }
        Wrinkler.scheduleWrinklerRebuild = true;
        //});
        Game.playWrinklerSquishSound();
        PlaySound('snd/pop'+Math.floor(Math.random()*3+1)+'.mp3',0.75);
    }
    Game.saveModWrinklers=function(){
        var amount=0;
        var amountShinies=0;
        var number=0;
        var shinies=0;
        for (let i = Game.wrinklerInfo.wrinklersSucking.length-1; i >= Math.min(Game.vanillaWrinklerFunctions.getWrinklersMax(), Game.wrinklerInfo.wrinklersSucking.length); i--){
            number++; //don't need an if statement bc know phase == 2
            if (Game.wrinklerInfo.wrinklersSucking[i].type==1){
                shinies++;
                amountShinies+=Game.wrinklerInfo.wrinklersSucking[i].sucked;
            } else amount+=Game.wrinklerInfo.wrinklersSucking[i].sucked;
        }
        return {amount:amount,number:number,shinies:shinies,amountShinies:amountShinies};
    }
    Game.loadModWrinklers = function(numWrinklers, amountSucked, numShinies, amountShiniesSucked){
        let fullNumShinies = numShinies;
        let fullNumRegular = numWrinklers-numShinies;
        for(i = 0; i < numWrinklers && i < Game.getWrinklersMax() - Game.vanillaWrinklerFunctions.getWrinklersMax() && i < Game.wrinklers.length; i++){ //just to be safe, technically some would just mean that the spawnWrinkler function returns false, but saves time
            let me = Game.wrinklerInfo.wrinklersAvailableByRow.find(e=>e!=undefined && e.length != 0)?.random();
            me.phase=2;
            me.close=1;
            me.hp=3;
            if (numShinies>0) {me.type=1;me.sucked=amountShiniesSucked/fullNumShinies;numShinies--;}
            else me.sucked=amountSucked/fullNumRegular;
        }
    }
    //for fun use only
    Game.summonWrinklersSetMax = function(amount, forceShiny = false){ 
        Game.setWrinklerMaxAndReset(amount);
        for (var i = 0; i < Game.getWrinklersMax(); i++) Game.SpawnWrinkler(undefined, forceShiny);
    }
    //for fun use only
    Game.setWrinklerMaxAndReset = (num) => {
    Game.wrinklerInfo.wrinklerOverridenMax = num;
    Game.wrinklers = new Array(Game.getWrinklersMax()).fill(0);
    Game.ResetWrinklers();
    };
    //#endregion

    //#region //Cookie Clicker modified code
    //Most of this code is just copied from the cookie clicker main.js (I just modified them a bit)
    //use summonWrinklersSetMax() to summon the wrinklers, then modify the wrinklersPerRow till it looks good
    //copied from cookie clicker for use in the UpdateWrinklers function
    window.inRect = function(x,y,rect){
        //find out if the point x,y is in the rotated rectangle rect{w,h,r,o} (width,height,rotation in radians,y-origin) (needs to be normalized)
        //I found this somewhere online I guess
        var dx = x+Math.sin(-rect.r)*(-(rect.h/2-rect.o)),dy=y+Math.cos(-rect.r)*(-(rect.h/2-rect.o));
        var h1 = Math.sqrt(dx*dx + dy*dy);
        var currA = Math.atan2(dy,dx);
        var newA = currA - rect.r;
        var x2 = Math.cos(newA) * h1;
        var y2 = Math.sin(newA) * h1;
        if (x2 > -0.5 * rect.w && x2 < 0.5 * rect.w && y2 > -0.5 * rect.h && y2 < 0.5 * rect.h) return true;
        return false;
    }

    function overwriteCookieClickerFunctions(){ //will keep local, no point not to
        Game.vanillaWrinklerFunctions = {
            getWrinklersMax: Game.getWrinklersMax,
            spawnWrinkler: Game.SpawnWrinkler,
            updateWrinkler: Game.UpdateWrinklers,
            drawWrinklers: Game.DrawWrinklers,
            calculateGains: Game.CalculateGains,
            resetWrinklers: Game.ResetWrinklers,
            collectWrinklers: Game.CollectWrinklers
        };
        //from cookie clicker, modified to have a custom max
        Game.getWrinklersMax = function () {
            if(Game.wrinklerInfo.wrinklerOverridenMax > 0){ //if defined and > 0
                return Game.wrinklerInfo.wrinklerOverridenMax;
            } else {
                let n = Game.wrinklerInfo.baseWrinklerMax;
                if (Game.Has('Elder spice')) n += 2;
                n+=Math.round(Game.auraMult('Dragon Guts')*2);
                if(Game.Has('Memory of the Elders')) n = Game.calcWrinklerMaxFunction(n);
                return n;
            }
        }
        //from cookie clicker, modified to forceRare and to allow "me" to be an index
        Game.SpawnWrinkler = function (me, forceRare = false) {
            if(Game.elderWrath <= 0){ return false;}
            if(Number.isInteger(me) && me >= 0 && me < Game.getWrinklersMax()){
                if(Game.wrinklers[me].phase==0){
                    me = Game.wrinklers[me];
                }
            } else if (!me) { //if me is undefined
                // var max = Game.getWrinklersMax();
                // var n = 0;
                // for (var i in Game.wrinklers) {
                //     if (Game.wrinklers[i].phase > 0) n++;
                // }
                // for (var i in Game.wrinklers) {
                //     var it = Game.wrinklers[i];
                //     if (it.phase == 0 && Game.elderWrath > 0 && n < max && it.id < max) {
                //         me = it;
                //         break;
                //     }
                // }
                me = Game.wrinklerInfo.wrinklersAvailableByRow.find(e=>e!=undefined && e.length != 0)?.random();
            }
            if (!me || Number.isInteger(me)) return false; //wrinklers are full
            me.phase = 1;
            me.hp = Game.wrinklerHP;
            me.type = 0;
            if (Math.random() < 0.0001 || forceRare) me.type = 1;//shiny wrinkler
            return me;
        }

        //from cookie clicker, modified to use a getPosition function, to supress notifications, to use a function to spawn wrinklers, 
        //to build the wrinkler slots if the maxWrinklers changed, and changed me.sucked to give use Game.calcWrinklerSuckedFunction
        window.updateArr=[];
        Game.UpdateWrinklers=function(){
            let start = performance.now();
            var max=Game.getWrinklersMax();
            if(Game.wrinklerInfo.prevMax !== max){
                Game.buildWrinklerSlots();
                Game.wrinklerInfo.prevMax = max;
            }
            if(Game.wrinklerInfo.wrinklersPerRow == 0 || Game.wrinklerInfo.wrinklersPerRow == undefined){
                Game.wrinklerInfo.wrinklersPerRow = max;
            }
            //try to spawn a wrinkler
            if (Game.elderWrath>0){
                if (Math.random()<Game.calcWrinklerSpawnProb())//respawn
                {
                    Game.SpawnWrinkler();
                }
            }
            var xBase=0;
            var yBase=0;
            var onWrinkler=0;
            if (Game.LeftBackground)
            {
                xBase=Game.cookieOriginX;
                yBase=Game.cookieOriginY;
            }
            var n=0;
            for (var i in Game.wrinklers)
            {
                if (Game.wrinklers[i].phase>0) n++;
            }
            for (var i in Game.wrinklers)
            {
                var me=Game.wrinklers[i];
                if (me.phase>0)
                {
                    if (me.close<1) me.close+=(1/Game.fps)/10;
                    if (me.close>1) me.close=1;
                    if (me.id>=max) me.hp=0;
                }
                else me.close=0;
                if (me.close==1 && me.phase==1)
                {
                    me.phase=2;
                    Game.recalculateGains=1;
                }
                if (me.phase==2){

                    me.sucked+=Game.calcWrinklerSuckedFunction(Game.wrinklerInfo.wrinklersSucking.length);//suck the cookies
                    //me.sucked+=(((Game.cookiesPs/Game.fps)*Game.cpsSucked));//suck the cookies
                }
                if (me.phase>0)
                {
                    if (me.type==0)
                    {
                        if (me.hp<Game.wrinklerHP) me.hp+=0.04;
                        me.hp=Math.min(Game.wrinklerHP,me.hp);
                    }
                    else if (me.type==1)
                    {
                        if (me.hp<Game.wrinklerHP*3) me.hp+=0.04;
                        me.hp=Math.min(Game.wrinklerHP*3,me.hp);
                    }
                    var d=128*(2-me.close);//*Game.BigCookieSize;
                    if (Game.prefs.fancy) d+=Math.cos(Game.T*0.05+parseInt(me.id))*4;
                    // let row = Game.findWrinklerRow(i);
                    // let maxBefore = Game.getMaxWrinklersBeforeRow(row);
                    // let maxWrinklersInRow = Game.getMaxWrinklersPerRow(row);
                    // let maxLeft = Game.getWrinklersMax() - maxBefore;
                    // if(maxLeft < maxWrinklersInRow){
                    //     maxWrinklersInRow = maxLeft;
                    // }
                    me.r=Game.calculateWrinklerRadius(i);
                    if (Game.prefs.fancy) me.r+=Math.sin(Game.T*0.05+parseInt(me.id))*4;
            
                    let pos = Game.getWrinklerPos(xBase, yBase, me.r*Math.PI/180, d, i);
                                    
                    me.x=pos[0];
                    me.y=pos[1];
                    if (Game.prefs.fancy) me.r+=Math.sin(Game.T*0.09+parseInt(me.id))*4;
                    var rect={w:100,h:200,r:(-me.r)*Math.PI/180,o:10};
                    if (Math.random()<0.01 && !Game.prefs.notScary) me.hurt=Math.max(me.hurt,Math.random());
                    if (Game.T%5==0 && Game.CanClick) {if (Game.LeftBackground && Game.mouseX<Game.LeftBackground.canvas.width && inRect(Game.mouseX-me.x,Game.mouseY-me.y,rect)) me.selected=1; else me.selected=0;}
                    if (me.selected && onWrinkler==0 && Game.CanClick)
                    {
                        me.hurt=Math.max(me.hurt,0.25);
                        //me.close*=0.99;
                        if (Game.Click && Game.lastClickedEl==l('backgroundLeftCanvas'))
                        {
                            if (Game.keys[17] && Game.sesame) {me.type=!me.type;PlaySound('snd/shimmerClick.mp3');}//ctrl-click on a wrinkler in god mode to toggle its shininess
                            else
                            {
                                Game.playWrinklerSquishSound();
                                me.clicks++;
                                if (me.clicks>=50) Game.Win('Wrinkler poker');
                                me.hurt=1;
                                me.hp-=0.75;
                                if (Game.prefs.particles && !Game.prefs.notScary && !Game.WINKLERS && !(me.hp<=0.5 && me.phase>0))
                                {
                                    var x=me.x+(Math.sin(me.r*Math.PI/180)*90);
                                    var y=me.y+(Math.cos(me.r*Math.PI/180)*90);
                                    for (var ii=0;ii<3;ii++)
                                    {
                                        //Game.particleAdd(x+Math.random()*50-25,y+Math.random()*50-25,Math.random()*4-2,Math.random()*-2-2,1,1,2,'wrinklerBits.png');
                                        var part=Game.particleAdd(x,y,Math.random()*4-2,Math.random()*-2-2,1,1,2,me.type==1?'shinyWrinklerBits.png':'wrinklerBits.png');
                                        part.r=-me.r;
                                    }
                                }
                            }
                            Game.Click=0;
                        }
                        onWrinkler=1;
                    }
                }
                
                if (me.hurt>0)
                {
                    me.hurt-=5/Game.fps;
                    //me.close-=me.hurt*0.05;
                    //me.x+=Math.random()*2-1;
                    //me.y+=Math.random()*2-1;
                    me.r+=(Math.sin(Game.T*1)*me.hurt)*18;//Math.random()*2-1;
                }
                if (me.hp<=0.5 && me.phase>0)
                {
                    if(!me.suppressNotification){ 
                        Game.playWrinklerSquishSound();
                        PlaySound('snd/pop'+Math.floor(Math.random()*3+1)+'.mp3',0.75);
                    }
                    Game.wrinklersPopped++;
                    Game.recalculateGains=1;
                    me.phase=0;
                    me.close=0;
                    me.hurt=0;
                    me.hp=3;
                    var toSuck=1.1;
                    if (Game.Has('Sacrilegious corruption')) toSuck*=1.05;
                    me.sucked*=1+Game.auraMult('Dragon Guts')*0.2;
                    if (me.type==1) toSuck*=3;//shiny wrinklers are an elusive, profitable breed
                    me.sucked*=toSuck;//cookie dough does weird things inside wrinkler digestive tracts
                    if (Game.Has('Wrinklerspawn')) me.sucked*=1.05;
                    if (Game.hasGod)
                    {
                        var godLvl=Game.hasGod('scorn');
                        if (godLvl==1) me.sucked*=1.15;
                        else if (godLvl==2) me.sucked*=1.1;
                        else if (godLvl==3) me.sucked*=1.05;
                    }
                    if (me.sucked>0.5)
                    {
                        if(!me.suppressNotification){ //to prevent lag when popping many wrinklers
                            Game.Notify(me.type==1?loc("Exploded a shiny wrinkler"):loc("Exploded a wrinkler"),loc("Found <b>%1</b>!",loc("%1 cookie",LBeautify(me.sucked))),[19,8],6);
                            Game.Popup('<div style="font-size:80%;">'+loc("+%1!",loc("%1 cookie",LBeautify(me.sucked)))+'</div>',Game.mouseX,Game.mouseY);
                        }
                        if (Game.season=='halloween')
                        {
                            //if (Math.random()<(Game.HasAchiev('Spooky cookies')?0.2:0.05))//halloween cookie drops
                            var failRate=0.95;
                            if (Game.HasAchiev('Spooky cookies')) failRate=0.8;
                            if (Game.Has('Starterror')) failRate*=0.9;
                            failRate*=1/Game.dropRateMult();
                            if (Game.hasGod)
                            {
                                var godLvl=Game.hasGod('seasons');
                                if (godLvl==1) failRate*=0.9;
                                else if (godLvl==2) failRate*=0.95;
                                else if (godLvl==3) failRate*=0.97;
                            }
                            if (me.type==1) failRate*=0.9;
                            if (Math.random()>failRate)//halloween cookie drops
                            {
                                var cookie=choose(['Skull cookies','Ghost cookies','Bat cookies','Slime cookies','Pumpkin cookies','Eyeball cookies','Spider cookies']);
                                if (!Game.HasUnlocked(cookie) && !Game.Has(cookie))
                                {
                                    Game.Unlock(cookie);
                                    Game.Notify(Game.Upgrades[cookie].dname,loc("You also found <b>%1</b>!",Game.Upgrades[cookie].dname),Game.Upgrades[cookie].icon);
                                }
                            }
                        }
                        Game.DropEgg(0.98);
                    }
                    if (me.type==1) Game.Win('Last Chance to See');
                    Game.Earn(me.sucked);
                    /*if (Game.prefs.particles && !Game.WINKLERS)
                    {
                        var x=me.x+(Math.sin(me.r*Math.PI/180)*100);
                        var y=me.y+(Math.cos(me.r*Math.PI/180)*100);
                        for (var ii=0;ii<6;ii++)
                        {
                            Game.particleAdd(x+Math.random()*50-25,y+Math.random()*50-25,Math.random()*4-2,Math.random()*-2-2,1,1,2,'wrinklerBits.png');
                        }
                    }*/
                    if (Game.prefs.particles)
                    {
                        var x=me.x+(Math.sin(me.r*Math.PI/180)*90);
                        var y=me.y+(Math.cos(me.r*Math.PI/180)*90);
                        if (me.sucked>0)
                        {
                            for (var ii=0;ii<5;ii++)
                            {
                                Game.particleAdd(Game.mouseX,Game.mouseY,Math.random()*4-2,Math.random()*-2-2,Math.random()*0.5+0.75,1.5,2);
                            }
                        }
                        if (!Game.prefs.notScary && !Game.WINKLERS)
                        {
                            for (var ii=0;ii<8;ii++)
                            {
                                var part=Game.particleAdd(x,y,Math.random()*4-2,Math.random()*-2-2,1,1,2,me.type==1?'shinyWrinklerBits.png':'wrinklerBits.png');
                                part.r=-me.r;
                            }
                        }
                    }
                    me.sucked=0;
                    me.suppressNotification = false;
                }
            }
            if (onWrinkler){
                Game.mousePointer=1;
            }
            if(Wrinkler.scheduleWrinklerRebuild){
                Game.buildWrinklerSlots();
                Wrinkler.scheduleWrinklerRebuild = false;
            }
        }
        
    Game.DrawWrinklers=function(){
            var ctx=Game.LeftBackground;
            var selected=0;
            for (var i in Game.wrinklers)
            {
                var me=Game.wrinklers[i];
                if (me.phase>0)
                {
                    ctx.globalAlpha=me.close;
                    ctx.save();
                    ctx.translate(me.x,me.y);
                    var sw=Game.wrinklerInfo.wrinklerSizeModifier * (100+2*Math.sin(Game.T*0.2+i*3));
                    var sh=Game.wrinklerInfo.wrinklerSizeModifier * (200+5*Math.sin(Game.T*0.2-2+i*3));
                    if (Game.prefs.fancy)
                    {
                        ctx.translate(0,30);
                        ctx.rotate(-(me.r)*Math.PI/180);
                        ctx.drawImage(Pic('wrinklerShadow.png'),-sw/2,-10,sw,sh);
                        ctx.rotate((me.r)*Math.PI/180);
                        ctx.translate(0,-30);
                    }
                    ctx.rotate(-(me.r)*Math.PI/180);
                    //var s=Math.min(1,me.sucked/(Game.cookiesPs*60))*0.75+0.25;//scale wrinklers as they eat
                    //ctx.scale(Math.pow(s,1.5)*1.25,s);
                    //ctx.fillRect(-50,-10,100,200);
                    var pic=Game.WINKLERS?'winkler.png':'wrinkler.png';
                    if (me.type==1) pic=Game.WINKLERS?'shinyWinkler.png':'shinyWrinkler.png';
                    else if (Game.season=='christmas') pic=Game.WINKLERS?'winterWinkler.png':'winterWrinkler.png';
                    ctx.drawImage(Pic(pic),-sw/2,-10,sw,sh);
                    if (!Game.WINKLERS && Game.prefs.notScary) ctx.drawImage(Pic(Math.sin(Game.T*0.003+i*11+137+Math.sin(Game.T*0.017+i*13))>0.9997?'wrinklerBlink.png':'wrinklerGooglies.png'),-sw/2,-10+1*Math.sin(Game.T*0.2+i*3+1.2),sw,sh);
                    //ctx.drawImage(Pic(pic),-50,-10);
                    //ctx.fillText(me.id+' : '+me.sucked,0,0);
                    if (me.type==1 && Math.random()<0.3 && Game.prefs.particles)//sparkle
                    {
                        ctx.globalAlpha=Math.random()*0.65+0.1;
                        var s=Math.random()*30+5;
                        ctx.globalCompositeOperation='lighter';
                        ctx.drawImage(Pic('glint.png'),-s/2+Math.random()*50-25,-s/2+Math.random()*200,s,s);
                    }
                    ctx.restore();
                    
                    if (Game.prefs.particles && me.phase==2 && Math.random()<0.03)
                    {
                        Game.particleAdd(me.x,me.y,Math.random()*4-2,Math.random()*-2-2,Math.random()*0.5+0.5,1,2);
                    }
                    
                    if (me.selected) selected=me;
                }
            }
            if (selected && Game.Has('Eye of the wrinkler'))
            {
                var x=Game.cookieOriginX;
                var y=Game.cookieOriginY;
                ctx.font='14px Merriweather';
                ctx.textAlign='center';
                var text=loc("Swallowed:");
                var width=Math.ceil(Math.max(ctx.measureText(text).width,ctx.measureText(Beautify(selected.sucked)).width));
                ctx.fillStyle='#000';
                ctx.globalAlpha=0.65;
                /*ctx.strokeStyle='#000';
                ctx.lineWidth=8;
                ctx.beginPath();
                ctx.moveTo(x,y);
                ctx.lineTo(Math.floor(selected.x),Math.floor(selected.y));
                ctx.stroke();*/
                var xO=x-width/2-16;
                var yO=y-4;
                var dist=Math.floor(Math.sqrt((selected.x-xO)*(selected.x-xO)+(selected.y-yO)*(selected.y-yO)));
                var angle=-Math.atan2(yO-selected.y,xO-selected.x)+Math.PI/2;
                ctx.strokeStyle='#fff';
                ctx.lineWidth=1;
                for (var i=0;i<Math.floor(dist/12);i++)
                {
                    var xC=selected.x+Math.sin(angle)*i*12;
                    var yC=selected.y+Math.cos(angle)*i*12;
                    ctx.beginPath();
                    ctx.arc(xC,yC,4+(Game.prefs.fancy?2*Math.pow(Math.sin(-Game.T*0.2+i*0.3),4):0),0,2*Math.PI,false);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.fillRect(x-width/2-8-10,y-23,width+16+20,38);
                ctx.strokeStyle='#fff';
                ctx.lineWidth=1;
                ctx.strokeRect(x-width/2-8-10+1.5,y-23+1.5,width+16+20-3,38-3);
                ctx.globalAlpha=1;
                ctx.fillStyle='#fff';
                ctx.fillText(text,x+14,y-8);
                ctx.fillText(Beautify(selected.sucked),x+10,y+8);
                var s=54+2*Math.sin(Game.T*0.4);
                ctx.drawImage(Pic('icons.png'),27*48,26*48,48,48,x-width/2-16-s/2,y-4-s/2,s,s);
            }
        }
                
        Game.CalculateGains=function(){
            Game.cookiesPs=0;
            var mult=1;
            //add up effect bonuses from building minigames
            var effs={};
            for (var i in Game.Objects)
            {
                if (Game.Objects[i].minigameLoaded && Game.Objects[i].minigame.effs)
                {
                    var myEffs=Game.Objects[i].minigame.effs;
                    for (var ii in myEffs)
                    {
                        if (effs[ii]) effs[ii]*=myEffs[ii];
                        else effs[ii]=myEffs[ii];
                    }
                }
            }
            Game.effs=effs;
            
            if (Game.ascensionMode!=1) mult+=parseFloat(Game.prestige)*0.01*Game.heavenlyPower*Game.GetHeavenlyMultiplier();
            
            mult*=Game.eff('cps');
            
            if (Game.Has('Heralds') && Game.ascensionMode!=1) mult*=(1+0.01*Game.heralds);
            
            for (var i in Game.cookieUpgrades)
            {
                var me=Game.cookieUpgrades[i];
                if (Game.Has(me.name))
                {
                    mult*=(1+(typeof(me.power)==='function'?me.power(me):me.power)*0.01);
                }
            }
            
            if (Game.Has('Specialized chocolate chips')) mult*=1.01;
            if (Game.Has('Designer cocoa beans')) mult*=1.02;
            if (Game.Has('Underworld ovens')) mult*=1.03;
            if (Game.Has('Exotic nuts')) mult*=1.04;
            if (Game.Has('Arcane sugar')) mult*=1.05;
            
            if (Game.Has('Increased merriness')) mult*=1.15;
            if (Game.Has('Improved jolliness')) mult*=1.15;
            if (Game.Has('A lump of coal')) mult*=1.01;
            if (Game.Has('An itchy sweater')) mult*=1.01;
            if (Game.Has('Santa\'s dominion')) mult*=1.2;
            
            if (Game.Has('Fortune #100')) mult*=1.01;
            if (Game.Has('Fortune #101')) mult*=1.07;
            
            if (Game.Has('Dragon scale')) mult*=1.03;
            
            var buildMult=1;
            if (Game.hasGod)
            {
                var godLvl=Game.hasGod('asceticism');
                if (godLvl==1) mult*=1.15;
                else if (godLvl==2) mult*=1.1;
                else if (godLvl==3) mult*=1.05;
                
                var godLvl=Game.hasGod('ages');
                if (godLvl==1) mult*=1+0.15*Math.sin((Date.now()/1000/(60*60*3))*Math.PI*2);
                else if (godLvl==2) mult*=1+0.15*Math.sin((Date.now()/1000/(60*60*12))*Math.PI*2);
                else if (godLvl==3) mult*=1+0.15*Math.sin((Date.now()/1000/(60*60*24))*Math.PI*2);
                
                var godLvl=Game.hasGod('decadence');
                if (godLvl==1) buildMult*=0.93;
                else if (godLvl==2) buildMult*=0.95;
                else if (godLvl==3) buildMult*=0.98;
                
                var godLvl=Game.hasGod('industry');
                if (godLvl==1) buildMult*=1.1;
                else if (godLvl==2) buildMult*=1.06;
                else if (godLvl==3) buildMult*=1.03;
                
                var godLvl=Game.hasGod('labor');
                if (godLvl==1) buildMult*=0.97;
                else if (godLvl==2) buildMult*=0.98;
                else if (godLvl==3) buildMult*=0.99;
            }
            
            if (Game.Has('Santa\'s legacy')) mult*=1+(Game.santaLevel+1)*0.03;
            
            
            Game.milkProgress=Game.AchievementsOwned/25;
            var milkMult=1;
            if (Game.Has('Santa\'s milk and cookies')) milkMult*=1.05;
            //if (Game.hasAura('Breath of Milk')) milkMult*=1.05;
            milkMult*=1+Game.auraMult('Breath of Milk')*0.05;
            if (Game.hasGod)
            {
                var godLvl=Game.hasGod('mother');
                if (godLvl==1) milkMult*=1.1;
                else if (godLvl==2) milkMult*=1.05;
                else if (godLvl==3) milkMult*=1.03;
            }
            milkMult*=Game.eff('milk');
            
            var catMult=1;
            
            if (Game.Has('Kitten helpers')) catMult*=(1+Game.milkProgress*0.1*milkMult);
            if (Game.Has('Kitten workers')) catMult*=(1+Game.milkProgress*0.125*milkMult);
            if (Game.Has('Kitten engineers')) catMult*=(1+Game.milkProgress*0.15*milkMult);
            if (Game.Has('Kitten overseers')) catMult*=(1+Game.milkProgress*0.175*milkMult);
            if (Game.Has('Kitten managers')) catMult*=(1+Game.milkProgress*0.2*milkMult);
            if (Game.Has('Kitten accountants')) catMult*=(1+Game.milkProgress*0.2*milkMult);
            if (Game.Has('Kitten specialists')) catMult*=(1+Game.milkProgress*0.2*milkMult);
            if (Game.Has('Kitten experts')) catMult*=(1+Game.milkProgress*0.2*milkMult);
            if (Game.Has('Kitten consultants')) catMult*=(1+Game.milkProgress*0.2*milkMult);
            if (Game.Has('Kitten assistants to the regional manager')) catMult*=(1+Game.milkProgress*0.175*milkMult);
            if (Game.Has('Kitten marketeers')) catMult*=(1+Game.milkProgress*0.15*milkMult);
            if (Game.Has('Kitten analysts')) catMult*=(1+Game.milkProgress*0.125*milkMult);
            if (Game.Has('Kitten executives')) catMult*=(1+Game.milkProgress*0.115*milkMult);
            if (Game.Has('Kitten admins')) catMult*=(1+Game.milkProgress*0.11*milkMult);
            if (Game.Has('Kitten strategists')) catMult*=(1+Game.milkProgress*0.105*milkMult);
            if (Game.Has('Kitten angels')) catMult*=(1+Game.milkProgress*0.1*milkMult);
            if (Game.Has('Fortune #103')) catMult*=(1+Game.milkProgress*0.05*milkMult);
            
            Game.cookiesMultByType['kittens']=catMult;
            
            for (var i in Game.Objects)
            {
                var me=Game.Objects[i];
                me.storedCps=me.cps(me);
                if (Game.ascensionMode!=1) me.storedCps*=(1+me.level*0.01)*buildMult;
                if (me.id==1 && Game.Has('Milkhelp&reg; lactose intolerance relief tablets')) me.storedCps*=1+0.05*Game.milkProgress*milkMult;//this used to be "me.storedCps*=1+0.1*Math.pow(catMult-1,0.5)" which was. hmm
                me.storedTotalCps=me.amount*me.storedCps;
                Game.cookiesPs+=me.storedTotalCps;
                Game.cookiesPsByType[me.name]=me.storedTotalCps;
            }
            //cps from buildings only
            Game.buildingCps=Game.cookiesPs;
            
            if (Game.Has('"egg"')) {Game.cookiesPs+=9;Game.cookiesPsByType['"egg"']=9;}//"egg"
            
            mult*=catMult;
            
            var eggMult=1;
            if (Game.Has('Chicken egg')) eggMult*=1.01;
            if (Game.Has('Duck egg')) eggMult*=1.01;
            if (Game.Has('Turkey egg')) eggMult*=1.01;
            if (Game.Has('Quail egg')) eggMult*=1.01;
            if (Game.Has('Robin egg')) eggMult*=1.01;
            if (Game.Has('Ostrich egg')) eggMult*=1.01;
            if (Game.Has('Cassowary egg')) eggMult*=1.01;
            if (Game.Has('Salmon roe')) eggMult*=1.01;
            if (Game.Has('Frogspawn')) eggMult*=1.01;
            if (Game.Has('Shark egg')) eggMult*=1.01;
            if (Game.Has('Turtle egg')) eggMult*=1.01;
            if (Game.Has('Ant larva')) eggMult*=1.01;
            if (Game.Has('Century egg'))
            {
                //the boost increases a little every day, with diminishing returns up to +10% on the 100th day
                var day=Math.floor((Date.now()-Game.startDate)/1000/10)*10/60/60/24;
                day=Math.min(day,100);
                eggMult*=1+(1-Math.pow(1-day/100,3))*0.1;
            }
            
            Game.cookiesMultByType['eggs']=eggMult;
            mult*=eggMult;
            
            if (Game.Has('Sugar baking')) mult*=(1+Math.min(100,Game.lumps)*0.01);
            
            //if (Game.hasAura('Radiant Appetite')) mult*=2;
            mult*=1+Game.auraMult('Radiant Appetite');
            
            var rawCookiesPs=Game.cookiesPs*mult;
            for (var i in Game.CpsAchievements)
            {
                if (rawCookiesPs>=Game.CpsAchievements[i].threshold) Game.Win(Game.CpsAchievements[i].name);
            }
            Game.cookiesPsRaw=rawCookiesPs;
            Game.cookiesPsRawHighest=Math.max(Game.cookiesPsRawHighest,rawCookiesPs);
            
            var n=Game.shimmerTypes['golden'].n;
            var auraMult=Game.auraMult('Dragon\'s Fortune');
            for (var i=0;i<n;i++){mult*=1+auraMult*1.23;}
            
            name=Game.bakeryName.toLowerCase();
            if (name=='orteil') mult*=0.99;
            else if (name=='ortiel') mult*=0.98;//or so help me
            
            var sucking=0;
            for (var i in Game.wrinklers)
            {
                if (Game.wrinklers[i].phase==2)
                {
                    sucking++;
                }
            }
            var suckRate=1/20;//each wrinkler eats a twentieth of your CpS
            suckRate*=Game.eff('wrinklerEat');
            suckRate*=1+Game.auraMult('Dragon Guts')*0.2;
            Game.wrinklerInfo.maxSuckedValue = (Game.wrinklerInfo.maxSuckedValue == undefined || isNaN(Game.wrinklerInfo.maxSuckedValue) ? .99 : Game.wrinklerInfo.maxSuckedValue);
            Game.cpsSucked=Math.min(Game.wrinklerInfo.maxSuckedValue,Game.calcCpsSuckedFunction(sucking, suckRate));
            
            
            if (Game.Has('Elder Covenant')) mult*=0.95;
            
            if (Game.Has('Golden switch [off]'))
            {
                var goldenSwitchMult=1.5;
                if (Game.Has('Residual luck'))
                {
                    var upgrades=Game.goldenCookieUpgrades;
                    for (var i in upgrades) {if (Game.Has(upgrades[i])) goldenSwitchMult+=0.1;}
                }
                mult*=goldenSwitchMult;
            }
            if (Game.Has('Shimmering veil [off]'))
            {
                mult*=1+Game.getVeilBoost();
            }
            if (Game.Has('Magic shenanigans')) mult*=1000;
            if (Game.Has('Occult obstruction')) mult*=0;
            
            
            Game.cookiesPs=Game.runModHookOnValue('cps',Game.cookiesPs);
            
            
            //cps without golden cookie effects
            Game.unbuffedCps=Game.cookiesPs*mult;
            
            for (var i in Game.buffs)
            {
                if (typeof Game.buffs[i].multCpS!=='undefined') mult*=Game.buffs[i].multCpS;
            }
            
            Game.globalCpsMult=mult;
            Game.cookiesPs*=Game.globalCpsMult;
            
            //if (Game.hasBuff('Cursed finger')) Game.cookiesPs=0;
            
            Game.computedMouseCps=Game.mouseCps();
            
            Game.computeLumpTimes();
            
            Game.recalculateGains=0;
        }
        Game.ResetWrinklers=function(){
            Wrinkler.resetIndex();
            for (var i in Game.wrinklers){
                Game.wrinklers[i]=new Wrinkler(parseInt(i));
            }
            Game.buildWrinklerSlots();
        }
        Game.SaveWrinklers=function(){
                var amount=0;
                var amountShinies=0;
                var number=0;
                var shinies=0;
                for (let i = 0; i < Game.vanillaWrinklerFunctions.getWrinklersMax() && i < Game.wrinklerInfo.wrinklersSucking.length; i++){
                    number++; //don't need an if statement bc know phase == 2
                    if (Game.wrinklerInfo.wrinklersSucking[i].type==1){
                        shinies++;
                        amountShinies+=Game.wrinklers[i].sucked;
                    } else amount+=Game.wrinklerInfo.wrinklersSucking[i].sucked;
                }
                return {amount:amount,number:number,shinies:shinies,amountShinies:amountShinies};
            }
        Game.CollectWrinklers = Game.popAllWrinklers;
    }
    //#endregion

    //#region //old code
    /*
        let WOTE = new Game.Upgrade('Wrath of the Elders',loc('The grandmas will remember that'),1000000,[8,9],function(){Game.upgradesToRebuild=1;});Game.last.pool='prestige';Game.last.parents=['Elder spice'];

        Game.PrestigeUpgrades.push(WOTE);
        if (WOTE.posX || WOTE.posY) {
            WOTE.placedByCode=true;
        } else {
            WOTE.posX=0;WOTE.posY=0;
        }
        if (WOTE.parents.length==0 && WOTE.name!='Legacy') WOTE.parents=['Legacy'];
        for (var i in WOTE.parents) {
            WOTE.parents[i]=Game.Upgrades[WOTE.parents[i]];
        }

        WOTE.posX = -200;
        WOTE.posY = -780;
    */
    //#endregion

    //#region //funstuff

    function animate(startVal, endVal, duration, func=a=>{}, resolution = 1){
        clearInterval(window.wrinklerAnimation);
        let lastTime = performance.now() / 1000;
        window.wrinklerAnimation = setInterval(()=>{
        let time = performance.now();
        let percent = (time/1000 - lastTime) / duration;
        if(percent >=1){
            lastTime = performance.now()/1000;
            return;
        }
            
        let range = (endVal - startVal);
        func(endVal-Math.abs(range- 2*range*percent));
        },resolution)
    }
    function stopAnimation(){
        clearInterval(window.wrinklerAnimation);
    }

    //animate(.1,1.5,2,a=>Game.wrinklerInfo.wrinklerSizeModifier = a);
    /*
    async function testTicksTillFull(max){
        Game.setWrinklerMaxAndReset(max);
    let promise = new Promise((resolve, reject)=>{
        let x = 0;
        let t = 0;
        while(x<max){
            if (Math.random()<Game.calcWrinklerSpawnProb())//respawn
            {
                Game.SpawnWrinkler(x);
                x++;
                
            }
            t++;
        }
        resolve(t);
    });
        let val = await promise;
        return val;
    }

    */
    /*
        //testing wrinkler spawn probability
        let arr = [];
    repeat(()=>{
        let i = 0;
        let exec = 0;
        let max = Game.vanillaWrinklerFunctions.getWrinklersMax();
        while(i < max){
            exec++;
            if(Math.random()<Game.calcWrinklerSpawnProb(undefined, max-i)){
                i++;
            }
        }
        arr.push(exec);
    }, 1000)

        let arr = [];
        let promise = new Promise((resolve, reject)=>{
            repeat(()=>{
                let i = 0;
                let exec = 0;
                let max = Game.vanillaWrinklerFunctions.getWrinklersMax();
                while(i < max){
                    exec++;
                    if(Math.random()<Game.calcWrinklerSpawnProb(undefined, max-i)){
                        i++;
                    }
                }
                arr.push(exec);
            }, 1000)
        });
    */
    /*
        //vanilla test
        let arr = [];
    let promise = new Promise((resolve, reject)=>{
        repeat(()=>{
            let i = 0;
            let exec = 0;
            let max = Game.getWrinklersMax();
            while(i < max){
                exec++;
                let test = i;
                for(let j = 0; j < max - test; j++){
                    var chance=0.00001*Game.elderWrath;
                        chance*=Game.eff('wrinklerSpawn');
                        if (Game.Has('Unholy bait')) chance*=5;
                        if (Game.hasGod)
                        {
                            var godLvl=Game.hasGod('scorn');
                            if (godLvl==1) chance*=2.5;
                            else if (godLvl==2) chance*=2;
                            else if (godLvl==3) chance*=1.5;
                        }
                        if (Game.Has('Wrinkler doormat')) chance=0.1;
                        if (Math.random()<chance)//respawn
                        {
                            i++;
                        }
                }
            }
            arr.push(exec);
        }, 1000)
    });
    */
    //#endregion


    Game.registerMod(wrinklersPlusPlus.ModID,wrinklersPlusPlus);
})();
