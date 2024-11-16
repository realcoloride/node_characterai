import { randomUUID } from "crypto";
export function createIdentifier() { return `id:${randomUUID()}`; }