((function () {
	// new get request to desired url
	var request = function (url, cb, conf) {
		if (!conf) conf = {};
		var config = {
			method: conf.method || "GET",
			query: conf.query || "",
			data: conf.data || null
		};
		if (!url || typeof (url) !== "string") cb("Please provide valid url");
		if (!cb) cb = function () {};

		var xhr = new XMLHttpRequest();

		xhr.open(config.method, url + "?" + config.query);

		xhr.addEventListener("load", function (ev) {
			if (ev.target.status === 200) {
				cb(undefined, ev.target.response);
			} else {
				cb("Cannot load configuration file");
			}
		});
		xhr.addEventListener("error", function (ev) {
			cb(JSON.stringify(ev.error) + "\n" + JSON.stringify(ev.message));
		});

		xhr.send(config.data);
	};

	// used to parse app.xml to JSON
	var parseXML = function (page) {
		var config = Array.prototype.slice.call(page.attributes).map(function (attr) {
			var obj = {};
			obj[attr.name] = attr.value;
			return obj;
		}).reduce(function (obj, attr) {
			for (var i in attr) {
				obj[i] = attr[i];
			}
			return obj;
		}, {});

		var readNode = function (node) {
			return Array.prototype.slice.call(node.childNodes).filter(function (child) {
				return child.nodeType === 1;
			}).map(function (child) {
				var hasType1Node = function (node) {
					var status = false;
					Array.prototype.slice.call(node.childNodes).forEach(function (n) {
						if (n.nodeType === 1) status = true;
					});
					return status;
				};
				if (hasType1Node(child)) {
					return readNode(child);
				} else {
					return {
						nodeName: child.nodeName,
						innerHTML: child.innerHTML.replace(/[\n\r\t]&$\s*|^\s*/g, "")
					};
				}
			});
		};

		var locations = readNode(page).map(function (arr) {
			if (Array.isArray(arr)) {
				return arr.map(function (obj) {
					var acc = {};
					for (var i in obj) {
						acc[obj[i].nodeName] = obj[i].innerHTML;
					}
					return acc;
				});
			} else {
				return [];
			}
		});

		return {
			config: config,
			locations: locations[0]
		};
	};

	// return current html filename
	var getFilename = function () {
		var paths = window.location.pathname.split("/");
		var filename = paths.splice(paths.length - 1, 1)[0];
		return filename || "";
	};

	// converts distance in meters to yards, returns distance on unit=meters, return "" on any other unit
	var convertDistanceTo = function (unit, distance) {
		try {
			if (unit === "meters") {
				return distance.toFixed(1) + " m";
			} else if (unit === "yards") {
				return (distance * 1.09361).toFixed(1) + " y";
			} else {
				return "";
			}
		} catch (err) {
			logger.err(err);
			return "";
		}
	};

	var createLocateMeButton = function (map, pos) {
		var div = document.createElement("button");
		div.style.height = "25px";
		div.style.width = "25px";
		div.style.margin = "10px 14px";
		div.style.background = "url(map_gpsicon.png) no-repeat center center/80% white";
		div.style.cursor = "pointer";
		div.style.border = "0";
		map.controls[google.maps.ControlPosition.TOP_RIGHT].push(div);
		div.addEventListener("click", function () {
			map.panTo(pos);
			((function () {
				var initialZoom = map.getZoom();
				var step = 1, j = 0;
				var prev = 0;

				// animate zoom by exponential growth method
				for (var i = 100; i > 20; i = 100 * Math.pow((1 - 0.05 - (j / 160)), j)) {
					j++;
					((function (zoom) {
						setTimeout(function () {
							if (zoom <= 16) map.setZoom(zoom);
						}, prev += i);
					})(initialZoom += step));
				}

				// fallback method, fixed increases
				// var interval = setInterval(function () {
				// 	logger.log("doing");
				// 	if (currentStep >= steps && interval) {
				// 		clearInterval(interval);
				// 		google.maps.event.trigger(map, "resize");
				// 	}
				// 	currentStep++;
				// 	map.setZoom(initialZoom += step);
				// }, 100);
			})());
		});
	};

	var addStyleForNode = function (node, styleObj) {
		if (!node || !styleObj) return;
		var style = document.createElement("style");
		style.setAttribute("rel", "stylesheet");
		style.type = "text/css";
		var id = "sc" + Math.random().toString(36).substr(2, 10);

		if (styleObj && typeof(styleObj) === "object") {
			node.className += " " + id;
			
			var str = "";
			for (var key in styleObj) {
				str += ("." + id + key) + " {\n" + (
					(function () {
						var s = "";
						for (var j in styleObj[key]) {
							s += "\t" + j + ": " + styleObj[key][j] + ";\n";
						}
						return s;
					})()
				) + "}\n";
			}

			style.innerHTML = str;
			node.appendChild(style);
		}

		return {
			id: id,
			styleNode: style,
			node: node,
			conf: styleObj
		};
	};

	var debugMode = false;
	var Logger = function () {
		Logger.prototype.log = function () {
			if (debugMode) {
				return console.log.call(this, Array.prototype.slice.call(arguments));
			}
		};
		Logger.prototype.warn = function () {
			if (debugMode) {
				return console.warn.call(this, Array.prototype.slice.call(arguments));
			}
		};
		Logger.prototype.error = function () {
			if (debugMode) {
				return console.error.call(this, Array.prototype.slice.call(arguments));
			}
		};
	};
	var logger = new Logger();


	var buildMap = function (conf) {
		if (!conf) conf = {};
		new Promise(function (resolve, reject) {
			var defaultCoords = {
				"coords": {
					"latitude": 40.714353,
					"longitude": -74.005973
				},
				"zoom": 4
			};
			if ("geolocation" in navigator) {
				navigator.geolocation.getCurrentPosition(function (position) {
					resolve(position);
				}, function () {
					resolve(defaultCoords);
				}, {
					enableHighAccuracy: true
				});
			} else {
				resolve(defaultCoords);
			}
		}).then(function (pos) {
			var mapType = "roadmap";
			if (conf.config.mapType === "satellite") {
				mapType = "hybrid";
			}
			var map = new google.maps.Map(document.getElementById("map"), {
				zoom: pos.zoom || 4,
				center: { lat: pos.coords.latitude, lng: pos.coords.longitude },
				mapTypeId: mapType
			});
			window.map = map;
			var bounds = new google.maps.LatLngBounds();

			var currentPosMarker = new google.maps.Marker({
				position: new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude),
				map: map,
				icon: {
					url: "map_currentPos.png",
					size: new google.maps.Size(16, 16),
					scaledSize: new google.maps.Size(16, 16)
				}
			});
			createLocateMeButton(map, currentPosMarker.getPosition());
			bounds.extend(new google.maps.LatLng(currentPosMarker.position.lat(), currentPosMarker.position.lng())); // add new bounds to map

			var markers = [];

			if (Array.isArray(conf.locations)) {
				conf.locations.forEach(function (location) {
					var marker = new google.maps.Marker({
						position: new google.maps.LatLng(location.latitude, location.longitude),
						map: map,
						icon: {
							url: (location.markerImage || "map_defaultMarker.png"),
							size: new google.maps.Size(30, 30),
							scaledSize: new google.maps.Size(30, 30)
						}
					});
					bounds.extend(new google.maps.LatLng(marker.position.lat(), marker.position.lng())); // add new bounds to map

					var div = document.createElement("div");
					div.innerHTML =
						"<div class='header'>" + location.name + "</div>\
						<div>" + location.ldescription + "</div>\
						<div>" + ((function () {
							var distance = google.maps.geometry.spherical.computeDistanceBetween(currentPosMarker.getPosition(), marker.getPosition());
							if (location.ldistanceMode !== "none") {
								return "Distance: " + convertDistanceTo(location.ldistanceMode, distance);
							} else {
								return "";
							}
						})()
					) + "</div>";
					
					addStyleForNode(div, {
						" > .header": {
							"font-weight": "bold",
							"font-size": "12pt",
							"color": "black"
						},
						"": {
							"text-align": "center",
							"cursor": "pointer"
						}
					});

					div.addEventListener("click", function () {
						// create link, set target url from config, open link
						var a = document.createElement("a");
						if (location.ltarget.length) {
							a.href = location.ltarget;
							a.click();
						}
					});
					div.addEventListener("mousedown", function () {
						div.style.background = "rgba(86, 86, 86, 0.1)";
					});
					div.addEventListener("mouseup", function () {
						div.style.background = "none";
					});
					
					// marker popup builder
					var infoWindow = new google.maps.InfoWindow({
						content: div
					});

					marker.addListener("click", function () {
						infoWindow.open(map, marker); // open infowindow
						map.panTo(marker.getPosition()); // center map on marker
					});
					markers.push(marker);
				});
			}

			map.panToBounds(bounds); // autocenter

			var zoomLevel = Math.floor((Number(conf.config.gmapzoom) || 100) / 100 * (20 - 4) + 4);
			if (zoomLevel < 4) {
				map.setZoom(4);
			} else if (zoomLevel > 20) {
				map.setZoom(20);
			} else {
				map.setZoom(zoomLevel);
			}

			google.maps.event.addListenerOnce(map, "bounds_changed", function () {
				var isVisible = markers.filter(function (marker) {
					// getBounds().contains is only available when maps tiles are fully loaded
					return map.getBounds().contains(marker.getPosition());
				});
				
				// are all markers visible? true - leave zoom level as user specified, else fit bounds
				if (markers.length !== isVisible.length) {
					map.fitBounds(bounds); // auto zoom
				}
			});

			var markClusterer = new MarkerClusterer(map, markers, {imagePath: 'map_marker'});

		}).catch(function (err) {
			logger.error(err);
		});
	
	};

	var initPWAMode = function () {
		(document.querySelector("#mapzoom") || document.createElement("div")).style.display = "none";
		(document.querySelector("body > img") || document.createElement("div")).style.display = "none";

		request("app.xml", function (err, xmlText) {
			if (!err) {
				var html = new DOMParser().parseFromString(xmlText, "text/xml");
				var config = parseXML(html.getElementById(getFilename()));
				logger.log(config);

				buildMap(config);
			} else {
				logger.warn(err);
				alert("Cannot generate page, error with app config");
				reject(err);
			}
		});
	};

	window.addEventListener("load", function () {
		var queryParams = window.location.search.replace("?", "").split("&").map(function (pair) {
			var arr = pair.split("=");
			return {
				key: arr[0],
				value: arr[1]
			};
		}).reduce(function (acc, pair) {
			acc[pair.key] = pair.value;
			return acc;
		}, {});

		if (queryParams.simulator === "true" && queryParams.isviewmode !== "true") {
			// page is in simulator mode, do nothing
			logger.log("pageedit mode");
		} else if (queryParams.events === "false" && queryParams.isviewmode === "true") {
			// page is in view mode, do nothing
			logger.log("view mode");
		} else {
			// page is in PWA mode, full functionality
			logger.log("pwa mode");
			initPWAMode();
		}
	});
})());