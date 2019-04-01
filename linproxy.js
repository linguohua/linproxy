var socks = require('socksv5');
var proxysession = require('./proxysession');

var srv = socks.createServer(function(info, accept, deny) {
	var srcAddr = info.srcAddr;
	var srcPort = info.srcPort;
	var dstAddr = info.dstAddr;
	var dstPort = info.dstPort;
	console.log('accept sock, srcAddr:', srcAddr, ',srcPort:', srcPort, ',dstAddr:', dstAddr, ',dstPort:', dstPort);
	var sock = accept(true);
	proxysession.create(info, sock);
});

srv.listen(1080, 'localhost', function() {
	console.log('SOCKS server listening on port 1080');
});

srv.useAuth(socks.auth.None());
