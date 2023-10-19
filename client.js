const Chat = require("./chat");
const uuidv4 = require("uuid").v4;
const Parser = require("./parser");
const Requester = require("./requester");

/**
 * Represents a client for interacting with the Character AI API.
 * @class
 * @memberof module:node_characterai
 */
class Client {
	#token = undefined;
	#isGuest = false;
	#authenticated = false;
	#guestHeaders = {
		"content-type": "application/json",
		"user-agent":
			"CharacterAI/1.0.0 (iPhone; iOS 14.4.2; Scale/3." +
			Math.random().toFixed(1).split(".")[1] +
			")",
	};
	requester = new Requester();

	constructor() {
		this.#token = undefined;
	}

	/**
	 * Fetches the categories of characters from the Character AI API.
	 * @async
	 * @function fetchCategories
	 * @memberof module:node_characterai/client
	 * @returns {Promise<Array>} A promise that resolves to an array of character categories.
	 * @throws {Error} If the request fails or the response status is not 200.
	 */
	async fetchCategories() {
		const request = await this.requester.request(
			"https://beta.character.ai/chat/character/categories/"
		);

		if (request.status() === 200) return await Parser.parseJSON(request);
		else throw Error("Failed to fetch categories");
	}

	/**
	 * Fetches user configuration from the Character AI chat API.
	 * @async
	 * @returns {Promise<Object>} The user configuration object.
	 * @throws {Error} If the request to fetch user configuration fails.
	 */
	async fetchUserConfig() {
		const request = await this.requester.request(
			"https://beta.character.ai/chat/config/",
			{
				headers: this.#guestHeaders,
			}
		);

		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);

			return response;
		} else Error("Failed fetching user configuration.");
	}

	/**
	 * Fetches the authenticated user's information from the Character AI API.
	 * @async
	 * @function fetchUser
	 * @memberof module:node_characterai/client
	 * @throws {Error} If the user is not authenticated or if the API request fails.
	 * @returns {Promise<Object>} The user's information.
	 */
	async fetchUser() {
		if (!this.isAuthenticated())
			throw Error("You must be authenticated to do this.");

		const request = await this.requester.request(
			"https://beta.character.ai/chat/user/",
			{
				headers: this.getHeaders(),
			}
		);

		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);

			return response;
		} else Error("Failed fetching user.");
	}

	/**
	 * Fetches the featured characters from the Character AI API.
	 * @async
	 * @throws {Error} If the user is not authenticated or if the request fails.
	 * @returns {Promise<Object>} The response object containing the featured characters.
	 */
	async fetchFeaturedCharacters() {
		if (!this.isAuthenticated())
			throw Error("You must be authenticated to do this.");

		const request = await this.requester.request(
			"https://beta.character.ai/chat/characters/featured_v2/",
			{
				headers: this.getHeaders(),
			}
		);

		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);

			return response;
		} else Error("Failed fetching featured characters.");
	}

	/**
	 * Fetches characters by category from the Character AI API.
	 * @async
	 * @param {boolean} [curated=false] - Whether to fetch curated characters or not.
	 * @throws {Error} Invalid arguments.
	 * @throws {Error} Failed fetching characters by category.
	 * @returns {Promise<Array>} An array of characters.
	 */
	async fetchCharactersByCategory(curated = false) {
		if (curated == undefined || typeof curated != "boolean")
			throw Error("Invalid arguments.");

		const url = `https://beta.character.ai/chat/${
			curated ? "curated_categories" : "categories"
		}/characters/`;

		const request = await this.requester.request(url, {
			headers: this.#guestHeaders,
		});

		const property = curated
			? "characters_by_curated_category"
			: "characters_by_category";

		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);

			return response[property];
		} else Error("Failed fetching characters by category.");
	}

	/**
	 * Fetches character information from the Character AI API.
	 * @async
	 * @param {string} characterId - The ID of the character to fetch information for.
	 * @throws {Error} If the user is not authenticated or if the arguments are invalid.
	 * @returns {Promise<Object>} A Promise that resolves to the character information.
	 */
	async fetchCharacterInfo(characterId) {
		if (!this.isAuthenticated())
			throw Error("You must be authenticated to do this.");
		if (characterId == undefined || typeof characterId != "string")
			throw Error("Invalid arguments.");

		const request = await this.requester.request(
			`https://beta.character.ai/chat/character/info/`,
			{
				headers: this.getHeaders(),
				body: Parser.stringify({
					external_id: characterId,
				}),
				method: "POST",
			}
		);

		console.log(request);

		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);

			return response.character;
		} else Error("Could not fetch character information.");
	}

	/**
	 * Searches for characters by name.
	 * @async
	 * @param {string} characterName - The name of the character to search for.
	 * @returns {Promise<Object>} - A promise that resolves with the search results.
	 * @throws {Error} - If the user is not authenticated, is a guest account, or if the arguments are invalid.
	 */
	async searchCharacters(characterName) {
		if (!this.isAuthenticated())
			throw Error("You must be authenticated to do this.");
		if (this.#isGuest) throw Error("Guest accounts cannot use the search feature.");
		if (characterName == undefined || typeof characterName != "string")
			throw Error("Invalid arguments.");

		const request = await this.requester.request(
			`https://beta.character.ai/chat/characters/search/?query=${characterName}`,
			{
				headers: this.getHeaders(),
			}
		);

		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);

			return response;
		} else Error("Could not search for characters.");
	}

	/**
	 * Retrieves recent conversations from the Character AI API.
	 * @async
	 * @function
	 * @throws {Error} If user is not authenticated or if recent conversations could not be retrieved.
	 * @returns {Promise<Object>} A Promise that resolves with the recent conversations data.
	 */
	async getRecentConversations() {
		if (!this.isAuthenticated())
			throw Error("You must be authenticated to do this.");
		const request = await this.requester.request(
			`https://beta.character.ai/chat/characters/recent/`,
			{
				headers: this.getHeaders(),
			}
		);

		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);

			return response;
		} else Error("Could not get recent conversations.");
	}

	/**
	 * Creates a new chat or continues an existing one with the given character ID and history external ID.
	 * @async
	 * @param {string} characterId - The ID of the character to chat with.
	 * @param {string|null} [externalId=null] - The external ID of the chat history to continue. If null, a new chat history will be created.
	 * @returns {Promise<Chat>} A Promise that resolves with a new Chat instance.
	 * @throws {Error} If the user is not authenticated, or if the arguments are invalid, or if the chat could not be created or resumed.
	 */
	async createOrContinueChat(characterId, externalId = null) {
		if (!this.isAuthenticated())
			throw Error("You must be authenticated to do this.");
		if (
			characterId == undefined ||
			typeof characterId != "string" ||
			typeof (externalId != null ? externalId : "") != "string"
		)
			throw Error("Invalid arguments.");

		let request = await this.requester.request(
			"https://beta.character.ai/chat/history/continue/",
			{
				body: Parser.stringify({
					character_external_id: characterId,
					history_external_id: externalId,
				}),
				method: "POST",
				headers: this.getHeaders(),
			}
		);

		if (request.status() === 200 || request.status() === 404) {
			let response = await request.text();

			if (
				response === "No Such History" ||
				response === "there is no history between user and character"
			) {
				// Create a new chat
				request = await this.requester.request(
					"https://beta.character.ai/chat/history/create/",
					{
						body: Parser.stringify({
							character_external_id: characterId,
							history_external_id: null,
						}),
						method: "POST",
						headers: this.getHeaders(),
					}
				);
				if (request.status() === 200) response = await Parser.parseJSON(request);
				else Error("Could not create a new chat.");
			}

			// If a text gets returned, we try to parse it to JSON!
			try {
				response = JSON.parse(response);
			} catch (error) {}

			// Continue it
			const continueBody = response;
			return new Chat(this, characterId, continueBody);
		} else Error("Could not create or resume a chat.");
	}

	/**
	 * Creates a new character with the given options.
	 * @async
	 * @param {Object} opts - The options for the new character.
	 * @param {string} opts.title - The title of the character.
	 * @param {string} opts.name - The name of the character.
	 * @param {string} opts.description - The description of the character.
	 * @param {string} opts.greeting - The greeting of the character.
	 * @param {string} opts.visibility - The visibility of the character. Must be one of "PRIVATE", "PUBLIC", or "UNLISTED".
	 * @returns {Object} A Promise that resolves with the response from the API.
	 * @throws {Error} If the user is not authenticated, or if any required arguments are missing or invalid.
	 */
	async createNewCharacter(opts) {
		if (!this.isAuthenticated())
			throw Error("You must be authenticated to do this.");

		let { title, name, description, greeting, visibility } = opts;
		if (!title || !name || !description || !greeting || !visibility)
			throw Error("Missing arguments");
		if (
			typeof title != "string" ||
			typeof name != "string" ||
			typeof description != "string" ||
			typeof greeting != "string" ||
			typeof visibility != "string"
		)
			throw Error("Invalid arguments.");

		visibility = visibility.trim().toUpperCase();
		if (
			visibility != "PRIVATE" &&
			visibility != "PUBLIC" &&
			visibility != "UNLISTED"
		)
			throw Error(
				`Invalid visibility. Must be one of "PRIVATE", "PUBLIC", or "UNLISTED".`
			);
		const options = {
			title,
			name,
			description,
			greeting,
			visibility,
			identifier: "id:" + uuidv4(),
			// TODO: Add these options
			categories: [],
			copyable: false,
			definition: "",
			avatar_rel_path: "",
			img_gen_enabled: false,
			base_img_prompt: "",
			strip_img_prompt_from_msg: false,
			voice_id: "",
		};
		const request = await this.requester.request(
			"https://beta.character.ai/chat/character/create/",
			{
				body: Parser.stringify(options),
				method: "POST",
				headers: this.getHeaders(),
			}
		);

		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);
			return response;
		} else Error("Could not create character.");
	}

	/**
	 * Fetches text-to-speech audio from Character AI API.
	 * @async
	 * @param {number} voiceId - The ID of the voice to use for the audio.
	 * @param {string} toSpeak - The text to convert to speech.
	 * @returns {Promise<string>} - The audio file as a base64-encoded string.
	 * @throws {Error} - If user is not authenticated or if invalid arguments are provided.
	 */
	async fetchTTS(voiceId, toSpeak) {
		if (!this.isAuthenticated())
			throw Error("You must be authenticated to do this.");
		if (
			!voiceId ||
			!toSpeak ||
			typeof voiceId != "number" ||
			typeof toSpeak != "string"
		)
			throw Error("Invalid arguments.");

		let request = await this.requester.request(
			`https://beta.character.ai/chat/character/preview-voice/?voice_id=${voiceId}&to_speak=${toSpeak}`,
			{
				headers: this.getHeaders(),
			}
		);

		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);

			return response.speech;
		} else Error("Could not fetch speech");
	}

	/**
	 * Fetches the available TTS voices from the Character AI API.
	 * @async
	 * @returns {Promise<Array>} An array of available TTS voices.
	 * @throws {Error} If the user is not authenticated or if the voices could not be fetched.
	 */
	async fetchTTSVoices() {
		if (!this.isAuthenticated())
			throw Error("You must be authenticated to do this.");

		let request = await this.requester.request(
			"https://beta.character.ai/chat/character/voices/",
			{
				headers: this.getHeaders(),
			}
		);

		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);

			return response.voices;
		} else Error("Could not fetch voices");
	}

	/**
	 * Authenticates the client with the provided token.
	 * @async
	 * @function authenticateWithToken
	 * @memberof module:node_characterai/client
	 * @instance
	 * @throws {Error} If the client is already authenticated or if the token is invalid.
	 * @param {string} token - The access token to use for authentication.
	 * @returns {Promise<string>} The authentication token.
	 */
	async authenticateWithToken(token) {
		if (this.isAuthenticated()) throw Error("Already authenticated");
		if (!token || typeof token != "string") throw Error("Specify a valid token");

		await this.requester.initialize();

		const request = await this.requester.request(
			"https://beta.character.ai/dj-rest-auth/auth0/",
			{
				method: "POST",
				body: Parser.stringify({
					access_token: token,
				}),
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);

			this.#isGuest = false;
			this.#authenticated = true;
			this.#token = response.key;

			return response.token;
		} else throw Error("Authentication token is invalid");
	}

	/**
	 * Authenticates the user as a guest and returns a token.
	 * Guest users can only send up to 10 messages.
	 * @throws {Error} If the user is already authenticated, registering fails, or fetching a lazy token fails.
	 * @returns {Promise<string>} The token for the authenticated guest user.
	 */
	async authenticateAsGuest() {
		if (this.isAuthenticated()) throw Error("Already authenticated");
		console.log(
			"[node_characterai] Puppeteer - Warning: Guest users can only send up to 10 messages."
		);
		await this.requester.initialize();

		let generating = false;
		let request;

		let uuid = uuidv4();

		// This is experimental but forces authentication
		for (let i = 0; i < 20; i++) {
			generating = true;

			uuid = uuidv4();
			const payload = JSON.stringify({
				lazy_uuid: uuid,
			});

			const baseRequest = await Promise.race([
				this.requester.request("https://beta.character.ai/chat/auth/lazy/", {
					method: "POST",
					body: payload,
					headers: this.#guestHeaders,
				}),
				new Promise((resolve) => setTimeout(() => resolve(null), 2000)),
			]);

			request = baseRequest;
			generating = false;

			if (request) break;
		}

		if (request.status() === 200) {
			const response = await Parser.parseJSON(request);

			if (response.success === true) {
				this.#isGuest = true;
				this.#authenticated = true;
				this.#token = response.token;
				this.uuid = uuid;

				return response.token;
			} else throw Error("Registering failed");
		} else throw Error("Failed to fetch a lazy token");
	}

	/**
	 * Unauthenticates the client by resetting the authentication status, token, and requester.
	 * @returns {void}
	 */
	unauthenticate() {
		if (this.isAuthenticated()) {
			this.#authenticated = false;
			this.#isGuest = false;
			this.#token = undefined;
			this.requester.uninitialize();
		}
	}

	/**
	 * Returns the token associated with the client.
	 * @returns {string} The token associated with the client.
	 */
	getToken() {
		return this.#token;
	}
	/**
	 * Returns whether the client is a guest or not.
	 * @returns {boolean} - True if the client is a guest, false otherwise.
	 */
	isGuest() {
		return this.#isGuest;
	}
	/**
	 * Checks if the client is authenticated.
	 * @returns {boolean} Returns true if the client is authenticated, false otherwise.
	 */
	isAuthenticated() {
		return this.#authenticated;
	}

	/**
	 * Returns the headers object with authorization token and content type.
	 * @returns {Object} The headers object.
	 */
	getHeaders() {
		return {
			authorization: `Token ${this.#token}`,
			"Content-Type": "application/json",
			// "user-agent": "CharacterAI/1.0.0 (iPhone; iOS 14.4.2; Scale/3.00)",
			// "sec-ch-ua": `"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"`,
			// "sec-ch-ua-mobile": "?0",
			// "sec-ch-ua-platform": "Windows",
			// "sec-fetch-dest": "empty",
			// "sec-fetch-mode": "cors",
			// "sec-fetch-site": "same-origin"
		};
	}
}

module.exports = Client;
