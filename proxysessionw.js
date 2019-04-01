const tunnels = require('./tunnels.js')

function proxysession(info, sock) {
	this.info = info;
	this.sock = sock;
	var self = this;

	this.proxy = function() {
		const tunnel = tunnels.create(Buffer.from(JSON.stringify(self.info)));
		const sock = self.sock;
		if (tunnel == null) {
			sock.end();
			return;
		}

		tunnel.onMessage = function incoming(data) {
			sock.write(data);
		};

		tunnel.onError = function() {
			sock.end();
		};
		
		tunnel.onClose = function() {
			sock.end();
		};
		
		sock.on('close', function() {
			tunnel.close();
		});
		
		sock.on('error', function() {
			tunnel.close();
		});
		
		sock.on('data', function(data) {
			//console.log('write sock data to ws');
			// pending data
			tunnel.send(data);
		});
	}
}

proxysession.create = function (info, sock) {
	var ps = new proxysession(info, sock);
	ps.proxy();
};

module.exports = proxysession;
