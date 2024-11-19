# Character AI Unofficial Node API

< add characterai image here >

> Node.js client for the unofficial [Character AI API](https://character.ai/), an awesome website which brings characters to life with AI!

## Intro

`node_characterai` is an unopiniated TypeScript wrapper for Character.AI, which aims to give life to characters using AI!

**Preface:**

This package is a completely reworked and revamped version of the `1.0+` `node_characterai` version series, that used old endpoints and were worked on from 2023 to 2024 until the CharacterAI team has completely deprecated the endpoints and websites on September 10th, 2024.

The old version has stayed a long time and still currently works partly to this day but is at risk of deprecation and uses old features that are not available anymore and or does not fully utilize all the new features the new endpoint and website has to offer and utilized features like Puppeteer to get around some restrictions.

This new version has been rewritten in mind to be as developer-friendly as possible, and with type safety in mind; a [long requested feature](https://github.com/realcoloride/node_characterai/issues/102).

**Old intro:**

This repository is inspired by [RichardDorian's unofficial node API](https://github.com/RichardDorian/node-character.ai/).
Though, I found it hard to use and it was not really stable and archived. So I remade it in javascript.

**This project is not affiliated with Character AI in any way! It is a community project.**
The purpose of this project is to bring and build projects powered by Character AI.

If you like this project, please check their [website](https://character.ai/).

## Features

* ✅ Fully written in TypeScript with type safety in mind
* ⌚ Fully asynchronous requests
* 🧸 Easy and developer-friendly to use
* 📨 DM characters, fetch information, create, edit, delete conversations
* 📒 Huge list of features you can use and interact with like on the app or website
* 🎤 Call characters and utilize the TTS and SST features
* 🧜 Create, edit voices or characters with a few lines of code
* 🔍 Be able to switch message candidates, submit annotations and manipulate messages
* 🖼️ Built in image manipulation
* 👥 ~~Group chat support~~ (Soon)
* 🔁 Active development

## Table of contents

soon

## Installation

```bash
npm install node_characterai
```

## How to use

### Importing the package

Typescript:
```
soon
```

Javascript:
```
soon
```

### Authentication

## Using an Access Token

## Finding your character's ID

## Finding your conversation's ID

## Calling characters

Calling characters is a pretty awesome feature Character.AI incorporates. Luckily, `node_characterai` also has support for calling characters at your ease with flexibility in mind.

### Installing FFmpeg and FFplay

In order to properly work and process audio in real time, `node_characterai` uses `ffmpeg`, and for optional playback `ffplay`. Installing `ffmpeg` is required to be able to call with the package.

#### Installing FFmpeg

TODO

#### Installing FFplay (optional, for speaker playback)

TODO

### Basic call usage

In the following example, we will call a character using our microphone device as input, and speakers as output.

```typescript
// create a dm if you have not already
const dm = await character.DM(characterId);

// create a call session
const call = await dm.call({
    microphoneDevice: 'default', // use 'default' to get the default microphone or else specify the device name manually.
    useSpeakerForPlayback: true
});
```

This alone should be enough to let you talk to the character without any extra setup.

### Call events

The call allows you to subscribe to a few events in order to track what you are saying when the character starts and stops talking.

```typescript
call.on('userSpeechProgress', candidate => console.log("User speech candidate:", candidate));
call.on('userSpeechEnded', candidate => console.log("User ended speech candidate:", candidate));

call.on('characterBeganSpeaking', () => console.log("Character started speaking"));
call.on('characterEndedSpeaking', () => console.log("Character ended speaking"));
```

### Other call features

There are also other misc. calling features that allow you to spice up and have more control over the conversation. Mainly:

```typescript
// interrupting a character when they're speaking
if (call.canInterruptCharacter)
    await call.interruptCharacter();

// muting yourself
call.mute = true;

// knowing if the character is speaking
if (call.isCharacterSpeaking) 
    console.log("The character is currently speaking");

// hanging up after you're done
await call.hangUp();
```

> [!WARNING]
> Leaving no data or input for a prolonged amount of time will result in the character disconnecting from the call. Make sure to use empty data if required to avoid the call from hanging up.

### Advanced calling features

Previously, we have seen how to use a basic barebones and batteries-included way of calling characters with the package, but if we want to have more flexibility with our own voice input and voice output, here is how to proceed.

A set of streams (`inputStream` and `outputStream`) included in the call class allow you to send information or receive.

> [!IMPORTANT]
> The recommended input format AND the output format is 16-bit Mono PCM at 48000Hz. 

#### Custom input

The `inputStream` awaits for any real time audio part and `ffmpeg` should automatically convert the input into the recommended format, it is important to note that `ffmpeg` can become resource intensive if imporperly used and or resources are wasted.

Code example with streaming the contents of an audio file:

```typescript
const call = await dm.call({
    microphoneDevice: false, // disable automatic microphone input
    useSpeakerForPlayback: true
});


```

todo
#### Custom output


```typescript

```

## Manipulating images

## Group chats

## Troubleshooting

## Disclaimer

##### ❤️ This project is updated frequently, **always check for the latest version for new features or bug fixes**.

🚀 If you have an issue or idea, let me know in the [**Issues**](https://github.com/realcoloride/node_characterai/issues) section.

📜 If you use this package, you also bound to the terms of usage of their website.

☕ **Want to support me?** You can send me a coffee on ko.fi: https://ko-fi.com/coloride.

###### © *(real)Coloride - 2023-2024, Licensed MIT.*