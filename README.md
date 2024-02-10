## Prerequisites

NodeJS v20


## Installing and Building:

- Run `npm install` to install dependencies
- Run `npm build` to build the project
- Create an `.env` file with the required parameters
- Run `npm i -g pm2` to install pm2 globally
- Run `pm2 start build/index.js` to start the bot
- Run `pm2 save` to save pm2 config
- Run `pm2 startup` to make pm2 autostart on boot

## Setup

- Navigate to `http://<server_url>/auth`
- Once authed the bot will start logging structure updates