const net = require('net');
const Configurator = require('../libs/configurator');
const defer = require('../libs/utils/defer');

(async ()=>{
    const configurator = new Configurator();
    //const conf = await configurator.updateConfiguration();
    const {port,host} = configurator.zabbixes[0];
    const client = new net.Socket();
    const timeout = defer();
    const timeoutReject = timeout.reject.bind(timeout);

    client.setTimeout(3000);
    client.on('error', timeoutReject);

    client.on('data', function(data) {
        console.log('DATA: ' + data);
        // Close the client socket completely
        client.destroy();
    });

    client.on('connect',(data)=>{
        console.log('On connect: ', data);
    });

    client.on('timeout',(data)=>{
        console.log('On timeout: ', data);
        client.destroy();
    });

    client.on('close',(data)=>{
        console.log('On close: ', data);
    });

    client.on('end',(data)=>{
        console.log('On end: ', data);
    });

    client.on('lookup',(data,two)=>{
        console.log('On lookup: ', data, two);
    });

    client.on('ready',(data)=>{
        console.log('On ready: ', data);
    });

    const i = setTimeout(timeoutReject, 5000);

    try{
        /*
            const connect = client.connect(port, host, ()=>{
                console.log("Connected successfully!");
                client.write('Test!');
            });
        */
        let connect = new Promise((resolve) => client.connect(this.port, this.host, resolve));
        try{
            await Promise.race([connect, timeout]);
        }catch(e){
            console.error("Exception on connecting Zabbix Server: ",e);
        }
    }finally {
      clearTimeout(i);
      client.destroy();
    }
    
    /*
    const client = new net.createConnection({port, host: host},(one,two)=>{
        console.log("Connected successfully!",one,two);
        client.write('Test!');
    });*/
    
})()
    