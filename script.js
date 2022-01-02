class DrawSurface {
	constructor(canvasID) {
		this.canvas = this.initCanvas(canvasID);
		this.context = this.initContext(this.canvas);
		this.refit();
	}

	initCanvas(canvasID) {
		let canvas = document.getElementById(canvasID);
		return canvas;
	}

	initContext(canvas) {
		let context = canvas.getContext('2d');
		return context;
	}

	resize(w, h) {
		this.context.canvas.width = w;
		this.context.canvas.height = h;
	}

	refit() {
		// todo: what to do if inside a parent container of different size from window
		this.resize(window.innerWidth, window.innerHeight);
	}

}

class SurfaceRenderer {
	constructor(manager) {
		this.manager = manager;
		this.data = [];
	}

	drawPart(part) {
		for (var element of part) {
			var drawMethod = element.type;
			var args = element.data;
			this.manager.surface.context[drawMethod](...args);
			this.manager.surface.context.stroke();
		}
	}

	clearRender() {
		let ctx = this.manager.surface.context;
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	}

	render() {
		this.clearRender();
		for (var item of this.data) {
			this.drawPart(item);
		}
	}
}

class SurfaceRendererStager {
	constructor(manager) {
		this.manager = manager;
		this.data = [];
	}

	commit() {  // to be overridden if simplification of data is possible
		this.manager.renderer.data.push(this.data);
	}

	addDraw(method, args) {
		this.data.push({
			type: method,
			data: args
		});
	}

	// must be exported or the drawMethod forvar will be preseved across the hooked functions
	facadeTo(ctxMethod) {
		return function(...args) {
			this.addDraw(ctxMethod, args);
			this.manager.surface.context[ctxMethod](...args);
		}.bind(this);
	}
	customFacades(facade) {
		facade['stroke'] = function() {}; // remove stroke.
	}
	getRenderFacade() {
		var facade = {};
		for (var drawMethod in this.manager.surface.context) {
			facade[drawMethod] = this.facadeTo(drawMethod);
			this.manager.surface.context.stroke();
		}
		this.customFacades(facade);
		return facade;
	}
	getContext() {
		return this.getRenderFacade();
	}
}

class SurfaceListener {
	constructor(manager) {
		this.manager = manager;
		this.registerHandlers();
	}

	debug(eventtype) {
		let canvas = this.manager.surface.canvas;
		canvas.addEventListener(eventtype, function(e) {
			console.log(eventtype, e);
		});
	}

	registerHandlers() {
		let canvas = this.manager.surface.canvas;
		canvas.addEventListener('mousemove', this.handler_mousemove.bind(this));
		canvas.addEventListener('mousedown', this.handler_mousedown.bind(this));
		canvas.addEventListener('mouseup', this.handler_mouseup.bind(this));

		canvas.addEventListener('pointerup', this.handler_pointerup.bind(this));
		canvas.addEventListener('pointerdown', this.handler_pointerdown.bind(this));
		canvas.addEventListener('pointermove', this.handler_pointermove.bind(this));

		this.debug("pointerover");
		this.debug("pointerenter");
		this.debug("pointerdown");
		this.debug("pointermove");
		this.debug("pointerup");
		this.debug("pointercancel");
		this.debug("pointerout");
		this.debug("pointerleave");
		this.debug("gotpointercapture");
		this.debug("lostpointercapture");
	}

	fire(type, event) {
		if (this.manager.tool[type]) {
			this.manager.tool[type](event);
		}
	}

	handler_mousemove(event) {
		this.fire('mousemove', event);
		this.fire('move', event);
	}

	handler_mousedown(event) {
		this.fire('mousedown', event);
		this.fire('down', event);
	}

	handler_mouseup(event) {
		this.fire('mouseup', event);
		this.fire('up', event);
	}

	handler_pointerup(event) {
		this.fire('pointerup', event);
		this.fire('up', event);
	}

	handler_pointerdown(event) {
		this.fire('pointerdown', event);
		this.fire('down', event);
	}

	handler_pointermove(event) {
		this.fire('pointermove', event);
		this.fire('move', event);
	}
}

class Tool {
	constructor(manager) {
		this.manager = manager;
		this.renderer = undefined;
	}

	startRender() {  // to be overridden with an extension of SurfaceRenderer that simplifies data if possible
		this.renderer = new SurfaceRendererStager(this.manager);
		return this.renderer;
	}
	stopRenderer() {
		this.renderer = undefined;
	}
	commitRender() {
		this.renderer.commit();
		this.stopRenderer();
	}

	down(e) {
		console.log("d");
	}
	up(e) {
		console.log("u");
	}
	move(e) {
		console.log("m");
	}
	mousedown(e) {
		console.log("md");
	}
	mouseup(e) {
		console.log("mu");
	}
	mousemove(e) {
		console.log("me");
	}
	pointerdown(e) {
		console.log("pd");
	}
	pointerup(e) {
		console.log("pu");
	}
	pointermove(e) {
		console.log("pe");
	}
}

class DummyTool extends Tool {
	constructor(manager) {
		super(manager);
	}
}

class RawTool extends Tool {
	constructor(manager) {
		super(manager);
		this.draw = false;
	}

	calcOffset(ev) {
		let x,y;
		if (ev.layerX || ev.layerX == 0) { // Firefox
			x = ev.layerX;
			y = ev.layerY;
		} else if (ev.offsetX || ev.offsetX == 0) { // Opera
			x = ev.offsetX;
			y = ev.offsetY;
		}
		return [x,y];
	}

	pointerdown(e) {
		this.stopRenderer();
		this.startRender();
		this.draw = true;
		let [x,y] = this.calcOffset(e);
		let context = this.renderer.getContext();
		context.beginPath();
		context.moveTo(x, y);
	}
	pointerup(e) {
		this.draw = false;
		if (this.renderer == undefined) {
			return;
		}
		let context = this.renderer.getContext();
		context.stroke();
		this.commitRender();
	}
	pointermove(e) {
		if (this.renderer == undefined) {
			return;
		}
		if (this.draw) {
			let [x,y] = this.calcOffset(e);
			let context = this.renderer.getContext();
			context.lineTo(x, y);
			context.stroke();
		}
	}
}

class SurfaceManager {
	constructor(surface) {
		this.surface = surface;
		this.tool = new RawTool(this);
		this.listener = new SurfaceListener(this);
		this.renderer = new SurfaceRenderer(this);
	}
}


function init () {
	var surface = new DrawSurface('imageView');
	var draw = new SurfaceManager(surface);
	console.log("init surface");
	window.asdf = draw;
}