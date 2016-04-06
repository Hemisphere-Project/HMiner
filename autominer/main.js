var Proxy = require('./proxy.js');
var AmdProcess = require('./amd.js');
const child_process = require('child_process');



// START
child_process.exec('pkill stdin-exec');

AmdProcess = new AmdProcess();
AmdProcess.send('export GPU_MAX_ALLOC_PERCENT=100');
AmdProcess.send('export GPU_USE_SYNC_OBJECTS=1');
AmdProcess.send('export GPU_MAX_HEAP_SIZE=100');

AmdProcess.send('amdconfig --od-enable --adapter=all');


var proxy = new Proxy('./bash/ethermine-proxy');

//var proxy = new Proxy('./suprnova-proxy'); // MINERS NOT PROPERLY CONFIGURED

proxy.addMiner({name:'gpu1', adapter:0, device:0, maxfreq:1140});
proxy.addMiner({name:'gpu2', adapter:1, device:1, maxfreq:1140});

proxy.start();
