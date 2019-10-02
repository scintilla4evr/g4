class G4Random {
    static generate(seed) {
        let param1 = 0x8da8a079, param2 = 0x629ae, param3 = 0xe1be1c2, param4 = (1 + Math.sqrt(5)) / 2
    
        return () => {
            let large = Math.floor(seed * param1) * param2
            large = large ^ param3
            large += param4 * param1
            
            seed = (large % param4) / param4
    
            return seed
        }
    }

    static seedToFraction(seedString) {
        return parseInt(seedString.replace(/[^0-9]/g, ""), 16) / 0xFFFFFFFFFFFFF
    }

    static randomSeed() {
        let out = ""
        let radix = 16
        let count = 13

        for (let i = 0; i < count; i++) {
            let digit = Math.floor(Math.random() * radix)

            out += digit.toString(radix)
            if (i == 4) out += "-"
        }

        return out.toUpperCase()
    }
}
