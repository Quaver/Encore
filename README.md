# Encore
📺 Encore is a [Twitch](https://twitch.tv) bot that handles viewer song requests for [Quaver](https://github.com/Quaver/Quaver).

Song requests are a handy feature within Quaver. It allows both Twitch viewers and in-game spectators to requests songs for the host to play.

Encore is the bot that specifically handles Twitch requests and pipes them through to Albatross, our real-time game server, to alert online users when new requests are coming in.

Additionally, it handles linking and unlinking user Twitch accounts to Quaver accounts.

## Setting Up In-Game

To start receiving song requests on your Twitch channel, you must first connect your Twitch account to your Quaver account in-game. 

You can do so by pressing F9 and going to the song requests tab. Once connected, viewers will immediately be able to start sending requests.

## Requirements

* Node.js w/ a TypeScript compiler
* MySQL
* Redis
* osu! API Key (Optional)

## License
The code in this repository is released and licensed under the [Mozilla Public License 2.0](). Please see the [LICENSE]() file for more information. In short, if you are making any modifications to this software, you **must** disclose the source code of the modified version of the file(s), and include the original copyright notice.
