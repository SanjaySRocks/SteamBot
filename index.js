const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
var sleep = require('sleep-promise');
var config = require('./configs.json');

var client = new SteamUser();

client.logOn({
	"accountName": config.username,
	"password": config.password
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
	console.log("[Steam Bot] Got web session");
});


client.on('friendsList', async function () {
    total_friends = Object.keys(client.myFriends).length
    console.log('[Steam Bot] Total Friends: ' + total_friends);
    
    /*
        Select Mode
        1 - Send Message
        2 - Send Group Invite
    */

    mode = 1;
    
    var msgTxt = `
    This is automated text
    kdsajkdas
    dsadsads
    `;


    count = 0;
    for (var key in client.myFriends) {
        if (client.myFriends.hasOwnProperty(key)) {
            count++;

            // Test send to friend
            if(key == "76561197989250411"){

            client.getPersonas([key], function (err, data) { 

            switch(mode)
            {
                // Send Message
                case 1: 
                    console.log("[Steam Bot] #"+count+"/"+total_friends+" Friend Name: "+data[key].player_name+" ID: "+key)
                    client.chatMessage(key, msgTxt);
                    break;
                // Send Group Invite
                case 2:
                    console.log("[Steam Bot] Sending Group Invite")
                    console.log("[Steam Bot] #"+count+" Friend Name: "+data[key].player_name+" ID: "+key)
                    client.inviteToGroup(key, config.groupid);
                    break;
            }

            });

            // Delay of 2 sec minimum
            await sleep(2000);

        }

        }
    }
});


client.on('friendMessage', function (steamID, message) {
    console.log("Friend message from " + steamID.getSteam3RenderedID() + ": " + message);
});