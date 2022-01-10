// if (getCookie("grass-enabled") == "true") document.documentElement.style.setProperty("--grass-visibility", "block");
console.log('%c⚠️⚠️Be careful pasting in code here, someone might want to steal your information!⚠️⚠️', 'color: red; font-size: 30px;');

function contrastTextColor(bgColor, lightColor, darkColor){
	let color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
	let r = parseInt(color.substring(0, 2), 16);
	let g = parseInt(color.substring(2, 4), 16);
	let b = parseInt(color.substring(4, 6), 16);
	let uicolors = [r / 255, g / 255, b / 255];
	let c = uicolors.map(function(col){
		return (col <= 0.03928) ? col / 12.92 : Math.pow(((col + 0.055) / 1.055), 2.4);
	});
	let L = (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
	return (L > 0.179) ? darkColor : lightColor;

}

function getColor() {
	return "hsl(" + 360 * Math.random() + ',' +
		(25 + 70 * Math.random()) + '%,' +
		(85 + 10 * Math.random()) + '%)'
}


// let bgColor = "#"+Math.floor(Math.random() * 16777215).toString(16);;
const bgColor = getColor();
document.querySelector(":root").style.setProperty("--next-question-color", bgColor);