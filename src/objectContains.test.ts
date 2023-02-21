import {objectContains} from "../src/objectContains";

describe('objectContains tests', () => {
    it('should work on top level values', () => {
        expect(objectContains({ yee: 'boi' }, 'boi')).toBe(true);
    });

    it('should return false when not found', () => {
        expect(objectContains({ yee: 'my dude' }, 'boi')).toBe(false);
    });

    it('should work on nested object', () => {
        expect(objectContains({ yee: { yee: 'boi' }}, 'boi')).toBe(true);
    });

    it('should ignore casing', () => {
        expect(objectContains({ yee: 'BOI'}, 'boi')).toBe(true);
    });

    it('should not fail on null', () => {
        expect(objectContains({ yee: null }, 'boi')).toBe(false);
    });

    it('should not fail on undefined', () => {
        expect(objectContains({ yee: undefined }, 'boi')).toBe(false);
    });

    it('should not blindly call toString() on everything', () => {
        expect(objectContains({ yee: () => {} }, 'function')).toBe(false);
    });

    it('should work on numbers', () => {
        expect(objectContains({ yee: 1 }, '1')).toBe(true);
    });

    it('should work on booleans', () => {
        expect(objectContains({ yee: true }, 'true')).toBe(true);
    });
});
