const WebSocket = require('ws');
const wsurl = 'wss://www.llwant.com/linproxy';

function senddata(ws) {
	if (ws.fbuffer !== undefined) {
		var buffer = ws.fbuffer;
		delete(ws.fbuffer);
		ws.send(buffer);
	}
}

function proxysession(info, sock) {
	this.info = info;
	this.sock = sock;
	var self = this;
	
	this.proxy = function() {
		const ws = new WebSocket(wsurl);
		const sock = self.sock;

		ws.on('open', function open() {
			console.log('ws connect ok');
			ws.send(JSON.stringify(self.info));

			senddata(ws);
		});

		ws.on('message', function incoming(data) {
			sock.write(data);
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
		
		sock.on('data', function(data) {
			//console.log('write sock data to ws');
			// pending data
			const buf = data;
			if (ws.fbuffer === undefined) {
				ws.fbuffer = buf;
			} else {
				ws.fbuffer = Buffer.concat(ws.fbuffer, buf);
			}
			
			if (ws.readyState === WebSocket.OPEN) {
				senddata(ws);
			}
		});
	}	
}

proxysession.create = function (info, sock) {
	var ps = new proxysession(info, sock);
	ps.proxy();
};

module.exports = proxysession;
