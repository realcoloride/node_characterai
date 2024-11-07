import { EventEmitter } from "stream";

// makes it hidden from debug
const serializableFieldsSymbol = Symbol('serializableFields');

export function hiddenProperty(target: any, propertyKey: string) {
    if (!target.constructor[serializableFieldsSymbol])
        target.constructor[serializableFieldsSymbol] = [];

    target.constructor[serializableFieldsSymbol].push({ propertyKey, show: false });
};

// for getters
export function getterProperty(target: any, propertyKey: string) {
    if (!target.constructor[serializableFieldsSymbol])
        target.constructor[serializableFieldsSymbol] = [];

    const fieldName = propertyKey;
    target.constructor[serializableFieldsSymbol].push({ propertyKey, show: true, fieldName });
};

function autoSpec(this: any) {
    const serializedData: any = {};
    const decoratedFields = this.constructor[serializableFieldsSymbol] || [];
    const allFields = Object.keys(this);

    // Handle decorated fields first
    for (const field of decoratedFields) {
        if (!field.show) continue;

        const fieldName = field.fieldName || field.propertyKey;
        const value = this[field.propertyKey];
        if (value !== undefined) serializedData[fieldName] = value;
    }

    // Handle non-decorated fields
    for (const field of allFields) {
        if (field === 'constructor') continue;
        if (!decoratedFields.some((decorated: any) => decorated.propertyKey === field)) {
            const value = this[field];
            if (typeof value !== 'function' && value !== undefined) 
                serializedData[field] = value;
        }
    }

    return serializedData;
}

export class Specable { [Symbol.for('nodejs.util.inspect.custom')]() { return autoSpec.bind(this)(); } }
export class EventEmitterSpecable extends EventEmitter { [Symbol.for('nodejs.util.inspect.custom')]() { return autoSpec.bind(this)(); } }