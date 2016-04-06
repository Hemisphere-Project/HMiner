var Process = require('./process.js');

function Amd(onData) {

    this.onData = onData || function(type, data) { };

    this.executer = new Process( 'Amd', './bash/stdin-exec', 100);
    this.executer.onData = this.onData;

    this.executer.start();
    this.executer.send('export DISPLAY=:0');
    this.executer.send('xhost +');

    this.send = function(cmd) {
        //console.log(cmd);
        this.executer.send(cmd);
        return this;
    }

    this.close = function() {
        this.executer.stop();
    }

}

module.exports = Amd;
