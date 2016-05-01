var Process = require('./process.js');
var Miner = require('./miner.js');
const child_process = require('child_process');
var sleep = require('sleep');
var moment = require('moment');

const DISPLAY_REFRESH  = 3;
const RECHECK  = 200;
const CHCKS = 1000/RECHECK;

var LOG_PROXY = 1;
var LOG_MINER = 0; 
var LOG_HMINER = 1; 

module.exports = function ( command ) {

    this.cmd = command;
    var that = this;

    child_process.exec('pkill ethminer');
    child_process.exec('fuser 9000/tcp -k');

    this.miners = {};

    this.proxy = new Process( 'proxy', this.cmd, 500 );
    this.proxy.onData = function(t,d) { if (LOG_PROXY > 0) console.log('PROXY: '+d)}

    this.minerprocess = new Process( 'miner', 'ethminer -G --farm-recheck '+RECHECK+' -F http://localhost:9000/rig6', 500  );
    this.ratelist = [0];
    this.lowHR = 0;
    
    this.rate_timer = null;
    

    this.addMiner = function(options) {
        if (options.name && options.adapter !== undefined && options.device !== undefined) this.miners[options.name] = new Miner(options, that);
        else console.log("Error adding Miner: you should provide NAME / ADAPTER (amd) / DEVICE (ethminer)");
    }
    
    this.updateMiner = function(options) {
    	if (options.name && this.miners[options.name]) this.miners[options.name].update(options);
    }
    
    this.setlog = function(options) {
    	if (options.ethminer !== undefined) LOG_MINER = options.ethminer;
    	if (options.ethproxy !== undefined) LOG_PROXY = options.ethproxy;
    	if (options.hminer !== undefined) LOG_HMINER = options.hminer;
    }

    this.start = function() {
    	console.log('PROXY : start');
        this.proxy.start();
        this.minerprocess.start('main');
        
        this.lowHR = 0;
        this.rate_timer = setInterval( that.rate_check, DISPLAY_REFRESH*1000);
    }

    this.stop = function(restart) {
    	console.log('PROXY : stop');
        this.proxy.stop();
        this.minerprocess.stop('main');
        
        this.ratelist = [0];
        if (restart) setTimeout( function() { that.start() }, restart);
        
        if (this.rate_timer) clearInterval(this.rate_timer);
    }
    
    // CHECK RATE
    this.parseRate = function(type, rate) {
        var hashrate = rate.split(' : ')[1];
        if (hashrate) hashrate = hashrate.split(' H/s ')[0];
        if (!isNaN(hashrate))
        {
            hashrate = Math.round(hashrate/10000);
            that.ratelist.push(hashrate);
            if (that.ratelist.length > DISPLAY_REFRESH*CHCKS) that.ratelist.shift();
		
        }
        
        // LOG
        if (LOG_MINER <= 1) {
            
            if (rate.indexOf("work package") > -1) ;
            else if (rate.indexOf("workLoop")  > -1) ;
            else if (rate.indexOf("Header-hash")  > -1) ;
            else if (rate.indexOf("Seedhash")  > -1) ;
            else if (rate.indexOf("Target")  > -1) ;
            else if (rate.indexOf("Nonce:")  > -1) ;
            else if (rate.indexOf("Exception -32003")  > -1) ;
            else if (rate.indexOf("JSON-RPC problem")  > -1) ;
            
            if (LOG_MINER == 1) console.log(rate);
        }
        else console.log(rate);
    }
    this.minerprocess.onData = that.parseRate;
    
    this.rate_check = function() {
    	// LOG HASHRATE
        var rateAVG = Math.round(that.ratelist.reduce(function(a, b) { return a + b; })/(that.ratelist.length*100), 2);
    	console.log('\t'+rateAVG+' MH/s');
    	
    	// CHECK HR
    	if (rateAVG < 50 && that.minerprocess.isRunning) that.lowHR++;  // < 50MH/s
        else that.lowHR = 0;
        
	if (that.lowHR > 120/DISPLAY_REFRESH) {
		console.log('PROXY : LOW HR: restarting miner');
		that.stop(5000);
	}	
    	
    	that.ratelist = [0];
    	
    	// LOG GPU STATES
    	if (LOG_HMINER)
	    	for (var name in that.miners) {
	    		var gpu = that.miners[name];
	    		var date = moment().format('YYYY-MM-DD HH:mm:ss,SSS');
			var logstr = 'MINER: '+date+' INFO '+gpu.name+': '+gpu.temp+'°C\t|\t'+gpu.currentfreq+' ('+gpu.realfreq+') MHz\t|\t'+gpu.load+' %\t|';
			console.log(logstr);     
	    	} 
    }
    
    

}
