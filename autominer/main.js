var Proxy = require('./proxy.js');
const child_process = require('child_process');
var fs = require('fs');



// START
require('child_process').exec('pkill stdin-exec');

// CONFIG
var config = null;
try {
    config = JSON.parse(fs.readFileSync('miners.conf', 'utf8'));
} catch (e) {
    if (e.code === 'ENOENT') {
      console.log('miners.conf not found... please create miners.conf from miners.sample.conf.');
      process.exit();
    } else {
      throw e;
    }
}

var proxy = new Proxy('./bash/ethermine-proxy');
//var proxy = new Proxy('./suprnova-proxy'); // MINERS NOT PROPERLY CONFIGURED

for (var miner of config) proxy.addMiner( miner );

proxy.start();
