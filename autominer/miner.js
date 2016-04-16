var Process = require('./process.js');
var AmdProcess = require('./amd.js');

const TIME_REFRESH  = 1;
const TIME_CRITICAL = 40;

module.exports = function (options, parent) {
    var that = this;
    this.name = options.name;
    this.adapter = options.adapter;
    this.device = options.device;
    

    this.minfreq = 500;
    this.normfreq = 800;
    this.maxfreq = options.maxfreq || 1050;
    this.currentfreq = this.minfreq;
    this.realfreq = 0;

    this.maxtemp = options.maxtemp || 85;
    this.criticaltemp = options.criticaltemp || 88;

    this.temp = 0;
    this.load = 0;

    this.hitHot = 0;
    this.isCritical = 0;
    this.autoShutdown = false;
    this.wantOC = 0;
    this.noTemp = 0;

    this.parent = parent
    this.miner = parent.minerprocess;
    //this.miner = new Process( this.name, 'ethminer -G --farm-recheck 100 -F http://localhost:9000/'+this.name+' --opencl-device '+this.device, 500  );


    this.start = function() {
        this.miner.start(that.name);
        that.autoShutdown = false;
    }

    this.stop = function(forSafety) {
        this.miner.stop(that.name);
        if (!forSafety) forSafety = false;
        that.autoShutdown = forSafety;

        that.parent.ratelist = [0];
        that.parent.lowHR = 0;
        that.noLoad = 0;
        that.isCritical = 0;
        that.noTemp = 0;
    }

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
            if (that.temp >= that.criticaltemp && that.currentfreq == that.minfreq) that.isCritical++;
            else that.isCritical = 0;

            // HOT :: stop Miner
            if (that.isCritical*TIME_REFRESH > TIME_CRITICAL) {
                that.stop(true);
                console.log(that.name+` : CRITICAL TEMP: stopping miner`);
            }

            // restart Miner
            if (that.autoShutdown && !that.miner.isRunning && that.temp < that.maxtemp-10) {
                that.start();
                console.log(that.name+` : TEMP went down: restarting miner`);
            }

            // Adjust Freqeuncy
            if (that.miner.isRunning) that.adjustFreq(that.maxtemp-that.temp);

        }
        /*else that.noTemp++;

        // NO TEMP :: stop Miner
        if (that.noTemp > TIME_REFRESH*10)
        {
            console.log(that.name+" : Can't read TEMP on GPU ");
            that.stop(true);
        }*/
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
            if (that.temp > that.criticaltemp) mul=20;
            freq_shift = degrees*mul;             // down grade frequency
            if (that.isStable) that.hitHot++;   // unstable
            that.isStable = false;
            that.wantOC--;
        }

        // too COLD
        else if (degrees > 0) {
            if (that.load > 50) {
                that.wantOC++;
                if (that.wantOC > Math.min(5,that.hitHot)) {
                    freq_shift = degrees;   // up grade frequency
                    that.isStable = false;  // unstable
                    that.wantOC = 0;
                    if (that.hitHot > 2) that.hitHot--;
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
    }, TIME_REFRESH*1000);

    /* INIT */
    this.setFreq(this.normfreq);
}
