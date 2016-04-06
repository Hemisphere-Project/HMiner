var Process = require('./process.js');
var Miner = require('./miner.js');
const child_process = require('child_process');

module.exports = function ( command ) {

    this.cmd = command;

    child_process.exec('pkill ethminer');
    child_process.exec('fuser 9000/tcp -k');

    this.miners = {};

    this.proxy = new Process( 'proxy', this.cmd, 500 );
    this.proxy.onData = function(t,d) {console.log('PROXY: '+d)}

    this.addMiner = function(options) {
        if (options.name && options.adapter !== undefined && options.device !== undefined) this.miners[options.name] = new Miner(options);
        else console.log("Error adding Miner: you should provide NAME / ADAPTER (amd) / DEVICE (ethminer)");
    }

    this.start = function() {
        this.proxy.start();
        for (var gpu in this.miners) this.miners[gpu].start();
    }

    this.stop = function() {
        this.proxy.stop();
        for (var gpu in this.miners) this.miners[gpu].stop();
    }

}
