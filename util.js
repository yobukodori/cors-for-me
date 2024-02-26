const utilData = {};

function parseUrls(strUrls)
{
	var urls = [];
	if (typeof strUrls === "string" && strUrls){
		var ar = strUrls.split(",");
		for (var i = 0 ; i < ar.length ; i++){
			var url = ar[i].trim();
			if (url)
				urls.push(url);
		}
	}
	return urls;
}

function onPrefersColorSchemeDarkChange(ev){
	if (utilData.colorScheme === "auto"){
		document.body.classList[ev.matches ? "add" : "remove"]("dark-mode");
	}
}

function setupColorScheme(colorScheme){
	utilData.colorScheme = colorScheme;
	if (colorScheme === "auto"){
		document.body.style.colorScheme = "light dark";
		document.body.classList[window.matchMedia("(prefers-color-scheme: dark)").matches ? "add" : "remove"]("dark-mode");
	}
	else {
		document.body.style.colorScheme = colorScheme;
		document.body.classList[colorScheme === "dark" ? "add" : "remove"]("dark-mode");
	}
}
