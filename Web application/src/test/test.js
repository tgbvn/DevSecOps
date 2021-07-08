//detect-unsafe-regex
const regex = /^[A-Za-z.,'-]([A-Za-z.,' -]*[A-Za-z.,'-])?$/;

//detect-buffer-noassert
// ok:detect-buffer-noassert
a.readUInt8(0)
// ok:detect-buffer-noassert
a.readUInt8(0, false)
// ruleid:detect-buffer-noassert
a.readUInt8(0, true)
// ruleid:detect-buffer-noassert
a.writeFloatLE(0, true)

//detect-child-process
const {exec, spawnSync} = require('child_process');
// ruleid:detect-child-process
exec(`cat *.js ${userInput}| wc -l`, (error, stdout, stderr) => {
  console.log(stdout)
});
// ruleid:detect-child-process
spawnSync(userInput);
// ok:detect-child-process
exec('ls')

//detect-disable-mustache-escape
// ruleid:detect-disable-mustache-escape
a.escapeMarkup = false;
// ok:detect-disable-mustache-escape
escapeMarkup = false;

//detect-eval-with-expression
// ok:detect-eval-with-expression
eval('alert')
// ok:detect-eval-with-expression
window.eval('alert')
// ruleid:detect-eval-with-expression
eval(b)
// ruleid:detect-eval-with-expression
window.eval('alert(' + c + ')')
// ruleid:detect-eval-with-expression
var x = new Function('a', 'b', `return ${funcName}(a,b)`)
// ruleid:detect-eval-with-expression
var y = Function('a', 'b', code)

//detect-no-csrf-before-method-override
function ok() {
    // ok:detect-no-csrf-before-method-override
    express.methodOverride()
    express.csrf()
}
function bad() {
    // ruleid:detect-no-csrf-before-method-override
    express.csrf()
    express.methodOverride()
}




