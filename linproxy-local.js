"use strict"

let socks = require('socksv5');
let proxysession = require('./proxysession');
const tunnels = require('./tunnels')

tunnels.setupWS();

let srv = socks.createServer(function(info, accept, deny) {
	let srcAddr = info.srcAddr;
	let srcPort = info.srcPort;
	let dstAddr = info.dstAddr;
	let dstPort = info.dstPort;
	console.log('accept sock, srcAddr:', srcAddr, ',srcPort:', srcPort, ',dstAddr:', dstAddr, ',dstPort:', dstPort);
	let sock = accept(true);
	proxysession.create(info, sock);
});

srv.listen(1080, 'localhost', function() {
	console.log('SOCKS server listening on port 1080');
});

srv.useAuth(socks.auth.None());
