var Proxy = require('./proxy.js');
const child_process = require('child_process');
var fs = require('fs');




// START
require('child_process').exec('pkill stdin-exec');

// CONFIG
var config = null;
var lastConf = null;
try {
    lastConf = fs.readFileSync('miners.conf', 'utf8');
    config = JSON.parse(lastConf);
} catch (e) {
    if (e.code === 'ENOENT') {
      console.log('miners.conf not found... please create miners.conf from miners.sample.conf.');
      process.exit();
    } else {
      throw e;
    }
}

// PROXY
var proxy = new Proxy('./bash/ethermine-proxy');
for (var miner of config['miners']) proxy.addMiner( miner );
proxy.setlog(config['logs']);
proxy.start();


// UPDATE
function updateMiners() {
	
	var newConf = fs.readFileSync('miners.conf', 'utf8');
	if (newConf == lastConf) return;
	
	console.log('Update Miners config');
	lastConf = newConf;
	config = JSON.parse(lastConf);
	for (var miner of config['miners']) proxy.updateMiner( miner );
	proxy.setlog(config['logs']);
}

setInterval(updateMiners, 30000);
