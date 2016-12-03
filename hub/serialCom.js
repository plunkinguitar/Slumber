var net = require('net');
var basics = require('./basics')
var wifi = require('node-wifi');
var exports = module.exports = {};
var sys = require('sys')
var exec = require('child_process').exec;

var PORT = 3005;
var host = "127.0.0.1";

var currentWifi = "";

var client = new net.Socket();

wifi.init({
    debug: false,
    iface: null
});


client.connect(PORT, host, function() {
    console.log('Connected to {}:{}'.format(host, PORT));
})

client.on('data', function(data){
    try{
        data = JSON.parse(data.toString());
        console.log(data);
    } catch(err) {
        console.log(err);
        console.log(data.toString());
        client.write(JSON.stringify({
            response: "JSONPARSE", 
            data: {
                error: "JSON parse error"
            }
        }));
    }
    var response = {};
    // Get wifi list
    if (data.exec == "getWifi") {
        var curWifi = "";
        console.log("Getting wifi");
        exec("nmcli d wifi list | awk '{if($10==\'yes\')$1}'", function(err, stdout, stderr) {
            console.log(stdout);
            curWifi = stdout;
            wifi.scan(function(err, networks) {
                if (err) {
                    response = {
                        response: "getWifi",
                        data: {
                            error: err
                        }
                    }
                } else {
                    var netNames = [];
                    networks.forEach(function(item) {
                        if (netNames.indexOf(item.ssid) == -1) {
                            netNames.push(item.ssid);
                        }
                    })
                    var newNets = [];
                    console.log("NETWORKS: "+netNames);
                    response = {
                        response: "getWifi",
                        data: {
                            APs: networks,
                            connected: curWifi
                        }
                    }
                }
                client.write(JSON.stringify(response));
            });
        });
    // Connect to wifi
    } else if (data.exec == "connectWifi") {
        console.log("Connecting to wifi");
        var connected = 0;
        if (data.data.ssid.length > 0) {
            wifi.connect({ssid: data.data.ssid, password: data.data.password}, function(err) {
                if (!err) {
                    connected = 1;
                    console.log("Connected to wifi");
                } else {
                    console.log("ERROR "+err);
                    connected = 2;
                }
                response = {
                    response: "connectWifi",
                    data: {
                        connected: connected
                    }
                }
                client.write(JSON.stringify(response));

            });
        }
            } else if (data.exec == "test") {
        console.log("Error packet");
    } else {
        console.log("Unknown command");
        response = {
            response: data.exec,
            data: {
                error: "Unknown error/command"
            }
        }
    }
});

client.on('close', function() {
    console.log("Closed Connection")
    process.exit();
});

exports.sendData = function(data) {
    data = JSON.stringify(data);
    console.log("Sending packet that is {}bytes long".format(data.length));
    client.write(data);
}
