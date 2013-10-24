
var chanceOfFailure = 0.75

var failed = Math.random() < chanceOfFailure

var exitCode = failed ? 10 : 0;

console.dir([failed,exitCode])
process.exit(exitCode)