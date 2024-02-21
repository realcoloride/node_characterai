const { Reply, Message, MessageHistory, OutgoingMessage } = require("./message");
const Parser = require("./parser");
const jimp = require("jimp");

class Chat {
    constructor(client, characterId, continueBody) {
        this.characterId = characterId;
        this.externalId = continueBody.external_id;

        this.client = client;

        const ai = continueBody.participants.find((participant) => participant.is_human === false);
        this.aiId = ai.user.username;
        this.requester = client.requester;
    }

    async fetchHistory(pageNumber) {
        if (!this.client.isAuthenticated()) throw Error("You must be authenticated to do this.");

        // Page number is optional but must be a number
        if (pageNumber != null && typeof(pageNumber) != "number")
            throw Error("Invalid arguments");

        const client = this.client;
        const pageQuery = pageNumber ? `&page_num=${pageNumber}` : ""

        const request = await this.requester.request(`https://beta.character.ai/chat/history/msgs/user/?history_external_id=${this.externalId}${pageQuery}`, {
            headers: client.getHeaders()
        });

        if (request.status() === 200) {
            const response = await Parser.parseJSON(request);
            const historyMessages = response.messages;
            const messages = [];

            for (let i = 0; i < historyMessages.length; i++) {
                const message = historyMessages[i];

                messages.push(new Message(this, message));
            }

            const hasMore = response.has_more;
            const nextPage = response.next_page;
            return new MessageHistory(this, messages, hasMore, nextPage);
        } else Error("Could not fetch the chat history.")
    }
    async sendAndAwaitResponse(optionsOrMessage, singleReply) {
        if (!this.client.isAuthenticated()) throw Error("You must be authenticated to do this.");

        const payload = new OutgoingMessage(this, optionsOrMessage)
        const client = this.client;

        if (!client.isAuthenticated()) throw Error("You must be authenticated to do this.");

        const request = await this.requester.request("https://beta.character.ai/chat/streaming/", {
            body:Parser.stringify(payload),
            method:"POST",
            headers:client.getHeaders(),
            client:this.client
        }, true)

        if (request.status() === 200) {
            const response = await Parser.parseJSON(request);
            const replies = response.replies;

            const messages = []

            for (let i = 0; i < replies.length; i++) {
                messages.push(new Reply(this, response));
            }
            
            if (!singleReply) return messages;
            else return messages.pop();
        } else throw Error("Failed sending message.")
    }
    
    // Image generation & uploading

    async uploadImage(content) {
        if (!this.client.isAuthenticated()) throw Error("You must be authenticated to do this.");
        
        /*
            Content Types:

            * Image URL
            * File Path
            * Buffer
            * ReadableStream
        */

        const image = await jimp.read(content);
        const mime = image.getMIME();
        const buffer = await image.getBase64Async(mime);

        if (!buffer) throw Error("Invalid content");
        
        const client = this.client;
        const request = await this.requester.uploadImage({
            method: "POST",
            headers: client.getHeaders(true),
            client: this.client,
            mime
        }, buffer);
        const response = await Parser.parseJSON(request);
        
        if (request.status() === 200 && response.status == "OK") {
            const relativePath = response.value;

            return `https://characterai.io/i/400/static/user/${relativePath}`;
        } else throw Error(`Failed uploading image: ${response.error || response.detail}`);
    }
    async generateImage(prompt) {
        if (!this.client.isAuthenticated()) throw Error("You must be authenticated to do this.");
        
        const client = this.client;

        if (!client.isAuthenticated()) throw Error("You must be authenticated to do this.");
        if (typeof prompt != "string") throw Error("Invalid arguments");

        const request = await this.requester.request("https://beta.character.ai/chat/generate-image/", {
            headers: client.getHeaders(),
            method: "POST",
            client: this.client,
            body: Parser.stringify({
              image_description: prompt
            })
        }, true);

        if (request.status() === 200) {
            const response = await Parser.parseJSON(request);
            return response.image_rel_path;
        } else throw Error("Failed generating image.");
    }

    // Conversations
    async changeToConversationId(conversationExternalId, force = false) {
        if (typeof(conversationExternalId) != "string" || typeof(force) != "boolean") throw Error("Invalid arguments");
        if (!this.client.isAuthenticated()) throw Error("You must be authenticated to do this.");

        // Force means that we dont check if the conversation exists, may lead to errors
        let passing = false;

        if (!force) {
            let conversations = await this.getSavedConversations();
            conversations = conversations.histories;

            for (let i = 0; i < conversations.length; i++) {
                const conversation = conversations[i];
                if (conversation.external_id == conversationExternalId) passing = true;
            }
        } else passing = true;
        
        if (passing) this.externalId = conversationExternalId;
        else Error("Could not switch to conversation, it either doesn't exist or is invalid.")
    }
    async getSavedConversations(amount = 50) {
        if (typeof(amount) != "number") throw Error("Invalid arguments");
        if (!this.client.isAuthenticated()) throw Error("You must be authenticated to do this.");

        const client = this.client;
        const request = await this.requester.request(`https://beta.character.ai/chat/character/histories/`, {
            headers:client.getHeaders(),
            method:"POST",
            body: Parser.stringify({
                "external_id" : this.characterId,
                "number" : amount
            })
        });

        if (request.status() === 200) {
            const response = await Parser.parseJSON(request)
            
            this.externalId = response.external_id;
            return response;
        } else throw Error("Failed saving & creating new chat.");
    }

    // Messages
    async getMessageById(messageId) {
        //if (typeof(messageId) != "string") throw Error("Invalid arguments - (Message ids are now strings)");
        messageId = messageId.toString();
        if (!this.client.isAuthenticated()) throw Error("You must be authenticated to do this.");

        const history = await this.fetchHistory();
        const historyMessages = history.messages;

        for (let i = 0; i < historyMessages.length; i++) {
            const message = historyMessages[i];
            
            if (message.id == messageId) return message;
        }

        return null;
    }
    async deleteMessage(messageId) {
        if (typeof(messageId) != "string") throw Error("Invalid arguments - (Message ids are now strings)");
        if (!this.client.isAuthenticated()) throw Error("You must be authenticated to do this.");
        if (this.client.isGuest()) throw Error("Guest accounts cannot delete messsages.");

        const client = this.client;
        const request = await this.requester.request(`https://beta.character.ai/chat/history/msgs/delete/`, {
            headers:client.getHeaders(),
            method:"POST",
            body: Parser.stringify({
                "history_id" : this.externalId,
                "uuids_to_delete" : [messageId],
                "regenerating" : false
            })
        });

        let passing = false;

        if (request.status() === 200) {
            const response = await Parser.parseJSON(request);
            
            if (response.status === "OK") passing = true;
        }

        if (!passing) throw Error("Failed to delete the message.");
    }
    async deleteMessages(messageIds) {
        if (!this.client.isAuthenticated()) throw Error("You must be authenticated to do this.");
        if (this.client.isGuest()) throw Error("Guest accounts cannot delete messsages.");

        const messagesToDelete = [];

        try {
            for (let i = 0; i < messageIds.length; i++) {
                const messageId = messageIds[i];

                if (typeof(messageId) != "string")
                    continue;

                messagesToDelete.push(messageId);
            }
        } catch (error) {
            throw Error("Failed to delete messages.");
        };

        const client = this.client;
        const request = await this.requester.request(`https://beta.character.ai/chat/history/msgs/delete/`, {
            headers:client.getHeaders(),
            method:"POST",
            body: Parser.stringify({
                "history_id" : this.externalId,
                "uuids_to_delete" : messagesToDelete,
                "regenerating" : false
            })
        });

        let passing = false;

        if (request.status() === 200) {
            const response = await Parser.parseJSON(request);
            
            if (response.status === "OK") passing = true;
        }

        if (!passing) throw Error("Failed to delete messages.");
    }

    // For info, descending means from end to begin (so last to first)
    async deleteMessagesBulk(amount = 50, descending = false, printSteps = false) {
        if (typeof(amount) != "number") throw Error("Invalid arguments");
        if (amount <= 0) throw Error("Amount must be higher than zero.");
        if (!this.client.isAuthenticated()) throw Error("You must be authenticated to do this.");
        if (this.client.isGuest()) throw Error("Guest accounts cannot bulk delete messsages.");

        let idsToDelete = [];
        let cumulatedHistory = [];

        // first we will fetch all the pages messages
        // each page has 20 messages
        const pagesToFetch = Math.floor(amount / 20);

        if (pagesToFetch >= 10) 
            console.warn("[node_characterai] Warning: deleting this much messages in bulk could take a while or get you rate limited, so make sure you know what you're doing. Also, you can set the argument printSteps to true to show debugging steps.");

        let nextPage = null;
        // keep going until it doesnt have more pages
        for (let i = 0; i < pagesToFetch; i++) {
            const thisPagesHistory = await this.fetchHistory(nextPage);

            if (printSteps == true) console.log(`[node_characterai] Bulk delete - Current page: ${999999-i}`);
            cumulatedHistory = cumulatedHistory.concat(thisPagesHistory.messages);
            nextPage = thisPagesHistory.nextPage;

            if (!thisPagesHistory.hasMore) break;
        }

        if (printSteps == true) console.log(`[node_characterai] Bulk delete - Total messages to delete: ${cumulatedHistory.length}`);

        const amountToLoop = Math.max(cumulatedHistory.length, amount);

        for (let i = 0; i < amountToLoop; i++) {
            const index = descending ? amountToLoop - 1 - i : i;
            const message = cumulatedHistory[index];

            if (message) idsToDelete.push(message.uuid);
        }

        if (idsToDelete.length == 0) return;

        const client = this.client;
        const request = await this.requester.request(`https://beta.character.ai/chat/history/msgs/delete/`, {
            headers:client.getHeaders(),
            method:"POST",
            body: Parser.stringify({
                "history_id" : this.externalId,
                "uuids_to_delete" : idsToDelete
            })
        });

        let passing = false;

        if (request.status() === 200) {
            const response = await Parser.parseJSON(request);

            if (response.status === "OK") passing = true;
        }

        if (!passing) throw Error("Failed to bulk delete messages.");
    }

    async saveAndStartNewChat() {
        if (!this.client.isAuthenticated()) throw Error("You must be authenticated to do this.");

        const client = this.client;
        const request = await this.requester.request(`https://beta.character.ai/chat/history/create/`, {
            headers:client.getHeaders(),
            method:"POST",
            body: Parser.stringify({
                "character_external_id" : this.characterId
            })
        });

        if (request.status() === 200) {
            const response = await Parser.parseJSON(request);
            
            this.externalId = response.external_id;
            return response;
        } else throw Error("Failed saving & creating new chat.");
    }
}

module.exports = Chat;
