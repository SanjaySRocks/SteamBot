const SteamUser = require('steam-user');
// const SteamCommunity = require('steamcommunity');
const axios = require('axios')
const path = require('path')
const fs = require('fs')

const config = require('./configs.json');

var client = new SteamUser();
// var community = new SteamCommunity();
// var SteamID = SteamCommunity.SteamID;

let folder_data = "data"

let friends = [];

client.logOn({
    accountName: config.username,
    password: config.password,
    twoFactorCode: '542by',
    rememberPassword: true
});

client.on('loggedOn', function (details) {
    console.log("[Steam Bot] Logged into Steam as " + client.steamID.getSteam3RenderedID());
    client.setPersona(SteamUser.EPersonaState.Invisible);

    // Games to idle 
    client.gamesPlayed(config.games);
});

client.on('error', function (e) {
    console.log("Error: " + e);
});

client.on('webSession', function (sessionID, cookies) {
    // console.log("[Steam Bot] Got web session");
});

client.on('friendsList', async function () {

    friends = Object.keys(client.myFriends).filter(steamId => client.myFriends[steamId] == SteamUser.EFriendRelationship.Friend);

    await DumpFriends(friends);
    console.log('Total Number of Friends: ' + friends.length);

    // Friend Mode:-
    // 1. all friends 
    // 2. select friends who playing game (default)
    // 3. debug developer use only (not to be used)

    // Mode:-
    // 1. Send Message
    // 2. Send Group Invite (default)

    // execSend(friend_mode=2, game_id=730, mode=2);
    checkVacID(removeFriend = false);
    // run();
});


async function DumpFriends(friends) {
    const chunkSize = 100;
    let friends_details = [];
    for (let i = 0; i < friends.length; i += chunkSize) {
        const chunk = friends.slice(i, i + chunkSize);

        const d = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config['apikey']}&steamids=` + chunk)

        d.data.response.players.map((x) => {
            friends_details.push(x);
        })
    }

    console.log('Fetching friends data...')

    // Store all friends details such as name , avatar
    let filex = `${folder_data}/${client.steamID.getSteamID64()}/friends_details.json`
    ensureDirectoryExistence(filex)
    fs.writeFileSync(filex, JSON.stringify(friends_details, null, 4), 'utf-8');

    // Store friends ids 
    let filey = `${folder_data}/${client.steamID.getSteamID64()}/friends_ids.json`
    ensureDirectoryExistence(filey)
    fs.writeFileSync(filey, JSON.stringify(friends, null, 4));

    //Store vacban data
    await DumpVacBans(friends);
}

function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

// Thanks Snabe for this code.
client.on('friendRelationship', async (steamID, relationship) => {
    // Get Information about steamid
    const playerinfo = await client.getPersonas([steamID]);
    const steamid64 = steamID.getSteamID64();
    const player_name = playerinfo.personas[steamid64].player_name;

    switch (relationship) {
        case 2:
            console.log(`Incoming Friend Request from User ${player_name} - ${steamID}`);

            try {
                // Add incoming friend request
                await client.addFriend(steamID)
            }
            catch (e) {
                console.log(`Error adding user ${player_name}` + e);
            }
            break;

        case 3:
            console.log(`Accepted Incoming Friend Request Of User ${player_name} - ${steamID}`);

            // Send sweet greeting message on adding
            try {
                await client.chat.sendFriendMessage(steamID, `Greetings ${player_name}! thanks for adding me friend :')\nHave a good day!`);

                console.log('Message Sent!');
            } catch (e) {
                console.log('Message send failed:' + e)
            }

            //Invite that user to our Steam group
            await client.inviteUserToGroup(config.groupid, steamID);
            console.log(`Group Invite Sent to User ${player_name} - ${steamID}`);

            break;
        default:
            break;
    }
});


client.on('friendMessage', async function (steamID, message) {
    console.log("Friend message from " + steamID.getSteam3RenderedID() + ": " + message);

    if (message.toLowerCase().includes("!test")) {
        await client.chat.sendFriendMessage(steamID, "Test Successful :steamhappy:")
    }

    if (message.toLowerCase() === ("!vac")) {
        
    }

    if (message.toLowerCase() === ("!exec")) {
        await client.chat.sendFriendMessage(steamID, `Executed...`)
        await execSend();
    }

    if (message.toLowerCase() === ("!profile")) {
        
    }
});


async function DumpVacBans(friends) {
    console.log('Fetching Vacbans data...');

    let vac_friends = [];
    const chunkSize = 100;

    for (let i = 0; i < friends.length; i += chunkSize) {
        const chunk = friends.slice(i, i + chunkSize);

        const d = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${config['apikey']}&steamids=` + chunk)

        d.data.players.map((x) => vac_friends.push(x));


        let file = `${folder_data}/${client.steamID.getSteamID64()}/vacbans.json`
        ensureDirectoryExistence(file)
        fs.writeFileSync(file, JSON.stringify(vac_friends, null, 4), 'utf-8');

        // merge both data

    }
}

async function checkVacID(removeFriend = false) {
    console.log('Vac Remove Friend: ', removeFriend ? 'Enabled' : 'Disabled')

    // Merge data so we get name with userid
    const data = fs.readFileSync(`${folder_data}/${client.steamID.getSteamID64()}/friends_details.json`, "utf-8");
    const vacdata = fs.readFileSync(`${folder_data}/${client.steamID.getSteamID64()}/vacbans.json`, "utf-8");
    const jsonData = JSON.parse(data);
    const jsonVacData = JSON.parse(vacdata);

    jsonVacData.map((x) => {
        let objx = jsonData.find((o, i) => {
            if (o.steamid === x.SteamId) {
                jsonData[i] = { ...jsonData[i], vacbans: x };
                return true; // stop searching
            }
        });
    });

    let filer_vac_ids = jsonData.filter((x) => x.vacbans.VACBanned == true);
    let filer_gamebans = jsonData.filter((x) => parseInt(x.NumberOfGameBans) > 0);

    //vac banned users
    filer_vac_ids.map((x) => {
        try {
            if (removeFriend === true) {
                client.removeFriend(x.steamid)
            }
            console.log(`VAC BANNED: ${x.personaname} ${x.steamid}`);
        } catch (e) {
            console.log("Error:" + e)
        }
    })

    //
    //game banned users
    filer_gamebans.map((x) => {
        try {
            if (removeFriend === true) {
                client.removeFriend(x.steamid)
            }
            console.log(`GAME BANNED: ${x.personaname} ${x.steamid}`);
        } catch (e) {
            console.log("Error:" + e)
        }
    })

}

async function execSend(friend_mode = 3, game_id = 730, mode = 2) {

    // Friend Mode:-
    // 1. all friends 
    // 2. select friends who playing game (default)
    // 3. debug developer use only (not to be used)

    // Mode:-
    // 1. Send Message
    // 2. Send Group Invite (default)
    /*
        if (friend_mode == 1) {
            // Get all friends
            friend_list = Object.keys(client.myFriends).filter(steamId => client.myFriends[steamId] == SteamUser.EFriendRelationship.Friend);
    
            console.log(`Friend Mode: All Friends`)
        }
        else if (friend_mode == 2) {
            // Get friends who are playing some game
            console.log(`Friend Mode: Game Friends | GameID: ${game_id}`)
            console.log(friends, game_id);
            try {
                const response = await client.requestRichPresence(game_id, friends);
                friend_list = Object.keys(response.users)
            } catch (e) {
                console.log("Error:" + e)
            }
        }
        else if (friend_mode == 3) {
            friend_list = ['76561197962029809'];
        }
    
        const total_friends = friend_list.length
        console.log('[Steam Bot] Selected Total Friends: ' + total_friends);
    */
    const data = fs.readFileSync(`${folder_data}/${client.steamID.getSteamID64()}/friends_details.json`, "utf-8");
    const jsonData = JSON.parse(data);

    if (!jsonData.length) {
        return;
    }

    jsonData.map(async (x, i) => {
        const msg = fs.readFileSync('ad.txt', 'utf-8');

        switch (mode) {
            case 1: {
                setTimeout(() => {
                    try {
                        var mapObj = {
                            "{name}": x.personaname,
                            "{steam}": x.steamid,
                        };

                        msg = msg.toString();
                        var re = new RegExp(Object.keys(mapObj).join("|"), "gi");
                        msg = msg.replace(re, function (matched) {
                            return mapObj[matched];
                        });

                        console.log(`MESSAGE: #${i + 1}/${jsonData.length} ${x.personaname} ${x.steamid}`)

                        await client.chatMessage(x.steamid, msg);
                    } catch (e) {
                        console.log("Error:" + e);
                    }
                }, 2000 * i + 1);

                break;
            }

            case 2: {
                setTimeout(() => {
                    try {

                        console.log(`GROUP INVITE: #${i + 1}/${jsonData.length} ${x.personaname} ${x.steamid}`)
                        client.inviteToGroup(x.steamid, config.groupid);
                    } catch (e) {
                        console.log("Error:" + e);
                    }
                }, 1000 * i + 1);
                break;
            }
            default: break;
        }
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// To do
// Add function to redeem list of steam game keys
function reedeemKey(){
    const keys = fs.readFileSync('gamekeys.txt', 'utf-8');
    console.log(keys);
}