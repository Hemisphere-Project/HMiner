var Process = require('./process.js');
var AmdProcess = require('./amd.js');

const TEMP_IDEAL = 88; //87
const TEMP_CRITICAL = 90; //90

const TIME_REFRESH  = 2;
const TIME_CRITICAL = 40;

module.exports = function (options) {
    var that = this;
    this.name = options.name;
    this.adapter = options.adapter;
    this.device = options.device;

    this.minfreq = 600;
    this.normfreq = 1000;
    this.maxfreq = options.maxfreq || 1050;
    this.currentfreq = this.minfreq;
    this.realfreq = 0;

    this.temp = 0;
    this.load = 0;
    this.ratelist = [0];

    this.hitHot = 0;
    this.isCritical = 0;
    this.autoShutdown = false;
    this.wantOC = 0;

    this.miner = new Process( this.name, 'ethminer -G --farm-recheck 100 -F http://localhost:9000/'+this.name+' --opencl-device '+this.device, 500  );


    this.start = function() {
        this.miner.start();
        that.autoShutdown = false;
    }

    this.stop = function(forSafety) {
        this.miner.stop();
        if (!forSafety) forSafety = false;
        that.autoShutdown = forSafety;
    }

    // CHECK RATE
    this.parseRate = function(type, rate) {
        rate = rate.split(' : ')[1];
        if (rate) rate = rate.split(' H/s ')[0];
        if (!isNaN(rate))
        {
            that.ratelist.push(Math.round(rate/10000));
            if (that.ratelist.length > TIME_REFRESH*10) that.ratelist.shift();
        }
    }
    this.miner.onData = that.parseRate;

    // CHECK TEMP
    this.parseTemp = function (type, temp) {
        //console.log('temp: '+temp);
        temp = temp.split('-');
        temp = temp[2];
        var t = parseInt(temp);
        if (!isNaN(t))
        {
            // store temp
            that.temp = t;
            that.noTemp = 0;

            // critical HOT
            if (that.temp >= TEMP_CRITICAL && that.currentfreq == that.minfreq) that.isCritical++;
            else that.isCritical = 0;

            // HOT :: stop Miner
            if (that.isCritical*TIME_REFRESH > TIME_CRITICAL) {
                that.stop(true);
                console.log(that.name+` : CRITICAL TEMP: stopping miner`);
            }

            // restart Miner
            if (that.autoShutdown && !that.miner.isRunning && that.temp < TEMP_IDEAL-10) {
                that.start();
                console.log(that.name+` : TEMP went down: restarting miner`);
            }

            // Adjust Freqeuncy
            if (that.miner.isRunning) that.adjustFreq(TEMP_IDEAL-that.temp);

        }
        else that.noTemp++;

        // NO TEMP :: stop Miner
        if (that.noTemp > TIME_REFRESH*10)
        {
            console.log(that.name+` : Can't read TEMP ! stopping miner..`);
            that.stop(true);
        }
    }

    // CHECK LOAD
    this.parseClock = function (type, clock) {

        var rclock = parseInt(clock.split('Current Peak :')[1]);
        if (!isNaN(rclock)) that.realfreq = rclock;

        var load = parseInt(clock.split('GPU load :')[1]);
        if (!isNaN(load))
        {
            that.load = load;

            // NO LOAD ?
            if (that.load < 50) that.noLoad++;
            else that.noLoad = 0;
            if (that.noLoad > TIME_REFRESH*30) {
                console.log(that.name+` : No LOAD detected, trying to restart miner..`);
                that.stop(true);
            }
        }

    }

    this.adjustFreq = function(degrees) {

        var freq_shift = 0;

        // too HOT
        if (degrees < 0) {
            var mul = 5;
            if (that.temp > TEMP_CRITICAL) mul=20;
            freq_shift = degrees*mul;             // down grade frequency
            if (that.isStable) that.hitHot++;   // unstable
            that.isStable = false;
            that.wantOC--;
        }

        // too COLD
        else if (degrees > 0) {
            if (that.load > 50) {
                that.wantOC++;
                if (that.wantOC > Math.min(4,that.hitHot)) {
                    freq_shift = degrees;   // up grade frequency
                    that.isStable = false;  // unstable
                    that.wantOC = 0;
                }
            }
        }

        // stable
        else that.isStable = true;

        // apply
        if (freq_shift != 0) {
            var newfreq =  that.currentfreq + freq_shift;
            newfreq = Math.min(that.maxfreq, newfreq);
            newfreq = Math.max(that.minfreq, newfreq);
            if (newfreq != that.currentfreq) that.setFreq(newfreq);
        }

    }

    this.setFreq = function(freq) {
        that.currentfreq = freq;
        this.amd_clock.send('aticonfig --adapter='+that.adapter+' --odsc '+that.currentfreq+','+that.currentfreq);
        //console.log(that.name+' set Clock to '+that.currentfreq);
    }

    /* TEMPERATURE / CLOCK POLLING */
    this.amd_temp = new AmdProcess( that.parseTemp );
    this.amd_clock = new AmdProcess( that.parseClock );
    this.temp_timer = setInterval( function() {
        that.amd_temp.send('aticonfig --adapter='+that.adapter+' --od-gettemperature');
        that.amd_clock.send('aticonfig --adapter='+that.adapter+' --odgc');

        var rateAVG = Math.round(that.ratelist.reduce(function(a, b) { return a + b; })/(that.ratelist.length*100), 2);
        console.log(Date()+' MINER '+that.name+': '+that.temp+'°C\t|\t'+that.currentfreq+' ('+that.realfreq+') Hz\t|\t'+that.load+' %\t|\t'+rateAVG+' MH/s');
    }, TIME_REFRESH*1000);

    /* INIT */
    this.setFreq(this.normfreq);
}