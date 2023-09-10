class AudioPlayer {
    static async playAudio(page, base64) {
        try
        {
            await page.evaluate(`let TTS = new Audio("data:audio/wav;base64,${base64}"); TTS.play()`);
        } catch(error)
        {
            console.log("Could not play audio:", error)
        }
    }
}

module.exports = AudioPlayer;