import {
    DateComponent,
    ReplacementConverter,
    ReplacementFormatter, unicodeFormatter, unicodeParser,
    YSDSDate
} from "../src/date";

describe('YSDSDate tests', function () {

    it('should get components correctly', function () {
        const dt = new YSDSDate(2019, 1, 31)

        expect(dt.year).toBe(2019)
        expect(dt.month).toBe(1)
        expect(dt.date).toBe(31)
    })

    it('should prevent month overflow', function () {
        const dt = new YSDSDate(2019, 1, 31)
        const added = dt.add(DateComponent.Month, 1)
        expect(added.year).toBe(2019)
        expect(added.month).toBe(2)
        expect(added.date).toBe(28)
    })

    const dataProvider: Array<[number, number, number, DateComponent, number, number, number, number]> = [
        // these are stolen from Excel EDATE
        [2018, 1, 31, DateComponent.Month, 1, 2018, 2, 28],
        [2018, 2, 28, DateComponent.Month, 1, 2018, 3, 28],
        [2018, 3, 31, DateComponent.Month, 1, 2018, 4, 30],
        [2018, 4, 30, DateComponent.Month, 1, 2018, 5, 30],
        [2018, 5, 31, DateComponent.Month, 1, 2018, 6, 30],
        [2018, 6, 30, DateComponent.Month, 1, 2018, 7, 30],
        [2018, 7, 31, DateComponent.Month, 1, 2018, 8, 31],
        [2018, 8, 31, DateComponent.Month, 1, 2018, 9, 30],
        [2018, 9, 30, DateComponent.Month, 1, 2018, 10, 30],
        [2018, 10, 31, DateComponent.Month, 1, 2018, 11, 30],
        [2018, 11, 30, DateComponent.Month, 1, 2018, 12, 30],
        [2018, 12, 31, DateComponent.Month, 1, 2019, 1, 31],

        [2018, 1, 31, DateComponent.Month, 12, 2019, 1, 31],

        [2018, 1, 31, DateComponent.Month, -1, 2017, 12, 31],
        [2018, 2, 28, DateComponent.Month, -1, 2018, 1, 28],
        [2018, 3, 31, DateComponent.Month, -1, 2018, 2, 28],
        [2018, 4, 30, DateComponent.Month, -1, 2018, 3, 30],
        [2018, 5, 31, DateComponent.Month, -1, 2018, 4, 30],
        [2018, 6, 30, DateComponent.Month, -1, 2018, 5, 30],
        [2018, 7, 31, DateComponent.Month, -1, 2018, 6, 30],
        [2018, 8, 31, DateComponent.Month, -1, 2018, 7, 31],
        [2018, 9, 30, DateComponent.Month, -1, 2018, 8, 30],
        [2018, 10, 31, DateComponent.Month, -1, 2018, 9, 30],
        [2018, 11, 30, DateComponent.Month, -1, 2018, 10, 30],
        [2018, 12, 31, DateComponent.Month, -1, 2018, 11, 30],

        [2018, 1, 31, DateComponent.Month, -12, 2017, 1, 31],
        [2018, 12, 31, DateComponent.Month, 2, 2019, 2, 28],

        [2018, 12, 31, DateComponent.Month, 1, 2019, 1, 31],
        [2018, 1, 31, DateComponent.Date, 1, 2018, 2, 1],
        [2018, 1, 31, DateComponent.Year, 1, 2019, 1, 31],
        [2018, 1, 31, DateComponent.Year, 2, 2020, 1, 31],
    ]

    for (let i = 0; i < dataProvider.length; ++i) {
        const data = dataProvider[i]
        it(`should add components correctly ${i}`, function () {
            const dt = new YSDSDate(data[0], data[1], data[2])
            const added = dt.add(data[3], data[4])
            expect(added.year).toBe(data[5])
            expect(added.month).toBe(data[6])
            expect(added.date).toBe(data[7])
        })
    }

    it('should parse ISO-like dates natively', function() {
        const dt = YSDSDate.parse('2018-04-05T06:00:00Z')!
        expect(dt.year).toBe(2018)
        expect(dt.month).toBe(4)
        expect(dt.date).toBe(5)
    })

    it('should parse mysql-like dates natively', function () {
        const dt = YSDSDate.parse('2018-04-05 06:00:00')!
        expect(dt.year).toBe(2018)
        expect(dt.month).toBe(4)
        expect(dt.date).toBe(5)
    })

    it('should not ignore format because of ISO-like date', function() {
        const dt = YSDSDate.parse('2018-01-01', 'yee-boi')
        expect(dt).toBeUndefined()
    })

    it('should return undefined on invalid dates', function () {
        const dt = YSDSDate.parse('2018-01-01YEEEEEEEEEEEEEE')
        expect(dt).toBeUndefined()
    })

    it('should return 0 hours when parsing an ISO-like date', function () {
        const dt = YSDSDate.parse('2019-03-14')

        expect(dt!.hour).toBe(0)
    })
})

describe('replacement converter tests', () => {

    it('should replace simple strings', () => {
        const converter = new ReplacementConverter({
            a: 'b',
        })
        expect(converter.convert('a')).toBe('b')
    })

    it('should replace simple strings multiple times', () => {
        const converter = new ReplacementConverter({
            a: 'b',
        })
        expect(converter.convert('aaaa')).toBe('bbbb')
    })

    it('should prioritize longer keys', () => {
        const converter = new ReplacementConverter({
            a: '_a_',
            aa: '_aa_',
        })
        expect(converter.convert('aa')).toBe('_aa_')
    })

    it('should prioritize longer keys again', () => {
        const converter = new ReplacementConverter({
            aa: '_aa_',
            a: '_a_',
        })
        expect(converter.convert('aa')).toBe('_aa_')
    })

    it('should leave non-matched data in the output', () => {
        const converter = new ReplacementConverter({
            a: 'b',
        })
        expect(converter.convert('a.b.c.a')).toBe('b.b.c.b')
    })

    it('should do nothing if no matches are found', () => {
        const converter = new ReplacementConverter({
            a: 'b',
        })
        expect(converter.convert('bcd')).toBe('bcd')
    })

    it('should be case sensitive', () => {
        const converter = new ReplacementConverter({
            a: 'b',
        })
        expect(converter.convert('aAA')).toBe('bAA')
    })

    it('should allow multiple subsequent calls', () => {
        const converter = new ReplacementConverter({
            a: 'b',
        })
        expect(converter.convert('aa')).toBe('bb')
        expect(converter.convert('AA')).toBe('AA')
        expect(converter.convert('aaa')).toBe('bbb')
    })

})

describe('ReplacementFormatter tests', () => {

    it('should replace existing patterns correctly', () => {
        const formatter = new ReplacementFormatter({
            yyyy: date => 1000,
        })

        expect(formatter.format(new Date(), 'yyyy')).toBe('1000')
    })

    it('should skip non-existing patterns correctly', () => {
        const formatter = new ReplacementFormatter({
            MM: date => 1000,
        })

        expect(formatter.format(new Date(), 'yyyy')).toBe('yyyy')
    })

    it('should replace multiple patterns', () => {
        const formatter = new ReplacementFormatter({
            yyyy: date => 1000,
            MM: date => 500,
        })

        expect(formatter.format(new Date(), 'yyyy-MM')).toBe('1000-500')
    })

})

describe('unicodeParser tests', function() {
    const parser = unicodeParser

    it('should parse correctly', function() {
        const dt = parser.parse('2014-05-06 12:30:45', 'yyyy-MM-dd HH:mm:ss')!
        expect(dt).toBeTruthy()
        expect(dt.year).toBe(2014)
        expect(dt.month).toBe(5)
        expect(dt.date).toBe(6)
        expect(dt.hour).toBe(12)
        expect(dt.minute).toBe(30)
        expect(dt.second).toBe(45)
    })

    it('should ignore non-matching characters', function() {
        const dt = parser.parse('2014-03-02T06:03:04', 'yyyy-MM-dd')!
        expect(dt).toBeTruthy()
        expect(dt.year).toBe(2014)
        expect(dt.month).toBe(3)
        expect(dt.date).toBe(2)
    })

    it('should return undefined on non-matching pattern', function() {
        const dt = parser.parse('2019-01', 'yyyy-MM-dd')
        expect(dt).toBeUndefined()
    })

    it('should parse correctly from cache', function() {
        parser.parse('2018-01-01', 'yyyy-MM-dd')

        const dt = parser.parse('2017-02-03', 'yyyy-MM-dd')!
        expect(dt).toBeTruthy()
        expect(dt.year).toBe(2017)
        expect(dt.month).toBe(2)
        expect(dt.date).toBe(3)
    });

    it('should let empty fields be 0', function () {
        const dt = parser.parse('2017-02-03 06', 'yyyy-MM-dd HH')!
        expect(dt.hour).toBe(6)
        expect(dt.minute).toBe(0)
        expect(dt.second).toBe(0)
    });

    [
        '2019-03-14T00:15:00+04:00',
        '2019-03-14T00:15:00-06:00',
        '2019-03-14T23:15:00+11:00',
    ].forEach((value, idx) => {
        it('parsing timezones should behave like Date.parse() ' + idx, function () {
            const parsed = parser.parse(value, 'yyyy-MM-ddTHH:mm:ssxxx')
            const dt = new Date(value)

            expect(parsed!.year).toBe(dt.getFullYear())
            expect(parsed!.month).toBe(dt.getMonth() + 1)
            expect(parsed!.date).toBe(dt.getDate())
            expect(parsed!.hour).toBe(dt.getHours())
            expect(parsed!.minute).toBe(dt.getMinutes())
            expect(parsed!.second).toBe(dt.getSeconds())
        })
    })

})

describe('unicodeFormatter tests', function() {
    const dt = new YSDSDate(2015, 3, 4, 5, 6, 7)

    const formats = [
        ['yyyy', '2015'],
        ['yy', '15'],
        ['MM', '03'],
        ['M', '3'],
        ['dd', '04'],
        ['d', '4'],
        ['HH', '05'],
        ['h', '5'],
        ['hh', '05'],
        ['mm', '06'],
        ['ss', '07'],
        ['a', 'am'],
        ['yyyy-MM-dd', '2015-03-04'],
        ['HH:mm:ss a', '05:06:07 am'],
    ]

    for (let i = 0; i < formats.length; ++i) {
        const fmt = formats[i]
        it(`should format correctly ${i}`, function() {
            expect(unicodeFormatter.format(dt, fmt[0])).toBe(fmt[1])
        })
    }

    it('should format timezone correctly', function() {
        const pattern = /[+-]\d{4} [+-]\d{2}:\d{2}/
        expect(pattern.test(unicodeFormatter.format(dt, 'xx xxx'))).toBe(true)
    })

    it('should format 12-hour clock correctly', function() {
        expect(unicodeFormatter.format(new YSDSDate(2000, 1, 1, 0, 0, 0), 'h')).toBe('12')
        expect(unicodeFormatter.format(new YSDSDate(2000, 1, 1, 1, 0, 0), 'h')).toBe('1')
        expect(unicodeFormatter.format(new YSDSDate(2000, 1, 1, 12, 0, 0), 'h')).toBe('12')
        expect(unicodeFormatter.format(new YSDSDate(2000, 1, 1, 13, 0, 0), 'h')).toBe('1')
        expect(unicodeFormatter.format(new YSDSDate(2000, 1, 1, 16, 0, 0), 'h')).toBe('4')
    })
})
