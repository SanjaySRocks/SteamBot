const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const sleep = require('sleep-promise');
const config = require('./configs.json');
const colors = require('colors');
const fs = require('fs')
const axios = require('axios')


var client = new SteamUser();
var community = new SteamCommunity();
var SteamID = SteamCommunity.SteamID;

var ad_file;
var friends = [];

fs.readFile("ad.txt", 'utf8', function(err, data) {
    if (err)
        return console.log(err);

    ad_file = data;
});


client.logOn({
	accountName: config.username,
	password: config.password,
    rememberPassword: true,
    autoRelogin: true
});

client.on('loggedOn', function(details) {
	console.log("[Steam Bot] Logged into Steam as " + client.steamID.getSteam3RenderedID());
	client.setPersona(SteamUser.EPersonaState.Invisible);

    // Games to idle 
	client.gamesPlayed(config.games);
});

client.on('error', function(e) {
	console.log("Error: "+e);
});

client.on('webSession', function(sessionID, cookies) {
	// console.log("[Steam Bot] Got web session");
});

client.on('friendsList', function () {
    
    friends = Object.keys(client.myFriends).filter(steamId => client.myFriends[steamId] == SteamUser.EFriendRelationship.Friend);

    console.log('All Friends: ' + friends.length);

    // execSend(friend_mode=2, game_id=730, mode=2);
    checkVacID(removeFriend=true);

});

// Thanks Snabe for this code.
client.on('friendRelationship', (steamID, relationship) => {
    switch(relationship) {
        case 2:
            console.log(`[Steam Bot] ${client.steamID.getSteamID64()} received a friend request from user ${steamID}.`);
        
            client.addFriend(steamID, (err) => {
                if(err) {
                    console.log(`Error adding user ${steamID}.`);
                } else {
                    client.getPersonas([steamID], (err, personas) => {
                        var persona = personas[steamID.getSteamID64()];
                        var name = persona ? persona.player_name : ("[" + steamID.getSteamID64() + "]");
                        client.chatMessage(steamID, `Greetings ${name}! thanks for adding me :')`);
                    });
                    console.log(`[Steam Bot] ${client.steamID.getSteamID64()} accepted user ${steamID}'s friend request.`);
                }
            });
            break;
        //The bot is now friends with another Steam user
        case 3:
            //Invite that user to our Steam group
            client.inviteToGroup(steamID, config.groupid);
        
            console.log(`[Steam Bot] ${client.steamID.getSteamID64()} invited user ${steamID} to our Steam group.`);
            break;
        default:
            break;
    }
});


client.on('friendMessage', function (steamID, message) {
    console.log("Friend message from " + steamID.getSteam3RenderedID() + ": " + message);
    if(message.toLowerCase() == "!hi")
    {
        client.chatMessage(steamID, "hi boi this is auto reply bot. :steamhappy:")
    }
    if(message.toLowerCase() == "!friends")
    {
        client.chatMessage(steamID, `Total Friends: ${friends.length}`)
    }
});

async function checkVacID(removeFriend=false) {
    console.log('Vac Remove Friend: ', removeFriend ? 'Enabled' : 'Disabled')
    friend_list = friends;
    vac_friends = []
    const promises = friends.map(key => axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${config['apikey']}&steamids=${key}`))
    try {

        const res = await Promise.all(promises)

        const vac_friends = res.map(r => r.data).filter(r => r.players[0]['VACBanned'] == true).map(r => r.players[0])

        if(vac_friends.length > 0){
            
            console.log(`No. of friend found vac: ${vac_friends.length}`)

            const profile = vac_friends.map((key) => axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config['apikey']}&steamids=${key.SteamId}`))

            const res_profile = await Promise.all(profile)

        
            const data = res_profile.map(r => r.data.response.players[0])
            const merged_data = vac_friends.map(v => {
                const d = data.find(r => r['steamid'] === v.SteamId);
                return {...v,...d}     
            });
        
            merged_data.map((key) => {
                console.log(`SteamID: ${key.SteamId} Name: ${key.personaname} Days: ${key.DaysSinceLastBan}`)
                if(removeFriend == true){
                    client.removeFriend(key.SteamId);
                    console.log(`Removed ${key.personaname} from friend list`);
                }
            });
        }else{
            console.log('Good news no vac profiles in your friend list')
        }

    } catch (error) {
        console.log(error);
    }
}

async function execSend(friend_mode = 3, game_id=730, mode = 2 ){
    
    // Friend Mode:-
    // 1. all friends 
    // 2. select friends who playing game (default)
    // 3. debug developer use only (not to be used)

    // Mode:-
    // 1. Send Message
    // 2. Send Group Invite (default)
    if(friend_mode == 1){
        friend_list = friends;
        console.log(`Friend Mode: All Friends`)
    }
    else if(friend_mode == 2)
    {
        console.log(`Friend Mode: Game Friends | GameID: ${game_id}`)

        async function getAllFriendsGames(){
            var game_selected_friends = [];
            console.log(friends, game_id);
            client.requestRichPresence(game_id, friends, function(err, response){
                if(err)
                    return console.log(err);
                console.log(response)
                game_selected_friends = Object.keys(response.users)
            });
            await sleep(2000);
            console.log(game_selected_friends);
            return game_selected_friends;
        }

        friend_list = await getAllFriendsGames();
    }
    else if(friend_mode == 3)
    {
        friend_list = ['76561197962029809'];
    }

    const total_friends = friend_list.length
    console.log('[Steam Bot] Selected Total Friends: ' + total_friends);
    

    if(friend_list.length > 0){
        friend_list.forEach(function(key, index){     
            client.getPersonas([key], function (err, data) {
                var friend = {
                    name: data[key].player_name ? data[key].player_name : "",
                    id: key
                }
                
                msgTxt = ad_file.replace("$name", friend.name);
                msgTxt = msgTxt.replace("$steamid", friend.id);

                switch(mode)
                {
                    case 1:
                        setTimeout(() =>{
                            console.log(`[Steam Bot] #${index+1}/${total_friends} Friend Name: ${friend.name} ID: ${friend.id}`)
                            client.chatMessage(key, msgTxt);
                        }, 2000 * (index + 1), index)
                        break;

                    case 2:
                        console.log("[Steam Bot] Sending Group Invite")
                        console.log(`[Steam Bot] #${index+1}/${total_friends} Friend Name: ${friend.name} ID: ${friend.id}`)
                        client.inviteToGroup(key, config.groupid);
                        break;

                    default: break;
                }
            })
        });
    }
}