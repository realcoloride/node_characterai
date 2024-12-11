import Audio from 'naudiodon';

export default class AudioInterface {
    /**
     * Sets the `sox` path. Will call via PATH/Shell first if null (default).
     */
    static soxPath: string | null = null;

    static getAllDevices() { return Audio.getDevices(); }

    static getMicrophones() {
        return this.getAllDevices().filter(device => device.maxInputChannels > 0);
    }
    static getSpeakers() {
        return this.getAllDevices().filter(device => device.maxOutputChannels > 0);
    }
    private static findDeviceWithCriteria<T>(devices: Audio.DeviceInfo[], index: string, target: T) {
        return devices.find(device => (device as any)[index] == target);
    }

    static getMicrophoneFromId(id: number) {
        return this.findDeviceWithCriteria(this.getMicrophones(), 'id', id);
    }
    static getMicrophoneFromName(name: string) {
        return this.findDeviceWithCriteria(this.getMicrophones(), 'name', name);
    }
    
    static getSpeakerFromId(id: number) {
        return this.findDeviceWithCriteria(this.getSpeakers(), 'id', id);
    }
    static getSpeakerFromName(name: string) {
        return this.findDeviceWithCriteria(this.getSpeakers(), 'name', name);
    }
};