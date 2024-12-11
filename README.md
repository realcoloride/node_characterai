# Character AI Node JS Client

<a href="character.ai"><img src="https://github.com/user-attachments/assets/61536b0a-3c93-4001-891f-f01dba68f553" aria-label="character.ai"></a>
###### _The logo was recolored to be visible on both Dark and Light environments._

Unofficial Node.js client for [Character AI API](https://character.ai/), an awesome website which brings characters to life with AI!

## Table of contents

soon

## Intro

`node_characterai` is an unopiniated TypeScript wrapper for Character.AI, which aims to give life to characters using AI!

**Preface:**

This package is a completely reworked and revamped version of the `1.x` version series, that used (now considered old) endpoints and were actively worked and maintained on from 2023 to 2024 until the CharacterAI team has completely deprecated the endpoints and websites on September 10th, 2024.

The old version has stayed a long time and still currently works partly to this day but is at risk of deprecation and uses old features that are not available anymore and or does not fully utilize all the new features the new endpoint and website has to offer and utilized features like Puppeteer to get around some restrictions.

This new version has been rewritten in mind to be as developer-friendly as possible, and with type safety in mind; a [long requested feature](https://github.com/realcoloride/node_characterai/issues/102).

**Old intro: (1.x)**

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

## Using an Access Token

---
>[!WARNING]
> ⚠️ **HUGE** WARNING: **DO NOT** share your session token to anyone you do not trust or if you do not know what you're doing.
>
> _Anyone with your session token could have access to your account without your consent. **Do this at your own risk and responsability.**_
---

You have two ways of getting your access token. One via network inspection and the other by local storage.

To get it, you can open your browser, go to the [Character.AI website](https://character.ai) in `localStorage`.

1. Open the Character.AI website in your browser on the front page.
2. Open the developer tools (<kbd>F12</kbd>, <kbd>Ctrl+Shift+I</kbd>, or <kbd>Cmd+J</kbd>).
3. Go to the `Application` tab.
4. Go to the `Storage` section and click on `Local Storage`.
5. Look for the `HTTP_AUTHORIZATION` key.
6. Open the object, right click on value and copy your access token.

![Instructions](https://github.com/user-attachments/assets/98e64019-dc8a-4340-b386-51a8f8636954)

> [!TIP]
> Sometimes the `HTTP_AUTHORIZATION` key doesn't show up directly. Try refreshing the page until you see it.

### Authenticating

Authentication refers to logging in to an account to use the client. Back in beta, Character.AI had a guest login feature, which was deprecated in favor of using accounts. <kbd>F</kbd>.

Basic authentication usage:
```typescript

const characterAI = new CharacterAI();
characterAI.authenticate("Token [INSERT ACCESS TOKEN]").then(async() => {
   console.log("Logged in");
   // start coding in here!
});

```

> [!TIP]
> **Please avoid putting your access token in your code.** You are unintentionally giving access to your account if you share code with your access token in it. Instead use something like `process.env.` and `.env` files. [Click here to see a comprehensive tutorial and documentaton](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs).

## Finding your character's ID

## Finding your conversation's ID

## Calling characters

Calling characters is a pretty awesome feature Character.AI incorporates. Luckily, `node_characterai` also has support for calling characters at your ease with flexibility in mind.

### Finding voices, or setting a default one

Voices are an essential part in the calling feature. By default, if you have set a default voice on a character via the app or website, the package will try to automatically set that. But when calling, you can choose to specify a specific query or voice.

Here is some basic code to do that:

```typescript
// fetch your voices
const myVoices = await characterAI.fetchMyVoices();

// or search for one
const potentialVoices = await characterAI.searchCharacterVoices("Character");

// or even get the system ones
const systemVoices = await characterAI.fetchSystemVoices();

// or fetch a specific one with its id
const specificVoice = await characterAI.fetchVoice(voiceId);

// or, set a voice override for a specific character
await character.setVoiceOverride(voice.id);
```

Once you have settled on the voice you wish to use, scroll down to learn how to initiate a call, and set the voice id, or search for a specific query.

### Creating or editing a voice

Like we've seen before, we have learned to fetch and look for voices, but the package allows you to also edit and create voices, like you would on the app or website.

Creating a voice usage using an `.mp3` file:

```typescript
const fileContent = fs.readFileSync('./voice.mp3');
const blob = new File([fileContent], 'input.mp3', { type: 'audio/mpeg' });    

const voice = await characterAI.myProfile.createVoice("voice name", "description", true, "this is a preview text", blob, VoiceGender.Neutral);
```

Editing voices usage:

```typescript
// edit the voice (see options)
await voice.edit();

// delete the voice
await voice.delete();
```

### Getting your audio devices

Using the audio interface (`AudioInterface` class), you can get the microphone/input devices and speaker/output devices information according to your platform and change the `sox` path.

Basic usage:
```typescript
// get all audio devices
const allDevices = AudioInterface.getAllDevices();

// get microphones or speakers
const microphones = AudioInterface.getMicrophones();
const speakers = AudioInterface.getSpeakers();

// find them by their ID or name
const microphoneById = AudioInterface.getMicrophoneFromId(2);
const microphoneByName = AudioInterface.getMicrophoneFromName('USB Microphone');

// same for speakers
const speakerById = AudioInterface.getSpeakerFromId(1);
const speakerByName = AudioInterface.getSpeakerFromName('Bluetooth Speakers');

// and optionally, if you need, you can set a custom sox path.
// is `null` by default.
AudioInterface.soxPath = '/custom/path/to/sox';
```

### Installing sox

Most of the audio features are handled natively using [`naudiodon`](https://github.com/Streampunk/naudiodon), a node implementation of [`PortAudio`](https://www.portaudio.com/). I highly recommnd you check their package out. Some functions like `playFile()`, use **So**und e**X**change _(or `sox` for short)_ to handle playback, which should work on most platforms.

Here are the instructions to installing them depending on your platform:

### Windows

1. **Download SoX**:
   - Visit the official SoX SourceForge page: http://sox.sourceforge.net/
   - Download the latest Windows binary release

2. **Installation**:
   - Extract the downloaded ZIP file
   - Add the sox folder to your PATH, or in your project folder.
    
> [!TIP]
> If you do not know how to add something to your PATH and you do not wish your project directory, [this YouTube tutorial](https://www.youtube.com/watch?v=pGRw1bgb1gU) shows how to do it easily. Put the path as where you installed sox.

3. **Verify Installation**:
   ```powershell
   sox --version
   ```

**Note**: 32-bit and 64-bit x86 architectures are supported. Windows ARM is not currently supported, but potential alternatives like WSL or `ffmpeg` work.

### macOS

1. **Using Homebrew** (Recommended):
   ```bash
   brew install sox
   ```

2. **Using MacPorts**:
   ```bash
   sudo port install sox
   ```

3. **Verify Installation**:
   ```bash
   sox --version
   ```

### Linux

1. **Ubuntu/Debian**:
   ```bash
   sudo apt-get update
   sudo apt-get install sox libsox-fmt-all
   ```

2. **Fedora**:
   ```bash
   sudo dnf install sox sox-plugins-freeworld
   ```

3. **Arch Linux**:
   ```bash
   sudo pacman -S sox
   ```

4. **Verify Installation**:
   ```bash
   sox --version
   ```
   
### Basic call usage

In the following example, we will call a character using our microphone device as input, and speakers as output.

>[!WARNING]
> You can only call 1 character on the same account at a time. Trying to call somewhere else while this is running will cause the call to interrupt and disconnect.

```typescript
// create a dm if you have not already
const dm = await character.DM(characterId);

// create a call session
const call = await dm.call({
    // protip: use 'default' to get the default microphone. or else, you can look above to get the device id or name of your choice.
    microphoneDevice: 'default', 
    speakerDevice: 'default',

    // you can use voiceId to specify a specific voice
    voiceId: "id"

    // or use a specific query
    // voiceQuery: "voice name"
});
```

You can also use `voiceId` to specify a specific voice, or use `voiceQuery` to automatically look for one if none can be found. **Note that you cannot use both arguments at the same time.**

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

The `inputStream` awaits for any real time audio that will be encoded as livekit frames. This means YOU need to stream your own PCM data according to the format and pipe it through the stream.
Alternatively, `playFile()` allows you to play a file and stream it with `sox`.

#### Custom output

The `outputStream` gets to the same format raw PCM data out. No extra decoding is required, but if you wish to save or modify the data, you will have to use a tool like `ffmpeg` or `sox`.

## Manipulating images

Manipulating images has became much more straightforward and easier. 

### Introduction

Images are now stored as instances called `CAIImage`. They store a local instance of the image and allow you to manipulate the image, generate a new image, and upload the image to CharacterAI's servers.

They work on a STORED cache basis, meaning that the changes are stored locally until published.

### Usage

Example of basic usage with editing the avatar
```typescript
// getting the avatar CAIImage instance
const avatar = characterAI.myProfile.avatar;

// printing the fullURL to CAI's servers
console.log(avatar.fullUrl);

// changing the file to a local one for example
avatar.changeToFilePath("./avatar.png");

// or better yet, change to a prompt
await avatar.changeToPrompt("Cool cat with sunglasses");

// there are more, like for example:
// changeToBlobOrFile() - changes to a File instance or Blob instance
// changeToUrl() - downloads an image and changes to it
// changeToBuffer() - changes to a buffer
// etc...

// use this if you want to restore the image from the servers
await image.reloadImage();
```

### Image manipulation

The images, like said before are stored locally and store a `Sharp` image instance for you to have fun and edit the actual image, or save it in your hard drive, and more.

```typescript
const image = await avatar.getSharpImage();

// example of modifications, and making it a png file to save it to the hard drive.
image.rotate(90).png().toFile('./image.png');
```

To read more about `Sharp` and its documentation, [click here](https://sharp.pixelplumbing.com/api-constructor).

### Uploading changes

Like I said previously, the changes ARE NOT automatically published and saved. They're cached in the memory until you decide to upload and publish your changes.

**Uploading** will upload the image to the CharacterAI servers while **Publishing** will apply the image to the avatar you're editing for example.

This can be useful if you mess up the image for example and you wish to have full control of the pipeline.

```typescript
// UPLOAD changes first
await avatar.uploadChanges();

// APPLY the changes to the profile.
await characterAI.myProfile.edit({ editAvatar: true });
```

The `edit()` publishing logic applies to other classes where images are involved like the `Character` class.

## Personas

Personas are a unique and cool way to change how you will interact with the character. Character AI provides you on the website and app a way to change, edit your personas, and set the default one. The package allows you to do that too.

Creating or fetching a persona usage:

```typescript
// creating one
const persona = characterAI.myProfile.createPersona("persona name", "definition", true);

// or fetching the ones we made
const myPersonas = await characterAI.myProfile.fetchPersonas();

// or fetching one if you know the id
const persona = await characterAI.myProfile.fetchPersona(personaId);

// or get the default one
const defaultPersona = await characterAI.myProfile.getDefaultPersona();

// or getting the persona override of a character
const characterPersona = await character.getPersonaOverride();
```

Persona management usage:
```typescript
// makes persona the default one
await persona.makeDefault();

// editing the persona (see options)
await persona.edit();

// removing the persona
await persona.remove();

// setting a character's persona (via instance or id)
await character.setPersonaOverride(persona);
await character.setPersonaOverride(personaId);
```

## Character management

Like personas or voices, characters can be managed, too.

### Looking for characters

### Looking for someone's characters

### Managing your own

### Creating, editing or deleting characters

## Group chats

Group chats is a feature that is currently put on hold while I work on it. Please come back later!

## Troubleshooting

## Disclaimer

##### ❤️ This project is updated frequently, **always check for the latest version for new features or bug fixes**.

🚀 If you have an issue or idea, let me know in the [**Issues**](https://github.com/realcoloride/node_characterai/issues) section.

📜 If you use this package, you also bound to the terms of usage of their website.

☕ **Want to support me?** You can send me a coffee on ko.fi: https://ko-fi.com/coloride.

###### © *(real)Coloride - 2023-2024, Licensed MIT.*
