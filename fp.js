const http = require('http');
const WebSocket = require('ws');
const url = require('url')
const server = http.createServer();
const wsserver = new WebSocket.Server({ noServer: true });
const net = require('net');

function senddata(ws) {
	if (ws.fbuffer !== undefined) {
		var buffer = ws.fbuffer;
		delete(ws.fbuffer);
		ws.fsock.write(buffer);
	}
}

function bind2sock(ws) {
	var info = ws.socks5info;

	var dstAddr = info.dstAddr;
	var dstPort = info.dstPort;
	
	var sock = new net.Socket();

	sock.connect(dstPort, dstAddr, function() {
		ws.fsock = sock;
		senddata(ws);
	});

	sock.on('data', function(data) {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(data);
		}
	});

	ws.on('error', function() {
		sock.end();
	});
	
	ws.on('close', function() {
		sock.end();
	});
	
	sock.on('close', function() {
		ws.close();
	});
	
	sock.on('error', function() {
		ws.close();
	});
}

wsserver.on('connection', function connection(ws) {
  console.log('got a ws connection')

  ws.on('message', function incoming(message) {
    // console.log('received: %s', message);
	
	if (ws.hasRecvFirstMsg === undefined) {
		var info = JSON.parse(message);
		ws.socks5info = info;
		
		bind2sock(ws);
		
		ws.hasRecvFirstMsg = true;
	} else {
		// pending data
		const buf = message;
		if (ws.fbuffer === undefined) {
			ws.fbuffer = buf;
		} else {
			ws.fbuffer = Buffer.concat(ws.fbuffer, buf);
		}

		var fsock = ws.fsock;
		if (fsock !== undefined) {
			senddata(ws);
		}
	}
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
