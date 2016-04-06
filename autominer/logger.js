

function LogFile(size, eko) {
    this.size = size;
    this.eko = eko;
    this.logs = [];
    this.log = function(type, txt) {
        this.logs.push({'type':type, 'msg': txt, 'date': Date.now()});
        if (this.logs.length > this.size) this.logs.shift();
        if (this.eko) console.log(type+' '+txt);
    }
}

function Logger() {
    this.logfiles = {};
    this.add = function(name, size, eko) {
        this.logfiles[name] = new LogFile(size, eko);
        return this.logfiles[name];
    }
}


var theLogg = null;
module.exports = function() {
    if (!theLogg) theLogg = new Logger();
    return theLogg;
};
