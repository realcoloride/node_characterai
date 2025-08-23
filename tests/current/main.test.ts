import { CharacterAI } from "../../src";

const characterAI = new CharacterAI()
const { default: chalk } = require('chalk');


async function StartNewConversation() {

    const client = await UseAuth()
    const character1 = await client.fetchCharacter("xnSbLWXop06fpWEKz-VKImTjIgQw3-PiRGmqfoziFFA") // Chino kafuu

    // Create DM
    const dm1 = await character1.createDM(true)
    console.log(`[${chalk.blue(character1.name)}] chatId: ${chalk.green(dm1.chatId)}\n\n${character1?.greeting}`)
    // You can continue any existing session by providing the chatId and characterId
    // check the examples bellow!
}

async function ContinueChatSessionAsync() {
    const client = await UseAuth()

    const character1 = await client.fetchCharacter("xnSbLWXop06fpWEKz-VKImTjIgQw3-PiRGmqfoziFFA") // Chino kafuu

    // Open DM
    const dm1 = await character1.DM('7120fb28-6552-44b8-ac37-3b5329ed367e')

    const send1 = await dm1.sendMessage('nikah yuk >.<')

    console.log(chalk.blue(`\n[${character1.name}]`), chalk.green(send1.content));

}

async function ContinueChatSessionStreamSync() {
    const client = await UseAuth()

    const character1 = await client.fetchCharacter("xnSbLWXop06fpWEKz-VKImTjIgQw3-PiRGmqfoziFFA") // Chino kafuu

    // Create DM
    const dm1 = await character1.DM('7120fb28-6552-44b8-ac37-3b5329ed367e')
    
    // Register event emiter, this will capture the response of .sendMessage that uses { streameMessage: true }
    dm1.on('message:delta',(full: string, delta: string) => {

    // 'full' is the accumulation of character messages, and delta is fragment of words (not always)
    console.log(chalk.blue(`[${character1.name}]`), chalk.green(full));
    // This should be print lines like this
    // [Chino Kafuu] \*She looks around in embarrassment and clears her throat, looking back at you\*
    // [Chino Kafuu] \*She looks around in embarrassment and clears her throat, looking back at you\* 
    //  Uh.. a-Are you.... p-proposing to me?
    })


    // never use await if you wish to handle streamMessage 
    const send1 = dm1.sendMessage('aloooowww >.<',
          {
            streamMessage: true // THIS, will be exposes the message to ev emit
          }
    )
    const send2 = dm1.sendMessage('nikah yuk >.< ', 
        {
            streamMessage: true
        }
    )

    // lets see the characters final message
    const res1 = await send1
    const res2 = await send2

    console.log(chalk.blue(`\n\n[${character1.name}]`), chalk.green(res1.content));
    console.log(chalk.blue(`[${character1.name}]`), chalk.green(res2.content));

}

let ready = false;


async function UseAuth() {
    if (ready) return characterAI;

    const token =
      process.env.CAI_ACCESS_TOKEN ||
      process.env.CAI_TOKEN ||
      process.env.CAI_APIKEY ||
      process.env.CAI_SESSION_TOKEN;

    if (!token) {
      console.log(chalk.red("Please run this test by set CAI_ACCESS_TOKEN on environtment."))
      process.exit()
    }

    let auth

    try{
    auth = await characterAI.authenticate(token)
    ready = true

    } catch {
      ready = false
      throw Error()
    }
  
    return auth;
}



StartNewConversation()
// ContinueChatSessionAsync()
// ContinueChatSessionStreamSync()

