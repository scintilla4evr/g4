class CoverageRange {
    /**
     * @param {Number} low 
     * @param {Number} high 
     */
    constructor(low, high) {
        this.low = low
        this.high = high
    }

    /**
     * @param {CoverageRange} range 
     * @returns {CoverageRange}
     */
    subtract(range) {
        if (range.low <= this.low && range.high >= this.high) {
            return []
        } else if (range.low >= this.low && range.high <= this.high) {
            let ranges = []

            if (range.low != this.low) ranges.push(
                new CoverageRange(this.low, range.low)
            )
            if (range.high != this.high) ranges.push(
                new CoverageRange(range.high, this.high)
            )

            return ranges
        } else if (range.low > this.low && range.high >= this.high && range.low < this.high) {
            return [new CoverageRange(this.low, range.low)]
        } else if (range.low <= this.low && range.high < this.high && range.high > this.low) {
            return [new CoverageRange(range.high, this.high)]
        }

        return [new CoverageRange(this.low, this.high)]
    }

    get length() {
        return Math.abs(this.low - this.high)
    }
}

class Coverage {
    constructor() {
        this.outputRanges = [
            new CoverageRange(0, 1)
        ]
    }

    subtract(range) {
        let ranges = []

        this.outputRanges.forEach(r => {
            let rs = r.subtract(range)
            ranges = [...ranges, ...rs]
        })

        this.outputRanges = ranges
    }

    getMaxLength() {
        let lengths = this.outputRanges.map(range => range.length)
        return Math.max(...lengths)
    }
}