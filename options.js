let dummy_log_cleared;

function log(s)
{
	let e = document.createElement("span");
	e.innerText = s;
	e.appendChild(document.createElement("br"));
	if (/^error:/i.test(s))
		e.className = "error";
	else if (/^warning:/i.test(s))
		e.className = "warning";
	let log = document.querySelector('#log');
	if (! dummy_log_cleared){
		log.innerHTML = "";
		log.appendChild(document.createElement("span"));
		dummy_log_cleared = true;
	}
	log.insertBefore(e, log.firstElementChild);
}

function applySettings(fSave)
{
	let appliedUrls = document.querySelector('#appliedUrls').value;
	appliedUrls = appliedUrls.trim().replace(/\s+/g, ' ');
	let error, urls =  [];
	if (appliedUrls){
		urls =  parseUrls(appliedUrls);
		if (urls.length == 0){
			log("error: no url found in '" + appliedUrls + "'");
			return;
		}
	}
	let userAgent = document.querySelector('#userAgent').value;
	userAgent = userAgent.trim().replace(/\s+/g, ' ');
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
	e.innerText = fEnabled ? "Off (Now On)" : "On (Now Off)";
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
		let e = document.querySelectorAll("form, form input, form textarea, form button, #log");
		for (let i = 0 ; i < e.length ; i++){
			e[i].classList.add("mobile");
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
