const warnings: any = {
    "reachedMaxMessages" : {
        message: "You have reached the max amount of messages you can store. New messages will now overwrite old messages stored. To increase the number, change maxMessagesStored.",
        hasShown: false,
        useWarning: true
    },
    "sendingFrozen" : {
        message: "Failed to send; messages are still fetching. Please try again later.",
        hasShown: false,
        useWarning: false
    }
}

export default class Warnings {
    static disabled = false;

    static show(name: "reachedMaxMessages" | "sendingFrozen") {
        if (this.disabled) return;
        const warning = warnings[name];

        const { hasShown, message, useWarning } = warning;
        if (hasShown) return;
        warning.hasShown = true;

        (useWarning ? console.warn : console.log)(`[node_characterai] Warning: ${message}`); 
    }
}