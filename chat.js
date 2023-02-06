class Chat {
    constructor(client, characterId, continueBody) {
        this.characterId = characterId;
        this.externalId = continueBody.external_id;

        this.client = client;

        const ai = continueBody.participants.find(
            (participant) => participant.is_human === false
        );
        this.aiId = ai.user.username;
    }

    async fetchHistory() {
        const client = this.client;
        const request = await fetch(`https://beta.character.ai/chat/history/msgs/user/?history_external_id=${this.externalId}/`, {
            headers:client.getHeaders()
        })

        if (request.status === 200) {
            const response = await request.json()

            return response;
        } else Error('Could not fetch the chat history.')
    }
    async sendAndAwaitResponse(message, singleReply) {
        const payload = {
            history_external_id: this.externalId,
            character_external_id: this.characterId,
            text: message,
            tgt: this.aiId,
            ranking_method: 'random',
            faux_chat: false,
            staging: false,
            model_server_address: null,
            override_prefix: null,
            override_rank: null,
            rank_candidates: null,
            filter_candidates: null,
            prefix_limit: null,
            prefix_token_limit: null,
            livetune_coeff: null,
            stream_params: null,
            enable_tti: true,
            initial_timeout: null,
            insert_beginning: null,
            translate_candidates: null,
            stream_every_n_steps: 16,
            chunks_to_pad: 8,
            is_proactive: false,
        };

        const client = this.client;

        if (!client.isAuthenticated()) throw Error('You must be authenticated to do this.');

        const request = await fetch('https://beta.character.ai/chat/streaming/', {
            body:JSON.stringify(payload),
            method:'POST',
            headers:client.getHeaders()
        })

        if (request.status === 200) {
            const response = await request.text()
            const replies = [];

            for (const line of response.split('\n')) {
                if (line.startsWith('{')) {
                  replies.push(JSON.parse(line));
                  continue;
                }
          
                const start = line.indexOf(' {');
                if (start < 0) continue;
                replies.push(JSON.parse(line.slice(start - 1)));
              }
          
              if (!singleReply) return replies;
              else return replies.pop().replies.shift().text;
        } else Error('Failed sending message.')
    }
}

module.exports = Chat
