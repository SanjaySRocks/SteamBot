
# SteamBot

Steam bot written in nodejs using steam-user module.

Status: UNDER DEVELOPMENT

It supports:-
* Game Hour boosting (Unlimited games can be added)
* Send Message to all steam friends.
* Send Group Invite to all steam friends.
* Auto Friend Request Accept
* Auto Send Group Invite on becoming friends.
* Remove vac ids from your friend list

## Changelogs:-
1.1 Improved API calls (reduced calls)
1.2 Fetch details once, store locally and use it  (friends_details, vacbans, friend_ids)
1.3 Removed unnecessary api calls to fetch user info
1.4 Added regex match and replace for ads file to update name in chat message
1.5 created data folder to store user data
1.6 Fixed async/promises
1.7 removed extra codes and unused modules 
1.8 Updated api functions to latest
1.9 Improved VacCheck function
2.0 To Do redeem keys 

## Bugs:-
No bug found

## Deployment

Set config.json file before running this app.

To deploy this project run

```bash
  npm install
```

To run this app
```bash
  node .
```


## Authors

- [@sanjaysrocks](https://www.github.com/sanjaysrocks)


## Contributing

Contributions are always welcome! Feel free to update this bot.

