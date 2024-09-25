import { CAIImage } from "./image";

export default class ObjectPatcher {
    static patch(instance: any, object: Record<string, any>) {
        if (object["avatar_file_name"]) {
            const avatar = new CAIImage();
            // TODO

            instance.avatar = avatar;
        }

        for (const [key, value] of Object.entries(object)) {
            if (key == "avatar_file_name") continue;
            instance[key] = value;
        }
    }
}