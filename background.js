let my = {
	os : "n/a", // mac|win|android|cros|linux|openbsd
	defaultTitle: "CORS for Me",
	initialized: null,
	enableAtStartup: false,
	enabled : false,
	debug: false,
	requests : {},
	appliedUrls: "",
	filterUrls: [],
	filterTypes: ["xmlhttprequest"],
	userAgent: "",
	requestCounter: 0,
	appliedCounter: 0,
	uaCounter: 0,
	//====================================================
	init : function(platformInfo)
	{
		my.initialized = new Promise((resolve, reject)=>{
			try {
				let man = browser.runtime.getManifest();
				if (man.browser_action && man.browser_action.default_title)
					my.defaultTitle = man.browser_action.default_title;
				my.os = platformInfo.os;

				browser.browserAction.onClicked.addListener(function(){
					my.toggle();
				});
				my.updateButton();
				browser.runtime.onMessage.addListener(my.onMessage);

				browser.storage.sync.get(["enableAtStartup","printDebugInfo","appliedUrls","userAgent"])
				.then((pref) => {
					my.updateSettings(pref, pref.enableAtStartup);
					resolve();
				})
				.catch(err=>{
					reject(err);
				});
			}
			catch(e){
				reject(e.message);
			}
		});
	},
	//====================================================
	updateSettings : function(pref, fEnable)
	{
		my.enableAtStartup = pref.enableAtStartup || false;
		my.debug = pref.printDebugInfo || false;
		if (typeof pref.userAgent === "string"){
			if (pref.userAgent !== my.userAgent){
				my.userAgent = pref.userAgent;
				my.log('userAgent changed "'+my.userAgent+'"');
			}
		}
		if (typeof pref.appliedUrls === "string"){
			if (pref.appliedUrls !== my.appliedUrls){
				 my.appliedUrls = pref.appliedUrls;
				let prev_enabled = my.enabled;
				if (my.enabled)
					my.toggle(false);
				my.filterUrls = parseUrls(my.appliedUrls);
				if (my.filterUrls.length > 0){
					if (prev_enabled || fEnable)
						my.toggle(true);
				}
				my.log("urls changed ["+my.filterUrls+"]");
			}
		}
	},
	//====================================================
	log : function(str)
	{
		browser.runtime.sendMessage({type:"log",str:str}).catch(err=>{});
	},
	//====================================================
	onMessage : function(message, sender, sendResponse)
	{
		if (message.type === "getStatus"){
			browser.runtime.sendMessage({
				type: "status",
				"status": {
					enabled: my.enabled,
					debug: my.debug,
					appliedUrls: my.appliedUrls,
					userAgent: my.userAgent,
					filterUrls: my.filterUrls,
					requestCounter: my.requestCounter,
					appliedCounter: my.appliedCounter,
					uaCounter: my.uaCounter
				}
			});
		}
		else if (message.type === "getSettings"){
			if (my.initialized){
				my.initialized.then(()=>{
					sendResponse({
						enableAtStartup: my.enableAtStartup,
						printDebugInfo: my.debug,
						appliedUrls: my.appliedUrls,
						userAgent: my.userAgent
					});
				})
				.catch(err=>{
					sendResponse({
						error: err,
					});
				});
				return true;
			}
			else {
				sendResponse({
					error: "background.js has not been initialized yet.",
				});
			}
		}
		else if (message.type === "updateSettings"){
			my.updateSettings(message.pref);
		}
		else if (message.type === "toggle"){
			my.toggle();
		}
		else if (message.type === "getEnabled"){
			sendResponse({
				enabled: my.enabled,
				canEnable: my.filterUrls.length > 0,
			});
		}
	},
	//====================================================
	toggle : function(state) 
	{
		if (typeof state === 'boolean') {
			my.enabled = state;
		}
		else {
			if (my.enabled = ! my.enabled){
				if (my.filterUrls.length === 0){
					my.enabled = false;
					my.log("Error: No URL applied");
					return;
				}
			}
		}

		my.updateButton();
		my.requests = {};
		if(my.enabled) {
			browser.webRequest.onBeforeSendHeaders.addListener(
				my.onBeforeSendHeaders,
				{urls: my.filterUrls, types: my.filterTypes},
				["blocking" ,"requestHeaders"]
			);
			browser.webRequest.onHeadersReceived.addListener(
				my.onHeadersReceived,
				{urls: my.filterUrls, types: my.filterTypes},
				["blocking" ,"responseHeaders"]
			);
		}
		else {
			browser.webRequest.onBeforeSendHeaders.removeListener(
				my.onBeforeSendHeaders
			);
			browser.webRequest.onHeadersReceived.removeListener(
				my.onHeadersReceived
			);
		}
		browser.runtime.sendMessage({type:"statusChange", enabled:my.enabled }).catch(e=>{});
	},
	//====================================================
	updateButton : function()
	{
		let buttonStatus = my.enabled ? 'on' : 'off';
		if (browser.browserAction.setIcon !== undefined)
			browser.browserAction.setIcon({path:{48:'icons/button-48-'+buttonStatus+'.png'}});
		if (browser.browserAction.setTitle !== undefined)
			browser.browserAction.setTitle({title: my.defaultTitle + " ("+buttonStatus+")"});
	},
	//====================================================
	onBeforeSendHeaders : function(request)
	{
		my.requestCounter++;
		if (my.debug) my.log("[reQ] " + request.url);
		
		let ua_changed = false;
		let cors = {
			"origin": null,
			"access-control-request-method": null,
			"access-control-request-headers": null
		};
		for (let i = 0 ; i < request.requestHeaders.length ; i++){
			let header = request.requestHeaders[i], name = header.name.toLowerCase();
			if (typeof cors[name] !== "undefined"){
				cors[name] = header.value;
				if (my.debug) my.log("[reQ] " + header.name + ": " + header.value);
			}
			else if (my.userAgent && name === "user-agent"){
				request.requestHeaders[i].value = my.userAgent;
				ua_changed = true;
			}
		}
		if (! cors.origin){
			if (my.debug) my.log("[reQ] no origin");
			return;
		}
		
		my.appliedCounter++;
		my.requests[request.requestId] = cors;

		if (ua_changed){
			++my.uaCounter;
			if (my.debug) my.log("[reQ] ua changed to " + my.userAgent);
			return {requestHeaders: request.requestHeaders};
		}
	},
	//====================================================
	onHeadersReceived : function(response) 
	{
		let req = my.requests[response.requestId];
		if (! req)
			return;
		if (my.debug) my.log("[reS] " + response.url);
		let cors = {
			"access-control-allow-origin": -1,
			"access-control-allow-credentials": -1,
			"access-control-expose-headers": -1,
			"access-control-max-age": -1,
			"access-control-allow-methods": -1,
			"access-control-allow-headers": -1,
			"vary": -1
		};
		for (let i = 0 ; i < response.responseHeaders.length ; i++){
			let header = response.responseHeaders[i], name = header.name.toLowerCase();
			if (typeof cors[name] !== "undefined"){
				cors[name] = i;
				if (my.debug) my.log("[reS] " + header.name + ": " + header.value);
			}
		}
		let modified, name, value, header;
		name = "access-control-allow-origin";
		if (cors[name] === -1){
			header = {name: name, value: req.origin};
			cors[name] = response.responseHeaders.push(header) - 1;
			modified = true;
			if (my.debug) my.log("[reS] Add! " + header.name + ": " + header.value);
			name = "vary";
			if (cors[name] === -1){
				header = {name: name, value: "origin"};
				cors[name] = response.responseHeaders.push(header) - 1;
				if (my.debug) my.log("[reS] Add! " + header.name + ": " + header.value);
			}
			else {
				header = response.responseHeaders[cors[name]];
				header.value += ", origin";
				if (my.debug) my.log("[reS] Mod! " + header.name + ": " + header.value);
			}
		}
		name = "access-control-allow-credentials";
		if (cors[name] === -1){
			header = {name: name, value: "true"};
			cors[name] = response.responseHeaders.push(header) - 1;
			modified = true;
			if (my.debug) my.log("[reS] Add! " + header.name + ": " + header.value);
		}
		name = "access-control-allow-methods";
		if (cors[name] === -1){
			if (value = req["access-control-request-method"]){
				header = {name: name, value: value};
				cors[name] = response.responseHeaders.push(header) - 1;
				modified = true;
				if (my.debug) my.log("[reS] Add! " + header.name + ": " + header.value);
			}
		}
		name = "access-control-allow-headers";
		if (cors[name] === -1){
			if (value = req["access-control-request-headers"]){
				header = {name: name, value: value};
				cors[name] = response.responseHeaders.push(header) - 1;
				modified = true;
				if (my.debug) my.log("[reS] Add! " + header.name + ": " + header.value);
			}
		}

		delete my.requests[response.requestId];
		
		if (modified){
			return {responseHeaders: response.responseHeaders};
		}
	}
};

browser.runtime.getPlatformInfo().then(my.init);
