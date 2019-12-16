module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    //"extends": "eslint:recommended",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        "eol-last": [
            "error"
            , "always"
        ],

        "no-trailing-spaces": [
            "error"
        ],
        /*
              "indent": [
                  "error",
                  4
              ],

              "quotes": [
                  "error",
                  "double"
              ],
              "semi": [
                  "error",
                  "always"
              ]
              */
    }
};
