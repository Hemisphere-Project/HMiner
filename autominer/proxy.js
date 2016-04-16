var Process = require('./process.js');
var Miner = require('./miner.js');
const child_process = require('child_process');
var sleep = require('sleep');
var moment = require('moment');

module.exports = function ( command ) {

    this.cmd = command;
    var that = this;

    child_process.exec('pkill ethminer');
    child_process.exec('fuser 9000/tcp -k');

    this.miners = {};

    this.proxy = new Process( 'proxy', this.cmd, 500 );
    this.proxy.onData = function(t,d) {console.log('PROXY: '+d)}

    this.minerprocess = new Process( this.name, 'ethminer -G --farm-recheck 200 -F http://localhost:9000/rig6', 500  );
    this.ratelist = [0];
    this.lowHR = 0;
    

    this.addMiner = function(options) {
        if (options.name && options.adapter !== undefined && options.device !== undefined) this.miners[options.name] = new Miner(options, that);
        else console.log("Error adding Miner: you should provide NAME / ADAPTER (amd) / DEVICE (ethminer)");
    }

    this.start = function() {
        this.proxy.start();
        for (var gpu in this.miners) that.miners[gpu].start();
    }

    this.stop = function() {
        this.proxy.stop();
        for (var gpu in this.miners) this.miners[gpu].stop();
    }
    
    // CHECK RATE
    this.parseRate = function(type, rate) {
        var hashrate = rate.split(' : ')[1];
        if (hashrate) hashrate = hashrate.split(' H/s ')[0];
        if (!isNaN(hashrate))
        {
            hashrate = Math.round(hashrate/10000);
            that.ratelist.push(hashrate);
            if (that.ratelist.length > 1*10) that.ratelist.shift();

            if (hashrate < 5000) that.lowHR++;  // < 50MH/s
            else that.lowHR = 0;
            if (that.lowHR >  10*60) {
                console.log(that.name+` : LOW HR: restarting miner`);
                that.stop(true);
            }
        }
        else {
            if (rate.indexOf("work package") > -1) ;
            else if (rate.indexOf("workLoop")  > -1) ;
            else if (rate.indexOf("Header-hash")  > -1) ;
            else if (rate.indexOf("Seedhash")  > -1) ;
            else if (rate.indexOf("Target")  > -1) ;
            else if (rate.indexOf("Nonce:")  > -1) ;
            else console.log(rate);
        }
    }
    this.minerprocess.onData = that.parseRate;
    
    this.rate_timer = setInterval( function() {
    	// LOG HASHRATE
        var rateAVG = Math.round(that.ratelist.reduce(function(a, b) { return a + b; })/(that.ratelist.length*100), 2);
    	console.log('\t'+rateAVG+' MH/s');
    	
    	// LOG GPU STATES
    	for (var name in that.miners) {
    		var gpu = that.miners[name];
    		var date = moment().format('YYYY-MM-DD HH:mm:ss,SSS');
        	var logstr = 'MINER: '+date+' INFO '+gpu.name+': '+gpu.temp+'°C\t|\t'+gpu.currentfreq+' ('+gpu.realfreq+') Hz\t|\t'+gpu.load+' %\t|';
        	console.log(logstr);     
    	} 
    }, 3000);
    
    

}
