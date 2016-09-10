const child_process = require('child_process');
//var Logger = require('./logger.js')();


module.exports = function (name, command, logsize) {
    var that = this;
    this.name = name;
    this.logsize = logsize || 500;
    this.cmd = command;
    this.proc = null;
    this.isRunning = false;
    this.tokens = {};
    //this.logger = Logger.add(this.name, this.logsize, false);

    this.onData = function(type, data) { }

    this.start = function(token) 
    {
    	if (token) that.tokens[token] = true;
    	
    	if (that.isRunning) return;
    	else for (var t in this.tokens)
    		if (!this.tokens[t]) return;
    
        var command = this.cmd.split(' ');
        this.proc = child_process.spawn(command.shift(), command, {detached: true});
        this.proc.stdin.setEncoding('utf-8');
        this.isRunning = true;
        //this.logger.log('event', `process started`);
        this.proc.stdout.on('data', (data) => {
            data = data.toString('utf8').replace(/(\r\n|\n|\r)/gm,"");
            //that.logger.log('output', data);
            that.onData('output', data);
        });
        this.proc.stderr.on('data', (data) => {
            data = data.toString('utf8').replace(/(\r\n|\n|\r)/gm,"");
            //that.logger.log('error', data);
            that.onData('error', data);
        });
        this.proc.on('close', (code) => {
            //that.logger.log('event', `process exited with code ${code}`);
            that.isRunning = false;
        });
    }

    this.send = function(cmd) {
    	try {
        	this.proc.stdin.write(cmd+"\n");
	} catch (ex) {
		console.log(ex);
	}
    }

    this.stop = function(token) {
    	if (token) that.tokens[token] = false;
        //this.logger.log('event', `stopping process`);
        try {
        	if (this.proc) process.kill(that.proc.pid); 
	} catch (ex) {
		console.log(ex);
	}
        
    }

}
