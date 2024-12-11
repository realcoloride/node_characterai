import Audio from 'naudiodon';

export default class AudioInterface {
    /**
     * Sets the `sox` path. Will call via PATH/Shell first if null (default).
     */
    static soxPath: string | null = null;

    /**
     * Gets all the available audio devices
     * @returns Device infos about all devices
     */
    static getAllDevices() { return Audio.getDevices(); }

    /**
     * Gets all the available microphones
     * @returns Device infos about all the available microphones
     */
    static getMicrophones() {
        return this.getAllDevices().filter(device => device.maxInputChannels > 0);
    }
    /**
     * Gets all the available speakers
     * @returns Device infos about all the available speakers
     */
    static getSpeakers() {
        return this.getAllDevices().filter(device => device.maxOutputChannels > 0);
    }
    private static findDeviceWithCriteria<T>(devices: Audio.DeviceInfo[], index: string, target: T) {
        return devices.find(device => (device as any)[index] == target);
    }

    /**
     * Gets a microphone with its id
     * @returns Found device info or `undefined`
     */
    static getMicrophoneFromId(id: number) {
        return this.findDeviceWithCriteria(this.getMicrophones(), 'id', id);
    }
    /**
     * Gets a microphone from its name
     * @returns Found device info or `undefined`
     */
    static getMicrophoneFromName(name: string) {
        return this.findDeviceWithCriteria(this.getMicrophones(), 'name', name);
    }
    
    /**
     * Gets a speaker with an id
     * @returns Found device info or `undefined`
     */
    static getSpeakerFromId(id: number) {
        return this.findDeviceWithCriteria(this.getSpeakers(), 'id', id);
    }
    /**
     * Gets a speaker from its name
     * @returns Found device info or `undefined`
     */
    static getSpeakerFromName(name: string) {
        return this.findDeviceWithCriteria(this.getSpeakers(), 'name', name);
    }
};