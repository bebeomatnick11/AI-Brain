"use strict";

class CodeAnalyzer {

    analyze(
        files = {},
        requirements = {}
    ) {

        const result = {

            files:
                Object.keys(files),

            javascriptFiles: [],

            suspiciousFiles: [],

            requirements,

            findings: []
        };

        for (
            const [
                path,
                source
            ] of Object.entries(files)
        ) {

            if (
                /\.(js|cjs|mjs)$/
                    .test(path)
            ) {

                result.javascriptFiles
                    .push(path);
            }

            if (
                /TODO|FIXME|throw new Error/i
                    .test(source)
            ) {

                result.suspiciousFiles
                    .push(path);
            }
        }

        return result;
    }
}

module.exports = {
    CodeAnalyzer
};
