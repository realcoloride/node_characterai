
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

export class Specable {
    [Symbol.for('nodejs.util.inspect.custom')]() {
        const serializedData: any = {};
        
        const decoratedFields = (this as any).constructor[serializableFieldsSymbol] || [];
        const allFields = Object.keys(this);
    
        for (const field of decoratedFields) {
            if (!field.show) continue; 
    
            const fieldName = field.fieldName || field.propertyKey;
            serializedData[fieldName] = (this as any)[field.propertyKey];
        }
    
        for (const field of allFields) {
            if (!decoratedFields.some((decorated: any) => decorated.propertyKey === field))
                serializedData[field] = (this as any)[field];
        }
    
        return serializedData;
    }
}