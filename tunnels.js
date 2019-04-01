const WebSocket = require('ws');
const wsurl = 'ws://localhost:9090/linproxy';

/*
	open:0
	close:1
	data:2
*/

var wsHub = [];
var wsHubIndex = 0;

function allocWS() {
	return wsHub[0];
}

function allocKey(ws) {
	var tunnelsHub = ws.tunnelsHub;
	var index = ws.tIndex;
	if (index === undefined) {
		index = 0;
		ws.tIndex = index;
	}
	
	for(var i = index; i < 10000; i++) {
		if (tunnelsHub[i] === undefined) {
			ws.tIndex = i + 1;
			return i;
		}
	}
	
	for (var i = 0; i < index; i++) {
		if (tunnelsHub[i] === undefined) {
			ws.tIndex = i + 1;
			return i;
		}
	}
	
	console.log('failed to alloc key');
}

function closeAllMyTunnels(ws) {
	var tunnelsHub = ws.tunnelsHub;
	Object.keys(tunnelsHub).forEach(function (item) {
		t = tunnelsHub[item];
		t.onClose();
	});

	ws.tunnelsHub = {};
}

function processWebsocketMessage(ws, buf) {
	// 第一个字节命令字
	// 第二，第三个字节是key
	// 后面是数据

	// 获取code
	var code = buf.readInt8(0);
	// 获取key
	var key = buf.readInt16LE(1);
	
	var t = ws.tunnelsHub[key]
	if (t === undefined) {
		console.log('can not found tunnel for key:', key);
		return;
	}

	if (code == 1) {
		// 如果是close命令字
		delete(ws.tunnelsHub[key])
		t.onClose();
	} else if (code == 2) {
		// 如果是数据命令字
		t.onMessage(buf.slice(3));
	} else {
		console.log('unsupport code:', code);
	}	
}

function tunnel(ws, key) {
	var self = this;
	
	self.send = function(data) {
		if (ws.readyState === WebSocket.OPEN) {
			var message = self.formatMsg(2, data);
			ws.send(message);
		}
	}
	
	self.close = function() {
		if (ws.readyState === WebSocket.OPEN) {
			var message = self.formatMsg(1);
			ws.send(message);
		}

		delete(ws.tunnelsHub[key])
	}

	self.open = function(initData) {
		if (ws.readyState === WebSocket.OPEN) {
			var message = self.formatMsg(0, initData);
			ws.send(message);
		}
		
		ws.tunnelsHub[key] = self;
	}

	self.formatMsg = function(code, data) {
		// 第一个字节命令字
		// 第二，第三个字节是key
		// 后面是数据
		var size = 3;
		if (data !== undefined) {
			size = size + data.length;
		}
		
		const buf = Buffer.alloc(size);
		buf.writeInt8(code, 0);
		buf.writeInt16LE(key, 1);

		if (data !== undefined) {
			data.copy(buf, 3);
		}

		return buf;
	}

	return self;
}

tunnel.create = function(initData) {
	var ws = allocWS();
	var key = allocKey(ws);
	
	var t = new tunnel(ws, key);
	t.open(initData);
	
	return t;
}

tunnel.setupWS = function() {
	const ws = new WebSocket(wsurl);
	ws.tunnelsHub = {};
	
	ws.on('open', function open() {
		console.log('ws connect ok');
		wsHub.push(ws);
		ws.on('message', function incoming(data) {
			processWebsocketMessage(ws, data);
		});

		ws.on('error', function() {
			closeAllMyTunnels(ws);
		});
		
		ws.on('close', function() {
			closeAllMyTunnels(ws);
		});
	});
}

module.exports = tunnel;
