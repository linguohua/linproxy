const http = require('http');
const WebSocket = require('ws');
const url = require('url')
const server = http.createServer();
const wsserver = new WebSocket.Server({ noServer: true });
const net = require('net');

function closeAllMyTunnels(ws) {
	var tunnelsHub = ws.tunnelsHub;
	Object.keys(tunnelsHub).forEach(function (item) {
		t = tunnelsHub[item];
		t.onClose();
	});

	ws.tunnelsHub = {};
}

function senddata(t) {
	if (t.fbuffer !== undefined) {
		var buffer = t.fbuffer;
		delete(t.fbuffer);
		t.fsock.write(buffer);
	}
}

function closeTunnel(ws, t, key) {
	if (ws.readyState === WebSocket.OPEN) {
		var message = t.formatMsg(1);
		ws.send(message);
	}
	
	delete(ws.tunnelsHub[key]);
}

function tunnel(ws, key, initData) {
	var self = this;

	var info = JSON.parse(initData);

	var dstAddr = info.dstAddr;
	var dstPort = info.dstPort;
	
	var sock = new net.Socket();

	sock.connect(dstPort, dstAddr, function() {
		self.fsock = sock;
		senddata(self);
	});

	sock.on('data', function(data) {
		if (ws.readyState === WebSocket.OPEN) {
			var message = self.formatMsg(2, data);
			ws.send(message);
		}
	});

	sock.on('close', function() {
		closeTunnel(ws, self, key);
	});

	sock.on('error', function() {
		closeTunnel(ws, self,  key);
	});

	self.onMessage = function(data) {
		const buf = data;
		if (self.fbuffer === undefined) {
			self.fbuffer = buf;
		} else {
			self.fbuffer = Buffer.concat(self.fbuffer, buf);
		}

		var fsock = self.fsock;
		if (fsock !== undefined) {
			senddata(self);
		}		
	};

	self.onClose = function() {
		sock.end();
	};

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
	};
}

function newTunnel(ws, key, initData) {
	var t = new tunnel(ws, key, initData);
	
	ws.tunnelsHub[key] = t;
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

	if (code == 1) {
		if (t === undefined) {
			console.log('can not found tunnel to close for key:', key);
			return;
		}
		// 如果是close命令字
		delete(ws.tunnelsHub[key]);
		t.onClose();
	} else if (code == 2) {
		if (t === undefined) {
			console.log('can not found tunnel to send for key:', key);
			return;
		}
		
		// 如果是数据命令字
		t.onMessage(buf.slice(3));
	} else if (code == 0) {
		if (t !== undefined) {
			console.log('duplicate tunnel for key:', key);
			return;
		}

		newTunnel(ws, key, buf.slice(3));
	} else {
		console.log('unsupport code:', code);
	}
}

wsserver.on('connection', function connection(ws) {
	console.log('got a ws connection')
	ws.tunnelsHub = {};
	ws.on('message', function incoming(message) {
		// console.log('received: %s', message);
		processWebsocketMessage(ws, message);
	});
  
	var to = setInterval(function(){
		if (ws.readyState === WebSocket.OPEN) {
			var message = self.formatMsg(2, data);
			ws.ping();
		} else {
			clearTimeout(to);
		}
	}, 30*1000);
	
	ws.on('error', function() {
		clearTimeout(to);
		closeAllMyTunnels(ws);
	});

	ws.on('close', function() {
		clearTimeout(to);
		closeAllMyTunnels(ws);
	});
});

server.on('upgrade', function upgrade(request, socket, head) {
  const pathname = url.parse(request.url).pathname;

  if (pathname === '/linproxy') {
    wsserver.handleUpgrade(request, socket, head, function done(ws) {
      wsserver.emit('connection', ws, request);
    });
  } else{
    socket.destroy();
  }
});

server.listen(9090);
