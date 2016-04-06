var Proxy = require('./proxy.js');
var AmdProcess = require('./amd.js');
const child_process = require('child_process');



// START
child_process.exec('pkill stdin-exec');




var proxy = new Proxy('./bash/ethermine-proxy');

//var proxy = new Proxy('./suprnova-proxy'); // MINERS NOT PROPERLY CONFIGURED

proxy.addMiner({name:'gpu1', adapter:0, device:0, maxfreq:1140});
proxy.addMiner({name:'gpu2', adapter:1, device:1, maxfreq:1140});

proxy.start();
