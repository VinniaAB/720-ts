export function objectContains<T>(value: T, needle: string): boolean {
    if (value === null) {
        return false;
    }

    switch (typeof value) {
        case 'undefined':
        case 'function':
            return false;
        case 'object':
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key) && objectContains(value[key], needle)) {
                    return true;
                }
            }
            break;
    }

    return String(value).toLowerCase().includes(needle.toLowerCase());
}
