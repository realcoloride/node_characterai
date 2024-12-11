const warnings: Record<'reachedMaxMessages' | 'sendingFrozen' | 'deletingInBulk' | 'contentFiltered' | 'soxNotFound', WarningEntry> = {
    reachedMaxMessages: {
        message: "You have reached the max amount of messages you can store. New messages will now overwrite old messages stored. To increase the number, change maxMessagesStored.",
        hasShown: false,
        useWarning: true
    },
    sendingFrozen: {
        message: "Failed to send; messages are still fetching. Please try again later.",
        hasShown: false,
        useWarning: false
    },
    deletingInBulk: {
        message: "Resetting a conversation, or deleting a lot of messages, can take some time.",
        hasShown: false,
        useWarning: false
    },
    contentFiltered: {
        message: "The generated candidate content has been flagged and aborted. This happens when the output was filtered for violent or explicit content. This will not be shown twice. Make sure to use candidate/message .wasFlagged to check beforehand to avoid any confusion.",
        hasShown: false,
        useWarning: true
    },
    soxNotFound: {
        message: "Sox is not present on this machine or not detected. The audio you tried to play will not be played. Here's a guide to install it: https://github.com/realcoloride/node_characterai/blob/2.0/README.md#installing-sox",
        hasShown: false,
        useWarning: true
    }
};

interface WarningEntry {
    message: string;
    hasShown: boolean;
    useWarning: boolean;
}

type WarningNames = keyof typeof warnings;

export default class Warnings {
    static disabled = false;

    static show(name: WarningNames) {
        if (this.disabled) return;
        const warning = warnings[name];

        const { hasShown, message, useWarning } = warning;
        if (hasShown) return;
        warning.hasShown = true;

        (useWarning ? console.warn : console.log)(`[node_characterai] Warning: ${message}`); 
    }

    static disable() { this.disabled = true; }
    static enable() { this.disabled = false; }
}