import CAIClient from "../client";
import { CAIImage } from "./image";

export default class ObjectPatcher {
    static patch(client: CAIClient, instance: any, object: Record<string, any>) {
        const avatarFileName = object["avatar_file_name"];
        if (avatarFileName) {
            const avatar = new CAIImage(client);
            avatar.changeToEndpointUrlSync(avatarFileName);
            instance.avatar = avatar;
        }

        for (const [key, value] of Object.entries(object)) {
            if (key == "avatar_file_name") continue;
            instance[key] = value;
        }
    }
    static clean(object: Record<string, any>) {
        for (const [key, value] of Object.entries(object)) {
            if (value != undefined) continue;
            delete object[key];
        }
        
        return object;
    }
}