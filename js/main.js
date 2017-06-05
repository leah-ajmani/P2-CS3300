	// hide page
$(".container").hide();


// DIMENSIONS FOR LINE CHART
var widthLC = 600;
var heightLC = 400;
var paddingLC = 70;

// DIMENSINOS FOR BAR CHART
var widthBC = 280;
var heightBC = 400;
var paddingBC =70;

//DIMENSIONS FOR CORRELATION CHARTS
var widthCC = 600;
var heightCC = 400;
var paddingCC = 70;


var lineChart = d3.select('#line-chart');
lineChart.attr("width",widthLC)
	.attr("height",heightLC);

var barChart = d3.select('#bar-chart');
barChart.attr("width",widthBC - 170)
	.attr("height",heightBC);

/********************DATA PARSING*************************************/
var parseTime = d3.timeParse('%Y');
function parseCarRow(r){
	var toReturn = {};
	for(var prop in r){
		if(prop != 'Year'){
			toReturn[prop] = Number(r[prop]);
		}
	}
	toReturn['Year'] = parseTime(r.Year);
	return toReturn;
}

function parseSalesRow(d){
	return {
		Year: parseTime(d.Year),
		Value: +d.Value
	};
}

function parseMentionRow(d){
	return {
		Name: d['Song Name'],
		Lyric: parseLyric(d['Lyric'], d['Artist'], d['Year']),
		Artist: d['Artist'],
		Year: parseTime(d['Year']),
		Brand: d['Car Brand']
	};
}

function parseLyric(l, artist, year){
	var lineBreaks = l.replace(/\//, '<br>')
	var replacement = lineBreaks.replace('_', " ");
	return replacement += '<br> - ' + artist + " (" + year + ")"
}

//Keeps all of the percent change data indexed by car brand name
//(e.g., valueData['Mercedes Benz'] returns the percent change data for
//Mercedes Benz)
var valueData = {};

//Keeps all of the frequency data indexed by car brand name
//(e.g., valueData['Mercedes Benz'] returns the number of times
//Mercedes Benz was mentioned in rap lyrics
var freqData = {};

//Keeps all of the lyric data
var interestingPoints = [];

function initData(error, carData, dowData, mentionData){
	valueData['DOW'] = dowData;
	carData.forEach(function(d){
		for(var prop in d){
			if(prop != 'Year'){
				if(prop.includes('Frequency')){
					if(!freqData.hasOwnProperty(prop))
						freqData[prop] = [];
					freqData[prop].push({
						Year: d.Year,
						Value: d[prop]
					});
				}
				else{
					if(!valueData.hasOwnProperty(prop))
						valueData[prop] = [];
					valueData[prop].push({
						Year: d.Year,
						Value: d[prop]
					});
				}
			}
		}
	});

	mentionData.forEach(function(d){
		interestingPoints.push(d);
	})
}

/******************FIRST LINE CHART******************************/
//X and Y scales
var lineX, lineY;
//Keeps track of lines that should "stick" to the plot area
var toPlot = ["DOW"];

//Color scale for the first chart
var linePlotColorScale = d3.scaleOrdinal()
							.domain(Object.keys(valueData))
							.range(d3.schemeCategory20);

//Initializes the chart with a graph of DOW
function start(){
	lineChart.selectAll('*').remove();
	toPlot = ["DOW"];
	graphDow();
	initBarChart();
}


//Graphs DOW average in the US
function graphDow(){
	dowData = valueData['DOW'];
	//Initialize axes
	lineX = d3.scaleTime()
					.domain(d3.extent(dowData, function(d){return d.Year;}))
					.rangeRound([paddingLC,widthLC-paddingLC]);
	lineY = d3.scaleLinear()
					.domain([-50,300])
					.rangeRound([heightLC-paddingLC,paddingLC]);

	//Path generator for line plot of dow over time				
	var line = d3.line()
		.curve(d3.curveBasis)
	    .x(function(d) { return lineX(d.Year); })
	    .y(function(d) { return lineY(d.Value); });

	//Draws line plot
	lineChart.append("path")
		      .datum(dowData)
		      .attr("fill", "none")
		      .attr("stroke", "#3498db")
		      .attr("stroke-linejoin", "round")
		      .attr("stroke-linecap", "round")
		      .attr("stroke-width", 5)
		      .attr("d", line)
		      .attr('id', 'Dow')
		      .attr('onmouseover', "displayName(this.id)")
			  .attr('onmouseout', "removeName(this.id)");
	
	//Draws axes	      
	lineChart.append("g")
    .attr("transform", "translate(0,"+(heightLC-paddingLC)+")")
    .call(d3.axisBottom(lineX))

	lineChart.append("g")
		.attr("transform", "translate("+(paddingLC)+",0)")
    .call(d3.axisLeft(lineY))

  // Label axes
  lineChart.append("text")
		.attr("x", (widthLC-20) * 0.5)
		.attr("y", heightLC - paddingLC/4)
		.text("Year");
	lineChart.append("text")
		.attr("transform", "rotate(270) translate(-250, " + paddingLC/2.5 + ")")
		.text("Percent Change");
	lineChart.append("text")
		.attr("x", paddingLC*1.4)
		.attr("y", paddingLC/2)
		.style("font-weight","bold")
		.style("font-size",12);

	//Title	
	lineChart.append("text")
		.attr("x", paddingLC*1.7)
		.attr("y", paddingLC/2)
		.text("Percent Change in DOW and Rap Mentions Over Time")
		.style("font-weight","bold");

}

//Plots and updates list of variables that should
//stick to plot area
function plotAll(currVar, is_clicked){
	//Clear the chart area
	lineChart.selectAll('*').remove();
	//Decide whether to "stick" plot or "destick" plot
	if(is_clicked){
		//Clear lines when DOW is selected
		if(currVar == "DOW"){
			//Reset transperencies
			d3.selectAll(".barOverlay")
				.attr('class', 'barOverlay opHigh');
			d3.select("#dowOverlay")
				.attr('class', 'barOverlay opLow')
			toPlot = ["DOW"];
		}
		else{
			if(toPlot.includes(currVar)){
				var index = toPlot.indexOf(currVar);
				toPlot.splice(index, 1);
			}
			else{
				toPlot.push(currVar);
			}
		}
	}
	//User hovered over variable
	else{
		plotLine(currVar);
	}
	
	//Plot every sticky variable
	toPlot.forEach(function(p){
		if(p == "DOW"){
			graphDow();
		}
		else{
				plotLine(p);
		}
	})
}

//Creats an array of point pairs based on the
//d attribute of a path
//inspired by: http://stackoverflow.com/questions/25384052/convert-svg-path-d-attribute-to-a-array-of-points
//Necessary because of the curves in the paths
function pathToPointList(path){
	var points = path.split(/(?=[LMC])/);
	var pairsArray = [];
	var pointArrays = points.map(function(d){
	    var pointsArray = d.slice(1, d.length).split(',');
	    for(var i = 0; i < pointsArray.length; i += 2){
	        pairsArray.push([+pointsArray[i], +pointsArray[i+1]]);
	    }
	});
	return pairsArray;
}

//Find any point in [pointsArray] that are plotted
//in reference to [year]
function findPointByYear(year, pointsArray){
	var matchingPoints = pointsArray.filter(function(p){
		return lineX(year) == p[0];
	});
	return matchingPoints[0];
}

//Displays rap quote above line plot
function showRapQuote(d){
	document.getElementById('rap_quote').innerHTML = d;
}

//Creates interesting circle points for [varName] based on
//car mentions data
function plotInterestingPoints(varName, path){
	//Get all points on the line
	var points = pathToPointList(path);
	var varData = valueData[varName];
	//Find the points that match the brand we're looking for
	var circlePoints = interestingPoints.filter(function(p){
							return p.Brand == varName;
						});
	//Plot the necessary circles
	circlePoints.forEach(function(d){
		var index = d.Year - 1993;
		var plotPoint = findPointByYear(d.Year, points);
		if(plotPoint != undefined){
			var xPos = plotPoint[0];
			var yPos = plotPoint[1];
			lineChart.append('circle')
					.attr('r', 5)
					.attr('fill', linePlotColorScale(d.Brand))
					.attr('transform', 'translate(' + xPos + ',' + yPos+')')
					.attr('onmouseover','showRapQuote("' + d.Lyric + '")')
					.attr('id', 'interesting'+varName)
					.attr('class', 'interesting');
		}


	});
}

//Removes the text box that appears when a line
//is hovered over
function removeName(varName){
	d3.select('#text'+varName).remove();
}

//Displays a text box with [varname] when a line is
//hovered over
function displayName(varName){
	// console.log('displaying');
	var line = document.getElementById(varName);
	// console.log(line);
	var totalLength = line.getTotalLength();
	var endpoint = line.getPointAtLength(totalLength);
	lineChart.append('text')
			.attr('x', widthLC/2)
			.attr('y', 110)
			.attr('id', 'text'+varName)
			.attr('text-anchor','middle')
			.attr('alignment-baseline','middle')
			.text(varName)
			.style("font-size",20)
			.style("opacity",0.5);
}

//Graphs [varName] over time to the main line chart
function plotLine(varName){
	if(varName == 'DOW'){
		return;
	}
	//Get relevant data
	var varData = valueData[varName];
	//Generate path based on data
	var line = d3.line()
		.curve(d3.curveBasis)
	    .x(function(d) { return lineX(d.Year); })
	    .y(function(d) { return lineY(d.Value); });
	//Plot path
	var dataLine = lineChart.append("path")
			      .datum(varData)
			      .attr("fill", "none")
			      .attr("stroke", linePlotColorScale(varName))
			      .attr("stroke-linejoin", "round")
			      .attr("stroke-linecap", "round")
			      .attr("stroke-width", 3.5)
			      .attr("stroke-opacity", .7)
			      .attr('id', varName)
			      .attr('onmouseover', "displayName('"+varName+"')")
			      .attr('onmouseout', "removeName('"+varName+"')")
			      .attr("d", line);

	plotInterestingPoints(varName, line(varData));

	//Draw axes
	lineChart.append("text")
		.attr("x", paddingLC*1.7)
		.attr("y", paddingLC/2)
		.text("Percent Change in DOW and Rap Mentions Over Time")
		.style("font-weight","bold");
}

function removePlot(varName){
	if(!toPlot.includes(varName)){
		lineChart.select('#'+varName).remove();
		lineChart.selectAll(('#interesting'+varName)).remove();
	}
}


/**********IINTERACTIVE BAR CHART (USED TO BE PERCENT CHANGE BAR CHART*************/

//Plots bars based on growth rate for [year]
function createBarChart(){
	// console.log(valueData.length);
	var heightScale = d3.scaleLinear()
						.domain([0,Object.keys(valueData).length-1])
						.range([heightBC-paddingBC,paddingBC]);
	var i = 0;
	for(var series in valueData){
			barChart.append("text")
				.attr("x", paddingBC/2.2)
				.attr("y", heightScale(i)+4)
				.style("font-size",8)
				.style("text-shadow","0px 0px 5px rgba(255, 255, 255, 1)")
				.text(series)
			
			// bar overlay
			barChart.append('line')
				.attr('x1', 0)
				.attr('y1', heightScale(i))
				.attr('x2', widthBC)
				.attr('y2', heightScale(i))
				.attr("class",function(){
					if(series != 'DOW'){
						return 'barOverlay';
					}
					return 'barOverlay opLow';
				})
				.attr("id", function(){
					if(series == 'DOW'){
						return 'dowOverlay';
					}
				})
				.attr("onmouseover","plotAll('"+series+"'," + false + ")")
				.attr("onmouseout", "removePlot('"+series+"')")
				.attr("onclick", "plotAll('"+series+"'," + true + ");toggleOpacity(this);");

			barChart.append('circle')
				.attr('cx', paddingBC/3)
				.attr('cy', heightScale(i)+1)
				.attr('r', 5)
				.style('fill', linePlotColorScale(series));
			i = i+1;
		}
	
}

function toggleOpacity(element){
	// alert($(element).hasClass("opLow"));
	if($(element).attr('onmouseover') == "plotAll('DOW',false)"){
		return;
	}
	if($(element).hasClass("opLow")){
		$(element).removeClass("opLow");
		$(element).addClass("opHigh");
	}
	else if($(element).hasClass("opHigh")){
		$(element).removeClass("opHigh");
		$(element).addClass("opLow");
	}
	else{
		$(element).addClass("opLow");
	}
}

//Draws the midline for the bar chart
//defaults to percent change chart for 1994
function initBarChart(){
	barChart.selectAll('*').remove();
	lengthScale = d3.scaleLinear()
						.domain([-widthBC/2, widthBC/2])
						.range([0, widthBC]);
	barChart.append("line")
		.attr("x1", 14)
		.attr("y1", heightBC - paddingBC + 1)
		.attr("x2", 100)
		.attr("y2", heightBC - paddingBC + 1)
		.attr("stroke", "#ecf0f1")
		.attr("stroke-width", 13);
	createBarChart();
	barChart.append('line')
			.attr('x1', lengthScale(0))
			.attr('y1', paddingBC/1.5)
			.attr('x2', lengthScale(0))
			.attr('y2', heightBC-paddingBC/1.5)
			.style('stroke', 'black')
			.style('stroke-width', 1);
	barChart.append("text")
		.attr("x", paddingBC*.27)
		.attr("y", paddingBC/2)
		.text("Car Make");
}

/***************************CORRELATION CHART*************************************/
function dataAtYearRange(data, timeRange){
	var toReturn = [];
	data.forEach(function(d){
		if(d.Year.getFullYear() >= timeRange[0] && 
			d.Year.getFullYear() <= timeRange[1]){
			toReturn.push(d);
		}
	});
	return toReturn;
}

function plotCorLine(varName, color, yExtent){
	if(varName == "DOW"){
		graphDow();
		return;
	}

	// console.log(varName);
	var varData = dataAtYearRange(valueData[varName], [1994, 2014]);
	corX = d3.scaleTime()
					.domain([parseTime(1994), parseTime(2014)])
					.rangeRound([paddingCC, widthCC-paddingCC]);
	corY = d3.scaleLinear()
					.domain(yExtent)
					.rangeRound([heightCC-paddingCC, paddingCC]);

	var line = d3.line()
		.curve(d3.curveBasis)
	    .x(function(d) { return corX(d.Year); })
	    .y(function(d) { return corY(d.Value); });
	
	//Draw variable line plot
	lineChart.append("path")
		      .datum(varData)
		      .attr('id', varName)
		      .attr("class", "corLine")
		      .attr("fill", "none")
		      .attr("stroke", color)
		      .attr("stroke-linejoin", "round")
		      .attr("stroke-linecap", "round")
		      .attr("stroke-width", 1.5)
		      .style('stroke-dashoffset', 'this.getTotalLength()')
		      .attr("d", line);
}

//highlights DOW and [varName]
function highlight(varName){
	// console.log(varName);
	lineChart.selectAll('.corLine').attr('stroke-opacity', .2);
	lineChart.select('#'+varName)
			.attr('stroke-opacity', 1)
			.attr('stroke-width', 3);
	lineChart.select('#DOW')
			.attr('stroke-opacity', 1)
			.attr('stroke-width', 3);
}

//Resets styling of lines
function dehighlight(){
	lineChart.selectAll('.corLine')
			.attr('stroke-opacity', 1)
			.attr('stroke-width', 1.5)
}

function findYExtent(brands){
	var minimums = [];
	var maximums = [];
	var toReturn = [];
	for(var series in valueData){
		if(brands.includes(series)){
			var values = valueData[series].map(function(point){return point.Value;})
			// console.log(series)
			minimums.push(d3.min(values));
			maximums.push(d3.max(values));
			// console.log(d3.max(values));
		}
	}
	toReturn.push(d3.min(minimums));
	toReturn.push(d3.max(maximums));
	// console.log(toReturn);
	if(Math.abs(toReturn[0]) > Math.abs(toReturn[1])){
		toReturn = [-(Math.abs(toReturn[0])), Math.abs(toReturn[0])];
	}
	else{
		toReturn = [-(Math.abs(toReturn[1])), Math.abs(toReturn[1])];
	}
	return toReturn;
}

function plotPosCorrelation(){
	lineChart.selectAll('*').remove();
	var posBrands = ["DOW", "Lamborghini", "Ferrari", "Bentley"];
	var posColors = ["#3498db","#f1c40f","#e67e22","#e74c3c"];
	var yExtent = findYExtent(posBrands);
	var posColorScale = d3.scaleOrdinal()
							.domain(posBrands)
							.range(posColors);
	posBrands.forEach(function(b){
		plotCorLine(b, posColorScale(b), [-50,300]);
	});
	generateSelectionChart(posBrands, posColorScale);
	lineChart.append("text")
		.attr("x", paddingLC*1.7)
		.attr("y", paddingLC/2)
		.text("Percent Change in DOW and Rap Mentions Over Time")
		.style("font-weight","bold");
}

function plotInvCorrelation(){
	// console.log('inv correlation');
	lineChart.selectAll('*').remove();
	var invBrands = ["DOW", "Chevrolet", "Porsche", "Audi"];
	var invColors = ["#3498db","#9b59b6","#1abc9c","#34495e"];
	var yExtent = findYExtent(invBrands);
	var invColorScale = d3.scaleOrdinal()
							.domain(invBrands)
							.range(invColors);
	invBrands.forEach(function(b){
		plotCorLine(b, invColorScale(b), [-50,300]);
	});
	generateSelectionChart(invBrands, invColorScale);
	lineChart.append("text")
		.attr("x", paddingLC*1.7)
		.attr("y", paddingLC/2)
		.text("Percent Change in DOW and Rap Mentions Over Time")
		.style("font-weight","bold");

}

/*********************CORRELATION CAR SELECTOR**********************************/
function generateSelectionChart(brands, colorScale){
	barChart.selectAll('*').remove();

	var heightScale = d3.scaleLinear()
						.domain([0,brands.length-1])
						.range([heightBC-paddingBC,paddingBC]);
	brands.forEach(function(d, i){
		barChart.append("text")
					.attr("x", paddingBC/2.2)
					.attr("y", heightScale(i)+4)
					.style("font-size",8)
					.style("text-shadow","0px 0px 5px rgba(255, 255, 255, 1)")
					.text(d);
		barChart.append('line')
					.attr('x1', 0)
					.attr('y1', heightScale(i))
					.attr('x2', widthBC)
					.attr('y2', heightScale(i))
					.attr("class","barOverlay")
					.attr("onmouseover","highlight('"+d+"')")
					.attr("onmouseout", "dehighlight()");

		barChart.append('circle')
				.attr('cx', paddingBC/3)
				.attr('cy', heightScale(i)+1)
				.attr('r', 5)
				.style('fill', colorScale(d));
	});

	

	barChart.append("text")
		.attr("x", paddingBC*.27)
		.attr("y", paddingBC/2)
		.text("Car Make");
}



var q = d3.queue();

//Load files
q.defer(d3.csv, 'data/Car_Rap_Percentages.csv', parseCarRow)
	.defer(d3.csv, 'data/dow.csv', parseSalesRow)
	.defer(d3.csv, 'data/CarMentions.csv', parseMentionRow)
	.await(initData);

$(document).ready(function() {
   	$(".container").fadeIn(1000);
   	graphDow();
	initBarChart();
	var startPanel = new Waypoint({
	  element: document.getElementById('start-panel'),
	  handler: start,
	});

	//Initialize scrolling triggers
   	var posCorPanel = new Waypoint({
	  element: document.getElementById('panel1'),
	  handler: function(direction) {plotPosCorrelation();},
	  offset: '50%'
	});

	var invCorPanel = new Waypoint({
	  element: document.getElementById('panel2'),
	  handler:function(direction) {plotInvCorrelation();},
	  offset: '60%'
	});

	var scrollingUpPos = new Waypoint({
	  element: document.getElementById('panel1'),
	  handler: plotInvCorrelation,
	  offset: '-20%'
	});

	var scrollingUpInv = new Waypoint({
	  element: document.getElementById('panel2'),
	  handler:function(direction) {
	  	if(direction == 'up'){plotPosCorrelation();}
	  },
	  offset: 'bottom-in-view'
	});

});