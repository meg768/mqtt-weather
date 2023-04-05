#!/usr/bin/env node



const config = require('./config.json')




class App {

    constructor(debug = true) {
        this.debug = console.log;
        this.log = console.log;
        this.mqtt = undefined;
        this.config = config;
        this.cache = {};
    }

	async connect() {
        let MQTT = require('mqtt');


		return new Promise((resolve, reject) => {
			this.mqtt = MQTT.connect(this.config.mqtt.host, {username:this.config.mqtt.username, password:this.config.mqtt.password, port:this.config.mqtt.port});
				
			this.mqtt.on('connect', () => {
				this.debug(`Connected to host ${this.config.mqtt.host}:${this.config.mqtt.port}.`);
				resolve();
			});		
	
		});
	}

    publish(topic, value) {

        if (typeof(value) != 'string')
            value = JSON.stringify(value)
        
        if (this.cache[value] == undefined)
            this.mqtt.publish(`Weather/${topic}`, value, {retain:true});
        
        this.cache[value] = value;
    }

    async publishWeather() {

        var sprintf = require('yow/sprintf');
        var Request = require('yow/request');
    
        var request = new Request('http://api.openweathermap.org');
    
        var query = {};
        query.appid   = config.openweathermap.appid;
        query.lat     = config.openweathermap.latitude;
        query.lon     = config.openweathermap.longitude;
        query.exclude = 'minutely,hourly';
        query.units   = 'metric';
        query.lang    = 'se';
    
        let response = await request.get('/data/2.5/onecall', {query:query});

        response.body.current.dt = new Date(response.body.current.dt * 1000);
        response.body.current.sunset = new Date(response.body.current.sunset * 1000);
        response.body.current.sunrise = new Date(response.body.current.sunrise * 1000);

        this.debug(`Current ${response.body.current}`);
        this.debug(`Tomorrow ${response.body.daily[1]}`);

        var current  = response.body.current;
        var tomorrow = response.body.daily[1];

        this.publish('Today', sprintf('Just nu %d° och %s', Math.round(current.temp + 0.5), current.weather[0].description));
        this.publish('Tomorrow', sprintf('I morgon %d° (%d°) och %s', Math.round(tomorrow.temp.max + 0.5), Math.round(tomorrow.temp.min + 0.5), tomorrow.weather[0].description));


        this.debug(sprintf('Just nu %d° och %s', Math.round(current.temp + 0.5), current.weather[0].description));
        this.debug(sprintf('I morgon %d° (%d°) och %s', Math.round(tomorrow.temp.max + 0.5), Math.round(tomorrow.temp.min + 0.5), tomorrow.weather[0].description));


        
    }

	async loop() {

        await this.publishWeather();
        
		setTimeout(this.loop.bind(this), this.config.interval * 1000 * 60);
	}

	async run() {
		try {
			await this.connect();
			await this.loop();
	
		}
		catch(error) {
			this.log(error.stack);
			process.exit(-1);

		}

	}

}


new App().run()