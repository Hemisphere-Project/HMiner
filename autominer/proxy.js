var Process = require('./process.js');
var Miner = require('./miner.js');
const child_process = require('child_process');
var sleep = require('sleep');
var moment = require('moment');

const DISPLAY_REFRESH  = 6;
const RECHECK  = 2000;
const CHCKS = DISPLAY_REFRESH/RECHECK;

var LOG_MINER = 0; 
var LOG_HMINER = 1; 

module.exports = function ( command ) {

    this.cmd = command;
    var that = this;

    child_process.exec('pkill qtminer');
    //child_process.exec('pkill stdin-exec');

    this.miners = {};
    this.minerprocess = new Process( 'miner', './qtminer/qtminer.sh -s eu1.ethermine.org:4444 -u 0x2f44a56211dd1cf5afb3b913d993d36ab752862b.rig5qt -G  --cl-global-work 16384 --cl-local-work 128 ', 500  );
    //this.minerprocess = new Process( 'miner', './qtminer/qtminer.sh -s eu1.ethermine.org:4444 -u 0x2f44a56211dd1cf5afb3b913d993d36ab752862b.rig6qt3 -G', 500  );
    //this.minerprocess = new Process( 'miner', 'ethminer -G --farm-recheck '+RECHECK+' -F http://localhost:9000/rig6d --cl-global-work 16384 --cl-local-work 128', 500  );
    
    this.ratelist = [0];
    this.lowHR = 0;
    this.lowHRstop = 0;
    
    this.rate_timer = null;
    

    this.addMiner = function(options) {
        if (options.name && options.adapter !== undefined && options.device !== undefined) this.miners[options.name] = new Miner(options, that);
        else console.log("Error adding Miner: you should provide NAME / ADAPTER (amd) / DEVICE (ethminer)");
    }
    
    this.updateMiner = function(options) {
    	if (options.name && this.miners[options.name]) this.miners[options.name].update(options);
    }
    
    this.setlog = function(options) {
    	if (options.qtminer !== undefined) LOG_MINER = options.qtminer;
    	if (options.hminer !== undefined) LOG_HMINER = options.hminer;
    }

    this.start = function() {
    	console.log('PROXY : start');
        this.minerprocess.start('main');
        
        this.lowHR = 0;
        this.rate_timer = setInterval( that.rate_check, DISPLAY_REFRESH*1000);
    }

    this.stop = function(restart) {
    	console.log('PROXY : stop');
        this.minerprocess.stop('main');
        //child_process.exec('pkill qtminer');
        this.lowHRstop++;
        this.ratelist = [0];
        if (restart) setTimeout( function() { that.start() }, restart);
        if (this.rate_timer) clearInterval(this.rate_timer);
    }
    
    this.reboot = function () {
    	console.log('PROXY : reboot');
    	this.rebootprocess = new Process( 'reboot', 'reboot', 500  );
    	this.rebootprocess.start();
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

			if (rate.indexOf("DAG")  > -1) {
				that.lowHR = 0;
        		that.lowHRstop = 0;
			}
            
            if (LOG_MINER == 1) console.log(rate);
        }
        else console.log(rate);
    }
    this.minerprocess.onData = that.parseRate;
    
    this.rate_check = function() {
    	// LOG HASHRATE
        var rateAVG = Math.round(that.ratelist.reduce(function(a, b) { return a + b; })/(that.ratelist.length*100), 2);
    	console.log('\tAverage: '+rateAVG+' MH/s - LowHR: '+that.lowHR+' - LowHRstop: '+that.lowHRstop+' - Miner running: '+that.minerprocess.isRunning);
    	
    	// CHECK HR
    	if (rateAVG < 50) that.lowHR++;  // < 50MH/s
        else {
        	that.lowHR = 0;
        	that.lowHRstop = 0;
        }
        
	if (that.lowHR > 70/DISPLAY_REFRESH) {
		console.log('PROXY : LOW HR: restarting HW');
		that.stop(10000);
		if (that.lowHRstop > 2) that.reboot();
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
