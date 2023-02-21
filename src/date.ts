import {Func2, Map, ReadonlyMap, StringLike} from "./types";
import {orderByWithComparator} from "./orderBy";

export const enum DateComponent {
    Year, Month, Date, Hour, Minute, Second, Millisecond,
}

export interface DateFormatterInterface {
    format(date: YSDSDate | Date, format: string): string
}

export interface DateFormatConverterInterface {
    convert(from: string): string
}

export interface DateParserInterface {
    parse(value: string, format: string): YSDSDate | undefined
}

function orderDescendingByLength(items: ArrayLike<string>): ReadonlyArray<string> {
    return orderByWithComparator(items, (a, b) => {
        const lenA = a.length
        const lenB = b.length
        if (lenA === lenB) {
            return 0
        }
        return lenA > lenB ? -1 : 1
    })
}

const getterMap = {
    [DateComponent.Year]: Date.prototype.getFullYear,
    [DateComponent.Month]: function (this: Date) {
        return this.getMonth() + 1
    },
    [DateComponent.Date]: Date.prototype.getDate,
    [DateComponent.Hour]: Date.prototype.getHours,
    [DateComponent.Minute]: Date.prototype.getMinutes,
    [DateComponent.Second]: Date.prototype.getSeconds,
    [DateComponent.Millisecond]: Date.prototype.getMilliseconds,
};

const setterMap = {
    [DateComponent.Year]: Date.prototype.setFullYear,
    [DateComponent.Month]: function (this: Date, value: number) {
        const prevDate = this.getDate()
        this.setMonth(value - 1)

        // the month component has overflowed into the date.
        // loop backwards until we get to the previous month
        // to fix the issue.
        if (prevDate != this.getDate()) {
            const month = this.getMonth()
            while (month == this.getMonth()) {
                this.setDate(this.getDate() - 1)
            }
        }
    },
    [DateComponent.Date]: Date.prototype.setDate,
    [DateComponent.Hour]: Date.prototype.setHours,
    [DateComponent.Minute]: Date.prototype.setMinutes,
    [DateComponent.Second]: Date.prototype.setSeconds,
    [DateComponent.Millisecond]: Date.prototype.setMilliseconds,
};

export class YSDSDate {

    protected readonly backend: Date

    public get year(): number {
        return this.getComponent(DateComponent.Year)
    }

    public get month(): number {
        return this.getComponent(DateComponent.Month)
    }

    public get date(): number {
        return this.getComponent(DateComponent.Date)
    }

    public get hour(): number {
        return this.getComponent(DateComponent.Hour)
    }

    public get minute(): number {
        return this.getComponent(DateComponent.Minute)
    }

    public get second(): number {
        return this.getComponent(DateComponent.Second)
    }

    public get millisecond(): number {
        return this.getComponent(DateComponent.Millisecond)
    }

    public get timestamp(): number {
        return Math.floor(this.backend.getTime() / 1_000)
    }

    public get timezoneOffset(): number {
        return this.backend.getTimezoneOffset()
    }

    constructor(
        year: number,
        month: number,
        date: number,
        hour: number = 0,
        minute: number = 0,
        second: number = 0,
        millisecond: number = 0
    ) {
        this.backend = new Date(year, month - 1, date, hour, minute, second, millisecond)
    }

    public static fromDate(date: Date): YSDSDate {
        return new YSDSDate(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
        )
    }

    public static now(): YSDSDate {
        return YSDSDate.fromDate(new Date())
    }

    public static parse(value: string, format?: string): YSDSDate | undefined {
        if (typeof format === 'undefined') {
            const lengthToAssumedFormat: Map<string> = {
                // 2019-01-01
                10: 'yyyy-MM-dd',

                // 2019-01-01T00:00:00
                19: 'yyyy-MM-ddTHH:mm:ss',

                // 2019-01-01T00:00:00Z
                20: 'yyyy-MM-ddTHH:mm:ssXXX',

                // 2019-01-01T00:00:00+0000
                24: 'yyyy-MM-ddTHH:mm:ssXX',

                // 2019-01-01T00:00:00+00:00
                25: 'yyyy-MM-ddTHH:mm:ssXXX',
            }

            format = lengthToAssumedFormat[value.length]

            // in some cases the "T" character is a space.
            if (format && value.length > 10) {
                const chars = value.split('')
                chars[10] = 'T'
                value = chars.join('')
            }
        }

        return unicodeParser.parse(value, format || 'yyyy-MM-dd HH:mm:ss')
    }

    public toDate(): Date {
        return new Date(this.backend.getTime())
    }

    public withComponent(component: DateComponent, value: number): YSDSDate {
        const dt = this.toDate()
        const fn = setterMap[component] as (this: Date, value: number) => void
        fn.call(dt, value)
        return YSDSDate.fromDate(dt)
    }

    public getComponent(component: DateComponent): number {
        return getterMap[component].call(this.backend)
    }

    public add(component: DateComponent, value: number): YSDSDate {
        return this.withComponent(component, this.getComponent(component) + value)
    }

    public format(format: string): string {
        return unicodeFormatter.format(this, format)
    }

    /**
     * Returns a diff between this date and some other moment in time.
     * The result will be marked 'isFuture' if the other date occurred
     * later than this instance.
     *
     * @see YSDSDateDiff.isFuture
     */
    public diff(other: YSDSDate): YSDSDateDiff {
        return new YSDSDateDiff(this, other)
    }
}

export enum YSDSDateDiffResult {
    Equal = 0,
    FirstArgumentOccursBeforeSecondArgument,
    FirstArgumentOccursAfterSecondArgument,
}

export class YSDSDateDiff {
    public readonly first: YSDSDate
    public readonly second: YSDSDate
    public readonly delta: number
    public readonly result: YSDSDateDiffResult

    /**
     * Returns the number of weeks between 'first' and 'second'.
     * The result is always a positive number.
     */
    public get weeks(): number {
        return Math.floor(Math.abs(this.delta) / 604_800)
    }

    /**
     * Returns the number of days between 'first' and 'second'.
     * The result is always a positive number.
     */
    public get days(): number {
        return Math.floor(Math.abs(this.delta) / 86_400);
    }

    /**
     * Returns the number of hours between 'first' and 'second'.
     * The result is always a positive number.
     */
    public get hours(): number {
        return Math.floor((Math.abs(this.delta) / 3_600) % 24)
    }

    /**
     * Returns the number of minutes between 'first' and 'second'.
     * The result is always a positive number.
     */
    public get minutes(): number {
        return Math.floor((Math.abs(this.delta) / 60) % 60)
    }

    /**
     * Returns true if 'second' is a later moment in time than 'first'.
     */
    public get isFuture(): boolean {
        return this.delta < 0;
    }

    constructor(first: YSDSDate, second: YSDSDate) {
        this.first = first;
        this.second = second;
        this.delta = this.first.timestamp - this.second.timestamp;

        if (this.delta === 0) {
            this.result = YSDSDateDiffResult.Equal;
        } else if (this.delta < 0) {
            this.result = YSDSDateDiffResult.FirstArgumentOccursBeforeSecondArgument;
        } else {
            this.result = YSDSDateDiffResult.FirstArgumentOccursAfterSecondArgument;
        }
    }

    public toString(): string {
        // if the delta is negative "b"
        // is somewhere in the future.
        const prefix = this.isFuture ? 'In ' : ''
        const suffix = this.isFuture ? '' : ' ago'

        const components: ReadonlyArray<[string, number]> = [
            ['w', this.weeks],
            ['d', this.days % 7],
            ['h', this.hours],
            ['min', this.minutes],
        ]

        return prefix + components
            .filter(([name, value]) => value > 0)
            .map(([name, value]) => `${value}${name}`)
            .join(' ') + suffix
    }
}

// an implementation of DateFormatterInterface that formats
// using a map of patterns.
export class ReplacementFormatter implements DateFormatterInterface {

    protected replacements: ReadonlyMap<Func2<YSDSDate, DateFormatterInterface, StringLike>>
    protected regexp: RegExp

    constructor(replacements: ReadonlyMap<Func2<YSDSDate, DateFormatterInterface, StringLike>>) {
        this.replacements = replacements
        this.regexp = new RegExp(
            orderDescendingByLength(Object.keys(this.replacements)).join('|'), 'g'
        )
    }

    public format(date: YSDSDate | Date, format: string): string {
        if (date instanceof Date) {
            date = YSDSDate.fromDate(date)
        }
        return format.replace(this.regexp, match => {
            return this.replacements[match]?.(date as YSDSDate, this).toString() ?? ''
        })
    }
}

// an implementation of DateFormatConverterInterface that
// simply converts using a map of pattern replacements.
export class ReplacementConverter implements DateFormatConverterInterface {

    private readonly replacements: ReadonlyMap<string>
    private readonly regexp: RegExp

    constructor(replacements: ReadonlyMap<string>) {
        this.replacements = replacements

        // extract the strings to be replaced and sort them
        // according to length so the longest strings are
        // replaced first. if we don't do this we might end up
        // with weird cases where 'yy' with replacements { y: '1', yy: '2' }
        // gets converted into '11', where it should be '2'.
        this.regexp = new RegExp(
            orderDescendingByLength(Object.keys(replacements)).join('|'), 'g'
        )
    }

    public convert(from: string): string {
        return from.replace(this.regexp, match => {
            return this.replacements[match] ?? ''
        })
    }
}

interface MatchHandler {
    (match: string, current: YSDSDate): YSDSDate
}

export class PatternParser implements DateParserInterface {

    protected readonly patterns: ReadonlyMap<[string, MatchHandler]>
    protected readonly cache: Map<[RegExp, ReadonlyArray<MatchHandler>]> = {}

    constructor(patterns: ReadonlyMap<[string, MatchHandler]>) {
        this.patterns = patterns
    }

    protected buildMatchingSequence(format: string): [RegExp, ReadonlyArray<MatchHandler>] {
        if (!this.cache.hasOwnProperty(format)) {
            // build a regex containing all formatting descriptors
            const formatRegex = orderDescendingByLength(Object.keys(this.patterns)).join('|')

            // using the formatting descriptors we construct a new
            // regex with the actual date matching patterns. we also
            // save the matching date component so we can keep track
            // of which part of the date to change with the match.
            const components: Array<MatchHandler> = []
            const dateRegex = format.replace(new RegExp(formatRegex, 'g'), match => {
                const p = this.patterns[match]
                if (!p) {
                    return ''
                }
                components.push(p[1])
                return `(${p[0]})`
            })
            this.cache[format] = [new RegExp(dateRegex), components]
        }
        return this.cache[format]!
    }

    public parse(value: string, format: string): YSDSDate | undefined {
        const seq = this.buildMatchingSequence(format)
        const matches = seq[0].exec(value)

        if (matches === null) {
            return undefined
        }

        let dt = new YSDSDate(0, 1, 1, 0, 0, 0, 0)

        for (let i = 1; i < matches.length; i++) {
            const match = matches[i]
            if (!match) {
                continue
            }
            const component = seq[1][i - 1]
            if (component) {
                dt = component(match, dt)
            }
        }

        return dt
    }
}

const timezonePattern = /Z|(?:[+-]\d{2}:?\d{2})/

function parseTimezoneOffset(value: string): number {
    if (!timezonePattern.test(value)) {
        return 0
    }

    // Z
    if (value.length === 1) {
        return 0
    }

    const sign = value[0] === '+' ? -1 : 1
    return sign * ((parseInt(value.slice(1, 3)) * 60) + parseInt(value.slice(-2)))
}

const timezoneMatchHandler: MatchHandler = (match, date) => {
    // note that we're fetching the timezone offset
    // from the supplied date and not a new object. this
    // is intentional because the time zone offset may
    // change depending on the date (DST).
    const localOffset = date.timezoneOffset
    const offsetMinutes = parseTimezoneOffset(match)
    const diff = offsetMinutes - localOffset
    return date.add(DateComponent.Minute, diff)
}

function matchHandlerForComponent(component: DateComponent): MatchHandler {
    return (match, current) => {
        return current.withComponent(
            component, parseInt(match)
        )
    }
}

export const unicodeParser = new PatternParser({
    yyyy: ['\\d{4}', matchHandlerForComponent(DateComponent.Year)],
    MM: ['\\d{2}', matchHandlerForComponent(DateComponent.Month)],
    dd: ['\\d{2}', matchHandlerForComponent(DateComponent.Date)],
    HH: ['\\d{2}', matchHandlerForComponent(DateComponent.Hour)],
    mm: ['\\d{2}', matchHandlerForComponent(DateComponent.Minute)],
    ss: ['\\d{2}', matchHandlerForComponent(DateComponent.Second)],
    xxx: ['[+-]\\d{2}:\\d{2}', timezoneMatchHandler],
    xx: ['[+-]\\d{2}\\d{2}', timezoneMatchHandler],
    XXX: ['Z|(?:[+-]\\d{2}:\\d{2})', timezoneMatchHandler],
    XX: ['Z|(?:[+-]\\d{2}\\d{2})', timezoneMatchHandler],
})

const twelveHourClockHours = [
    12,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
]

// these are indexed by the return value of Date.prototype.getDay
// which returns 0-6 for sunday-monday.
const daysOfWeek = [
    7, 1, 2, 3, 4, 5, 6,
]

// http://unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
export const unicodeFormatter = new ReplacementFormatter({
    // 4-digit year
    yyyy: date => date.year,

    // 2-digit year
    yy: date => date.year.toString().slice(-2),

    // month of year, zero padded
    MM: date => date.month.toString().padStart(2, '0'),

    // month of year
    M: date => date.month,

    // date of month, zero padded
    dd: date => date.date.toString().padStart(2, '0'),

    // date of month
    d: date => date.date,

    // hour, 24h, zero padded
    HH: date => date.hour.toString().padStart(2, '0'),

    // hour, 12h, zero padded
    hh: date => twelveHourClockHours[date.hour]?.toString().padStart(2, '0') ?? '',

    // hour, 12h
    h: date => twelveHourClockHours[date.hour] ?? '',

    // minute, zero padded
    mm: date => date.minute.toString().padStart(2, '0'),

    // second, zero padded
    ss: date => date.second.toString().padStart(2, '0'),

    // time zone offset, colon separated
    xxx: date => {
        const offset = date.timezoneOffset
        const sign = offset <= 0 ? '+' : '-'
        const hours = Math.floor(Math.abs(offset) / 60)
        const minutes = Math.abs(offset) % 60
        return sign +
            hours.toString().padStart(2, '0') +
            ':' +
            minutes.toString().padStart(2, '0')
    },

    // time zone offset, no separator between hour/minutes
    xx: (date, fmt) => {
        return fmt.format(date, 'xxx').replace(':', '')
    },

    // time zone offset, colon separated, Z for 0
    XXX: (date, fmt) => {
        const offset = date.timezoneOffset
        if (offset === 0) {
            return 'Z'
        }
        return fmt.format(date, 'xxx')
    },

    // time zone offset, no separator between hour/minutes, Z for 0
    XX: (date, fmt) => {
        const offset = date.timezoneOffset
        if (offset === 0) {
            return 'Z'
        }
        return fmt.format(date, 'xx')
    },

    // meridiem
    a: date => date.hour < 12 ? 'am' : 'pm',

    // day of week, zero padded
    ee: (date, fmt) => fmt.format(date, 'e').padStart(2, '0'),

    // day of week
    e: date => daysOfWeek[date.toDate().getDay()] ?? '',

    // week of year
    w: date => {
        // move to the last day of the week
        let dt = date.add(DateComponent.Date, 7 - parseInt(date.format('e')))

        // this loop is meant to detect whether the current week contains
        // Jan 4th. if that is the case we can immediately return 1.
        // otherwise, our loop variable "dt" will contain the first day of
        // the week that we started from. that's useful because the first
        // day of the week may be in a different year than the end of the
        // week.
        for (let i = 0; i < 6; ++i) {
            if (dt.month === 1 && dt.date === 4) {
                return 1
            }
            dt = dt.add(DateComponent.Date, -1)
        }

        const dateOfFirstWeek = getDateOfFirstWeek(dt.year)

        // 604800 is the number of seconds in a week.
        const weeks = Math.floor((date.timestamp - dateOfFirstWeek.timestamp) / 604_800)

        return weeks + 1
    },
})

export const phpFormatter: DateFormatterInterface = {
    format(date, format) {
        format = phpToUnicodeConverter.convert(format)
        return unicodeFormatter.format(date, format)
    },
}

// http://php.net/manual/en/function.date.php
// bootstrap format extracted from "bootstrap-datepicker.js"
export const phpToBootstrapConverter = new ReplacementConverter({
    Y: 'yyyy',
    m: 'mm',
    d: 'dd',
    j: 'd',
    n: 'm',
})

// http://www.unicode.org/reports/tr35/tr35-31/tr35-dates.html#Date_Format_Patterns
export const phpToUnicodeConverter = new ReplacementConverter({
    Y: 'yyyy',
    m: 'MM',
    d: 'dd',
    H: 'HH',
    i: 'mm',
    s: 'ss',
    j: 'd',
    n: 'M',
    A: 'a',
    g: 'h',
})

// http://php.net/manual/en/function.date.php
// https://momentjs.com/docs/#/displaying/
export const phpToMomentConverter = new ReplacementConverter({
    Y: 'YYYY',
    m: 'MM',
    d: 'DD',
    H: 'HH',
    i: 'mm',
    s: 'ss',
    j: 'D',
    n: 'M',
    A: 'A',
    g: 'h',
})

function getDateOfFirstWeek(year: number): YSDSDate {
    const dt = new YSDSDate(year, 1, 4)
    return dt.add(DateComponent.Date, 1 - parseInt(dt.format('e')))
}
