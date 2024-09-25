import { CAIImage } from "./image";

export default class ObjectPatcher {
    static patch(instance: any, object: Record<string, any>) {
        for (const [key, value] of Object.entries(object))
            instance[key] = value;

        if (object["avatar_file_name"]) {
            const avatar = new CAIImage();
            // TODO

            instance["avatar_file_name"].avatar = avatar;
        }
    }
}