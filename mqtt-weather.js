#!/usr/bin/env node


require('yow/prefixConsole')();


class App {

    constructor(debug = true) {
        this.debug = console.log;
        this.log = console.log;
        this.mqtt = undefined;
        this.config = require('./config.json');
        this.debug = this.config.debug ? this.log : () => {};

    }


    async publish(topic, value) {

//        if (typeof(value) != 'string')
            value = JSON.stringify(value)
        
        await this.mqtt.publish(`${this.config.topic}/${topic}`, value, {retain:true});
        
    }

    async publishWeather() {

        var sprintf = require('yow/sprintf');
        var Request = require('yow/request');
    
        var request = new Request('http://api.openweathermap.org');
    
        var query = {};
        query.appid   = this.config.openweathermap.appid;
        query.lat     = this.config.openweathermap.latitude;
        query.lon     = this.config.openweathermap.longitude;
        query.exclude = 'minutely,hourly';
        query.units   = 'metric';
        query.lang    = 'se';
    
        let response = await request.get('/data/2.5/onecall', {query:query});

        response.body.current.dt = new Date(response.body.current.dt * 1000);
        response.body.current.sunset = new Date(response.body.current.sunset * 1000);
        response.body.current.sunrise = new Date(response.body.current.sunrise * 1000);

        var current  = response.body.current;
        var tomorrow = response.body.daily[1];
        var dayAfterTomorrow = response.body.daily[2];

        var currentWeather = sprintf('Just nu %d° och %s.', Math.round(current.temp + 0.5), current.weather[0].description);
        var tommorowsWeather = sprintf('I morgon %d° (%d°) och %s.', Math.round(tomorrow.temp.max + 0.5), Math.round(tomorrow.temp.min + 0.5), tomorrow.weather[0].description);
        var dayAfterTommorowsWeather = sprintf('I övermorgon %d° (%d°) och %s.', Math.round(dayAfterTomorrow.temp.max + 0.5), Math.round(dayAfterTomorrow.temp.min + 0.5), dayAfterTomorrow.weather[0].description);

        var summary = sprintf('%s %s %s', currentWeather, tommorowsWeather, dayAfterTommorowsWeather);

        await this.publish('summary', summary);
        await this.publish('daily', response.body.daily);
        await this.publish('current', current);

        this.debug(summary);


        
    }

	async loop() {

        await this.publishWeather();
        
		setTimeout(this.loop.bind(this), this.config.interval * 1000 * 60);
	}

	async run() {
        let Mqtt = require('mqtt');
        let MqttAsync = require('mqtt-async');
        let MqttCache = require('mqtt-cache');

		try {

			this.mqtt = MqttCache(MqttAsync(Mqtt.connect(this.config.mqtt.host, {username:this.config.mqtt.username, password:this.config.mqtt.password, port:this.config.port})));
					
			this.mqtt.on('connect', () => {
				this.debug(`Connected to host ${this.config.mqtt.host}:${this.config.mqtt.port}.`);
			});            

            await this.loop();
	
		}
		catch(error) {
			this.log(error.stack);
			process.exit(-1);

		}

	}

}


new App().run()