document.write("options.js loading<br />");

let dummy_log_cleared;

function log(s)
{
	let style, html = s.replace(/</g, "&lt;");
	if (/^error:/i.test(s))
		style = "background-color:pink;font-weight:bold;";
	else if (/^warning:/i.test(s))
		style = "background-color:yellow;";
	if (style)
		html = '<span style="' + style + '">' + html + "</span>";
	let e = document.querySelector('#log');
	if (! dummy_log_cleared){
		e.innerHTML = "";
		dummy_log_cleared = true;
	}
	e.innerHTML =  (new Date()).toLocaleString()+" "+html + "<br/>" + e.innerHTML;
}

function applySettings(fSave)
{
	let appliedUrls = document.querySelector('#appliedUrls').value;
	let error, urls =  [];
	if (appliedUrls){
		urls =  parseUrls(appliedUrls);
		if (urls.length == 0){
			log("error: no url found in '" + appliedUrls + "'");
			return;
		}
	}
	let userAgent = document.querySelector('#userAgent').value;
	let pref = {
		enableAtStartup : document.querySelector('#enableAtStartup').checked,
		printDebugInfo : document.querySelector('#printDebugInfo').checked,
		appliedUrls : appliedUrls,
		userAgent: userAgent
	};
	if (urls.length == 0)
		log("warning: no url.");
	if (fSave){
		browser.storage.sync.set(pref);
		log("Settings saved.");
	}
	log("Apllying settings.");
	browser.runtime.sendMessage({type:"updateSettings",pref:pref});
}

function onSubmit(e) {
	applySettings(true);
	e.preventDefault();
}

let g_is_android = navigator.userAgent.indexOf('Android') > 0, g_is_pc = ! g_is_android;

function onStatusChange(fEnabled)
{
	let e = document.querySelector('#toggle');
	e.className = (fEnabled ? "on" : "off") + (g_is_android ? " mobile" : "");
	e.innerHTML = fEnabled ? "Off" : "On";
}

function onMessage(m, sender, sendResponse)
{
	if (m.type === "log"){
		log(m.str);
	}
	else if (m.type === "status"){
		let s = m["status"];
		log("enabled: "+s.enabled+", urls: ["+s.filterUrls+"],  request: "+s.requestCounter+", applied: "+s.appliedCounter+", ua-changed: "+s.uaCounter);
		onStatusChange(s.enabled);
	}
	else if (m.type === "statusChange"){
		onStatusChange(m.enabled);
		log(m.enabled ? "Enabled" : "Disabled");
	}
}

function getBackgroundStatus()
{
	browser.runtime.sendMessage({type: "getStatus"});
}

function onDOMContentLoaded()
{
	//document.querySelector("#log").innerHTML = "";
	getBackgroundStatus();
	document.querySelector('#getStatus').onclick = function (){
		getBackgroundStatus();
	};
	document.querySelector('#apply').onclick = function (){
		applySettings();
	};
	document.querySelector('#toggle').onclick = function (){
		browser.runtime.sendMessage({type: "toggle"});
	};
	if (g_is_android){
		let e = document.querySelectorAll("form, form input, form button, #log");
		for (let i = 0 ; i < e.length ; i++){
			let cn = e[i].className;
			if (typeof cn !== "string")
				cn = "";
			e[i].className = cn + " mobile";
		}
	}
	
    let prefs = browser.storage.sync.get(
		['enableAtStartup','printDebugInfo','appliedUrls','userAgent']);
    prefs.then((pref) => {
        document.querySelector('#enableAtStartup').checked = pref.enableAtStartup || false;
        document.querySelector('#printDebugInfo').checked = pref.printDebugInfo || false;
		if (typeof pref.appliedUrls === "string")
			document.querySelector('#appliedUrls').value = pref.appliedUrls;
		if (typeof pref.userAgent === "string")
			document.querySelector('#userAgent').value = pref.userAgent;
    });
}

document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
document.querySelector('form').addEventListener('submit', onSubmit);
browser.runtime.onMessage.addListener(onMessage);

document.write("options.js loaded<br />");