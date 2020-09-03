import { formToObject } from "../src/formToObject";
import { createElement } from "../src/createElement"
import { range } from "../src/range";

describe('formToObject tests', () => {
    let container: Element

    beforeEach(() => {
        container = createElement('form', {}, [
            createElement('input', {
                name: 'a',
                value: 'OK',
            }),
            createElement('input', {
                name: 'b',
                type: 'checkbox',
                checked: true,
                value: '',
            }),
            ...range(0, 3).map(i => {
                return createElement('input', {
                    name: `c[${i}]`,
                    value: i.toString(),
                })
            }),
            createElement('textarea', {
                name: 'd',
                value: 'some_text',
            }),
            ...['a', 'b', 'c'].map(el => {
                return createElement('input', {
                    name: `e[${el}]`,
                    value: el,
                })
            }),
            ...range(0, 3).map(i => {
                return createElement('input', {
                    name: `f[]`,
                    value: i.toString(),
                })
            }),
        ])
    })

    it('should serialize correctly', () => {
        const ser = formToObject(container)

        expect(ser).toEqual({
            a: 'OK',
            b: true,
            c: ['0', '1', '2'],
            d: 'some_text',
            e: {
                a: 'a',
                b: 'b',
                c: 'c',
            },
            f: ['0', '1', '2'],
        })
    })

    it('should use valueGetter', () => {
        const ser = formToObject(container, elem => {
            return elem.value + '_YEE'
        })
        expect(ser).toEqual({
            a: 'OK_YEE',
            b: '_YEE',
            c: [
                '0_YEE',
                '1_YEE',
                '2_YEE',
            ],
            d: 'some_text_YEE',
            e: {
                a: 'a_YEE',
                b: 'b_YEE',
                c: 'c_YEE',
            },
            f: [
                '0_YEE',
                '1_YEE',
                '2_YEE',
            ],
        })
    })
})