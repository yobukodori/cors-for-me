function alert(msg){
	const id = "alert";
	let e = document.getElementById(id);
	if(! e){
		e = document.createElement("div");
		e.id = id;
		document.addEventListener("click", ev=> e.remove());
		document.body.appendChild(e);
	}
	let m = document.createElement("div");
	m.classList.add("message");
	msg.split("\n").forEach((line,i) =>{
		if (i > 0){ m.appendChild(document.createElement("br")); }
		let span = document.createElement("span");
		span.appendChild(document.createTextNode(line));
		m.appendChild(span);
	});
	e.appendChild(m);
}

let dummy_log_cleared;

function log(s)
{
	let log = document.querySelector('#log');
	if (! dummy_log_cleared){
		log.innerHTML = "";
		log.appendChild(document.createElement("span"));
		dummy_log_cleared = true;
	}
	if (! (s = s.replace(/\s+$/, ""))){
		return;
	}
	let className = /^error\b/i.test(s) ? "error" : /^warning\b/i.test(s) ? "warning" : "";
	let a = s.split("\n");
	for (let i = a.length - 1 ; i >= 0 ; i--){
		let s = a[i].replace(/\s+$/, "");
		let e = document.createElement("span");
		let col = 0, indent = 0;
		while (s[0] === '\t' || s[0] === ' '){
			indent += s[0] === ' ' ? 1 : col === 0 ? 4 : (4 - col % 4);
			s = s.substring(1);
		}
		e.appendChild(document.createTextNode((indent > 0 ? "\u00A0".repeat(indent) : "") + s));
		e.appendChild(document.createElement("br"));
		if (className){ e.classList.add(className); }
		log.insertBefore(e, log.firstElementChild);
	}
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
	e.className = (fEnabled ? "on" : "off") + " " + (g_is_pc ? "pc" : "mobile");
	e.innerText = fEnabled ? "Off (Now On)" : "On (Now Off)";
}

function onMessage(m, sender, sendResponse)
{
	if (m.type === "log"){
		log(m.str);
	}
	else if (m.type === "status"){
		let s = m["status"];
		log("enabled:" + s.enabled + " debug:" + s.debug + " request:" + s.requestCounter
			+" applied:" + s.appliedCounter + " ua-changed:" + s.uaCounter + "\n"
			+ "appliedUrls: "+s.appliedUrls+"\n"
			+ "userAgent: "+s.userAgent
		);
		onStatusChange(s.enabled);
	}
	else if (m.type === "statusChange"){
		onStatusChange(m.enabled);
		log(m.enabled ? "Enabled" : "Disabled");
	}
}

function getBackgroundStatus()
{
	browser.runtime.sendMessage({type: "getStatus"})
	.catch(err=>log("Error on sendMessage: " + err));
}

function onDOMContentLoaded()
{
	getBackgroundStatus();
	document.querySelector('#save').addEventListener('click', ev=>{
		applySettings(true);
	});
	document.querySelector('#apply').onclick = function (){
		applySettings();
	};
	document.querySelector('#getStatus').onclick = function (){
		getBackgroundStatus();
	};
	document.querySelector('#toggle').onclick = function (){
		browser.runtime.sendMessage({type: "toggle"});
	};

	let e = document.querySelectorAll(".main, input, textarea, button, #log");
	for (let i = 0 ; i < e.length ; i++){
		e[i].classList.add(g_is_pc ? "pc" : "mobile");
	}
	
	browser.runtime.sendMessage({type: "getSettings"})
	.then(v=>{
		if (v.error){
			alert("Error on getSettings: " + v.error);
		}
		else {
			document.querySelector('#enableAtStartup').checked = v.enableAtStartup;
			document.querySelector('#printDebugInfo').checked = v.printDebugInfo;
			document.querySelector('#appliedUrls').value = v.appliedUrls;
			document.querySelector('#userAgent').value = v.userAgent;
		}
	})
	.catch(err=>{
		alert("Error on sendMessage('getSettings'): " + err);
	});
}

document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
browser.runtime.onMessage.addListener(onMessage);
