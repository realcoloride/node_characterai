# Character AI Unofficial Node API

> Node.js client for the unofficial [Character AI API](https://character.ai/), an awesome website which brings characters to life with AI!

## Intro

This repository is inspired by [RichardDorian's unofficial node API](https://github.com/RichardDorian/node-character.ai/).
Though, I found it hard to use and it was not really stable and archived. So I remade it in javascript.

**This project is not affiliated with Character AI in any way! It is a community project.**
The purpose of this project is to bring and build projects powered by Character AI.

If you like this project, please check their [website](https://character.ai/).

## Features

* 👍 Fully written in Javascript and CommonJS (for max compatibility and ease of use)
* ⌚ Asynchronous requests
* 🗣️ Use conversations or use the API to fetch information
* 🧸 Easy to use
* 🔁 Active development
* 👤 Guest & token login support

## Installation

```bash
npm install node_characterai
```

## Usage

Basic guest login and conversation message:
```js
const CharacterAI = require('node_characterai');
const characterAI = new CharacterAI();

(async() => {
    await characterAI.authenticateAsGuest();

    const characterId = "8_1NyR8w1dOXmI1uWaieQcd147hecbdIK7CeEAIrdJw" // Discord moderator

    const chat = await characterAI.createOrContinueChat(characterId);
    const response = await chat.sendAndAwaitResponse('Hello discord mod!', true)

    console.log(response);
    // use response.text to use it in a string.
})();
```

## Using an Access Token

Some parts of the API, like managing a conversation requires for you to be logged in using an `accessToken`.
To get it, you can open your browser, go to the [character.ai website](https://character.ai) in `localStorage`.

To do so:
1. Open the Character AI website in your browser
2. Open the developer tools `F12` and go to the `Application` tab.
3. Go to the `Storage` section and click on `Local Storage`.
4. Look for the `@@auth0spajs@@::dyD3gE281MqgISG7FuIXYhL2WEknqZzv::https://auth0.character.ai/::openid profile email offline_access` key.
5. Open the body and copy the access token.

![Access_Token](https://i.imgur.com/09Q9mLe.png)

When using the package, you can:
* Login as guest using `authenticateAsGuest()` - *for mass usage or testing purposes*
* Login with your account or a token using `authenticateWithToken()`

## Finding the Character ID

You can find your character ID in the URL of a Character's chat page.
For example, if you go to the chat page of the character `Test Character` you will see the URL `https://character.ai/chat/chat?char=5f7f9b9b9b9b9b9b9b9b9b9b`.

The last part of the URL is the character ID:
![Character_ID](https://i.imgur.com/nd86fN4.png)

## Image Interactions
### WARNING: This part is currently experimental, if you encounter any problem, open an [**Issue**](https://github.com/realcoloride/node_characterai/issues).

🖼️ Character AI has the ability to generate and interpret images in a conversation. Some characters base this concept into special characters, or maybe use it for recognizing images, or to interact with a character and give it more details on something: *the possibilities are endless*.

💁 Most of the Character AI image features can be used like so:

```js
// Most of these functions will return you an URL.

await chat.generateImage("dolphins swimming in green water")

await chat.uploadImageFromLink("https://www.example.com/image.jpg")
// This is required if you want to use images from other websites

await chat.uploadImageFromPath(path.join(__dirname, './cat.jpg'))

await chat.sendAndAwaitResponse({text:"What is in this image?", image_rel_path:${imageUrl}}, true)
// Including the image relative path is necessary to upload an image.
```
*Props to @creepycats for implementing most of this stuff out*

## Troubleshooting

|**Problem**|Answer|
|-------|------|
|❌ **Token was invalid**|Make sure your token is actually valid and you copied your entire token (its pretty long).|
|😮 **Why are chromium processes opening?**|This is because as of currently, the simple fetching is broken and I use puppeteer (a chromium browser control library) to go around cloudflare's restrictions.|
|👥 **`authenticateAsGuest()` doesn't work**|See issue [#14](https://github.com/realcoloride/node_characterai/issues/14).|
|🦒 **Hit the max amount of messages?**|Sadly, guest accounts only have a limited amount of messages before they get limited and forced to login. See below for more info 👇|
|🪐 **How to use an account to mass use the library?**|You can use **conversations**, a feature introduced in `1.0.0`, to assign to users and channels. **To reproduce a conversation, use OOC (out of character) to make the AI think you're with multiple people.** __See an example here:__ ![chrome_RDbmXXtFNl](https://user-images.githubusercontent.com/108619637/224778145-284dd89e-7960-499c-b0f0-0deca419c578.png)![chrome_BgF8crPvqC](https://user-images.githubusercontent.com/108619637/224778153-c2a42a26-c5f7-4148-9644-34353482833e.png) (Disclaimer: on some characters, their personality will make them ignore any OOC request).|
|📣 **Is this official?**|No, this project is made by a fan of the website and is unofficial. *To support the developers, please check out [their website](https://beta.character.ai)*.|
|😲 **Did something awesome with `node_characterai`?**|Please let me know!|
|✉️ **Want to contact me?**|See my profile|
|💡 **Have an idea?**|Open an issue in the [**Issues**](https://github.com/realcoloride/node_characterai/issues) tab|
|➕ **Other issue?**|Open an issue in the [**Issues**](https://github.com/realcoloride/node_characterai/issues) tab|

## In-depth troubleshooting
#### **🤚 Before you scroll, please know that:**
* In the `Client` class, you can access the `Requester` class and define puppeteer or other variables related to how CharacterAI will work using `characterAI.requester.(property)`. *Also, anything here is subject to change, so make sure to update the package frequently.*

### 💳 About CharacterAI+
#### **"I am a member of cai+, how do I use it?"**

Change the property `.usePlus` from the requester and if needed, change `.forceWaitingRoom`.

### 🧭 About Puppeteer
Around a few months ago, the package only required the `node-fetch` module to run. The package was made using simple API requests. *However, over time, CharacterAI started fighting against scrapping and bots, which also made it almost impossible for anyone to use this package.*

**This is where in versions 1.1 and higher, puppeteer is used (which uses a browser) to make requests with the API.**

### ⚙️ How to change Puppeteer settings
 **👉 IMPORTANT: do the changes before you initialize your client!**

In the CharacterAI class, you can access the requester and define the `.puppeteerPath` variable or other arguments, and the properties include *(and are subject to change in future versions)*:
```js
puppeteerPath, // Chromium executables path
puppeteerLaunchArgs, // Browser launch arguments
puppeteerNoDefaultTimeout, // Toggle default timeout
puppeteerProtocolTimeout // Change the protocol timeout
```
💡 I recommend that you **frequently** update this package for bug fixes and new additions.


## Disclaimer
##### ❤️ This project is updated frequently, **always check for the latest version for new features or bug fixes**.

🚀 If you have an issue or idea, let me know in the [**Issues**](https://github.com/realcoloride/node_characterai/issues) tab.
📜 If you use this API, you also bound to the terms of usage of their website.

*(real)coloride - 2023, Licensed MIT.*
