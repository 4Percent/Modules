(function (global){
	var sin = Math.sin,
		cos = Math.cos,
		PI = Math.PI,
		isIE = /Trident|Edge/.test(global.navigator.userAgent),
		getStyle = global.getComputedStyle ? function (elt,prop){
			return global.getComputedStyle(elt,'')[prop];
		} : function (elt,prop){
			return elt.currentStyle[prop];
		},
		addEvent = global.addEventListener ? function (elt,event,handler){
			elt.addEventListener(event,handler,false);
		} : function (elt,event,handler){
			elt.attachEvent('on' + event,function (){
				var e = global.event,
					ret;
				e.preventDefault = function (){
					ret = false;
				}
				handler.call(elt,e);
			});
		},
		requestFrame = global.requestAnimationFrame ? function (fn){
			return global.requestAnimationFrame(fn);
		} : function (fn){
			return global.setTimeout(fn,20);
		};
	function CloudTagProto(){}
	CloudTagProto.prototype = {
		constructor : CloudTagProto,
		init : function (){
			this.locs = [];
			this.clearDefaultEvent();
			this.distribute();
			this.enableRotate();
		},
		clearDefaultEvent : function (){
			addEvent(this.con,'mousedown',function (e){
				e.preventDefault();
			});
		},
		distribute : function (){
			var theta,
				phi,
				p;
			for(var i = 0;i < this.points.length;i++){
				p = this.points[i];
				theta = Math.acos((2*i + 1)/this.points.length - 1);
				phi = Math.sqrt(this.points.length*PI)*theta;
				this.locs[i] = {};
				this.locs[i].z = this.r*cos(theta);
				this.locs[i].x = this.r*sin(theta)*cos(phi);
				this.locs[i].y = this.r*sin(theta)*sin(phi);
				this.locs[i].idx = i;
				this.initAttrs(p,this.locs[i]);
			}
			this.resolvePos();
		},
		rotateSphere : function (){
			var that = this;
			this.updateLocs();
			this.resolvePos();
			this.speedX *= .98;
			this.speedY *= .98;
			if(Math.abs(this.speedX) > this.minSpeed || Math.abs(this.speedY) > this.minSpeed){
				requestFrame(function (){
					that.rotateSphere();
				});
			}else{
				this.isRotating = false;
			}
		},
		updateLocs : function (){
			var c,
				s,
				x1,
				y1,
				y2,
				z1,
				x2,
				z2,
				loc;
			for(var i = 0;i < this.locs.length;i++){
				loc = this.locs[i];
				c = cos(this.speedZ);
				s = sin(this.speedZ);
				x1 = c*loc.x - s*loc.y;
				y1 = s*loc.x + c*loc.y;
				c = cos(this.speedX);
				s = sin(this.speedX);
				y2 = c*y1 - s*loc.z;
				z1 = s*y1 + c*loc.z;
				c = cos(this.speedY);
				s = sin(this.speedY);
				x2 = c*x1 - s*z1;
				z2 = s*x1 + c*z1;
				loc.x = x2;
				loc.y = y2;
				loc.z = z2;
			}
		}
	}
	function enableRotate(){
		var that = this,
			lastMouseLoc = {},
			speedFactor = .0002,
			isIEEntered = false;
		this.speedX = 0;
		this.speedY = 0;
		this.speedZ = 0;
		this.isRotating = false;
		this.minSpeed = .001;
		addEvent(this.con,'mouseenter',function (e){
			lastMouseLoc.x = e.offsetX;
			lastMouseLoc.y = e.offsetY;
		});
		addEvent(this.con,'mousemove',function (e){
			if(isIE && !isIEEntered){
				lastMouseLoc.x = e.offsetX;
				lastMouseLoc.y = e.offsetY;
				isIEEntered = true;
			}
			that.speedY -= (e.offsetX - lastMouseLoc.x)*speedFactor;
			that.speedX -= (e.offsetY - lastMouseLoc.y)*speedFactor;
			lastMouseLoc.x = e.offsetX;
			lastMouseLoc.y = e.offsetY;
			if(!that.isRotating){
				that.isRotating = true;
				that.rotateSphere();
			}
		},false);
		if(isIE){
			addEvent(this.con,'mouseleave',function (e){
				isIEEntered = false;
			});
		}
		for(var i = 0;i < this.points.length;i++){
			addEvent(this.points[i],'mousemove',function (e){
				e.cancelBubble = true;
			});
			addEvent(this.points[i],'mouseenter',function (e){
				e.cancelBubble = true;
			});
		}
	}
	//兼容
	function CloudTag(container,r,perspective){
		this.con = container;
		this.r = r;
		this.perspective = perspective;
		this.points = container.children;
		this.centerX = this.con.offsetWidth/2;
		this.centerY = this.con.offsetHeight/2;
		this.init();
	}
	CloudTag.prototype = new CloudTagProto();
	CloudTag.prototype.constructor = CloudTag;
	CloudTag.prototype.initAttrs = function (p,loc){
		loc.w = p.offsetWidth;
		loc.h = p.offsetHeight;
		loc.fs = parseFloat(getStyle(p,'fontSize'));
	}
	CloudTag.prototype.resolvePos = function (){
		var p,
			loc,
			ratio,
			h,
			w;
		this.locs.sort(function (a,b){
			return a.z - b.z;
		});
		for(var i = 0;i < this.locs.length;i++){
			loc = this.locs[i];
			p = this.points[loc.idx];
			ratio = this.perspective/(this.perspective - loc.z);
			p.style.zIndex = i;
			w = ratio*loc.w;
			h = ratio*loc.h;
			p.style.left = this.centerX + loc.x - w/2 + 'px';
			p.style.top = this.centerY + loc.y - h/2 + 'px';
			p.style.height = h + 'px';
			p.style.width = w + 'px';
			p.style.fontSize = ratio*loc.fs + 'px';
		}
	}
	CloudTag.prototype.enableRotate = enableRotate;
	//Css3
	function CloudTagCss3(container,r){
		this.con = container;
		this.points = container.children;
		this.r = r;
		this.centerX = this.con.offsetWidth/2;
		this.centerY = this.con.offsetHeight/2;
		this.init();
	}
	var protoDistribute = CloudTagProto.prototype.distribute;
	CloudTagCss3.prototype = new CloudTagProto();
	CloudTagCss3.prototype.initAttrs = function (p,loc){
		p.style.left = this.centerX - p.offsetWidth/2 + 'px';
		p.style.top = this.centerY - p.offsetHeight/2 + 'px';
	}
	CloudTagCss3.prototype.resolvePos = isIE ? function (){
		var p,
			loc;
		this.locs.sort(function (a,b){
			return a.z - b.z;
		});
		for(var i = 0;i < this.locs.length;i++){
			loc = this.locs[i];
			p = this.points[loc.idx];
			p.style.transform = 'translate3d('+loc.x+'px,'+loc.y+'px,'+loc.z+'px)';
			p.style.zIndex = i;
		}
	} : function (){
		var p,
			loc;
		for(var i = 0;i < this.locs.length;i++){
			loc = this.locs[i];
			p = this.points[loc.idx];
			p.style.transform = 'translate3d('+loc.x+'px,'+loc.y+'px,'+loc.z+'px)';
		}
	}
	CloudTagCss3.prototype.enableRotate = enableRotate;
	//Canvas
	var protoInit = CloudTagProto.prototype.init,
		protoRotateSphere = CloudTagProto.prototype.rotateSphere;
	function CloudTagCanvas(canvas,setting){
		this.con = canvas;
		this.r = setting.r;
		this.detectR = setting.detectR || this.r*1.2;
		this.perspective = setting.perspective || 1000;
		this.points = setting.points;
		this.ctx = canvas.getContext('2d');
		this.centerX = setting.centerX;
		this.centerY = setting.centerY;
		this.init();
	}
	CloudTagCanvas.prototype = new CloudTagProto();
	CloudTagCanvas.prototype.init = function (){
		var p,
			that = this,
			hasImage = false;
		this.imgs = [];
		this.imgsCount = 0;
		this.loadedCount = 0;
		this.ctx.textAlign = 'center';
		this.ctx.textBaseline = 'middle';
		for(var i = 0;i < this.points.length;i++){
			p = this.points[i];
			if(p.src){
				hasImage = true;
				this.imgsCount++;
				this.imgs[i] = new Image();
				this.imgs[i].src = p.src;
				this.imgs[i].onload = function (){
					if(++that.loadedCount === that.imgsCount){
						protoInit.call(that);
					}
				}
			}
		}
		this.angleS = PI/5;
		this.angleL = PI/5*2;
		if(!hasImage)
			protoInit.call(this);
	}
	CloudTagCanvas.prototype.initAttrs = function (p,loc){
		p.fs = p.fs || 16;
		p.hbg = p.hbg || p.bg;
		p.color = p.color || '#000';
	}
	CloudTagCanvas.prototype.drawStarPath = function (centerX,centerY,outerR,innerR){
		var innerAngle,
			outerAngle;
		this.ctx.moveTo(centerX,centerY - outerR);
		for(var i = 0;i < 5;i++){
			innerAngle = this.angleS + this.angleL*i;
			outerAngle = this.angleL*(i + 1);
			this.ctx.lineTo(centerX + sin(innerAngle)*innerR,centerY - cos(innerAngle)*innerR);
			this.ctx.lineTo(centerX + sin(outerAngle)*outerR,centerY - cos(outerAngle)*outerR);
		}
		return this.ctx.isPointInPath(this.mouseX,this.mouseY);
	}
	CloudTagCanvas.prototype.drawHexaPath = function (centerX,centerY,r){
		var angle;
		this.ctx.moveTo(centerX + r,centerY);
		for(var i = 1;i < 7;i++){
			angle = i*PI/3;
			this.ctx.lineTo(centerX + cos(angle)*r,centerY + sin(angle)*r);
		}
		return this.ctx.isPointInPath(this.mouseX,this.mouseY);
	}
	CloudTagCanvas.prototype.rotateSphere = function (){
		this.ctx.clearRect(0,0,this.con.width,this.con.height);
		protoRotateSphere.call(this);
	}
	CloudTagCanvas.prototype.findClosest = function (){
		var p,
			loc,
			ratio,
			centerX,
			centerY,
			w,
			h,
			hovered,
			hoveredZ = -this.r - 1;
		this.locs.sort(function (a,b){
			return a.z - b.z;
		});
		for(var i = this.locs.length - 1;i >= 0;i--){
			loc = this.locs[i];
			p = this.points[loc.idx];
			ratio = this.perspective/(this.perspective - loc.z);
			centerX = loc.x + this.centerX;
			centerY = loc.y + this.centerY;
			this.ctx.beginPath();
			switch(p.type){
				case 'image':
					w = p.w*ratio;
					h = p.w*ratio;
					this.ctx.drawImage(this.imgs[loc.idx],centerX - w/2,centerY - h/2,w,h);
					if(this.mouseX > centerX - w/2 && this.mouseX < centerX + w/2 && this.mouseY > centerY - h/2 && this.mouseY < centerY + h/2 && loc.z > hoveredZ){
						hovered = p;
						hoveredZ = loc.z;
					}
					break;
				case 'rect':
					w = p.w*ratio;
					h = p.h*ratio;
					this.ctx.rect(centerX - w/2,centerY - h/2,w,h);
					if(this.ctx.isPointInPath(this.mouseX,this.mouseY) && loc.z > hoveredZ){
						hovered = p;
						hoveredZ = loc.z;
					}
					break;
				case 'round':
					w = p.r*ratio;
					this.ctx.arc(centerX,centerY,w,0,PI*2,false);
					if(this.ctx.isPointInPath(this.mouseX,this.mouseY) && loc.z > hoveredZ){
						hovered = p;
						hoveredZ = loc.z;
					}
					break;
				case 'star':
					w = p.outerR*ratio;
					h = p.innerR*ratio;
					if(this.drawStarPath(centerX,centerY,w,h) && loc.z > hoveredZ){
						hovered = p;
						hoveredZ = loc.z;
					}
					break;
				case 'hexagon':
					w = p.r*ratio;
					if(this.drawHexaPath(centerX,centerY,w) && loc.z > hoveredZ){
						hovered = p;
						hoveredZ = loc.z;
					}
			}
		}
		this.hovered = hovered;
	}
	CloudTagCanvas.prototype.judgeHover = function (p){
		this.ctx.fillStyle = this.hovered === p ? p.hbg : p.bg;
	}
	CloudTagCanvas.prototype.resolvePos = function (){
		var p,
			loc,
			ratio,
			centerX,
			centerY,
			w,
			h;
		this.findClosest();
		for(var i = 0;i < this.locs.length;i++){
			loc = this.locs[i];
			p = this.points[loc.idx];
			ratio = this.perspective/(this.perspective - loc.z);
			centerX = loc.x + this.centerX;
			centerY = loc.y + this.centerY;
			this.ctx.beginPath();
			switch(p.type){
				case 'image':
					w = p.w*ratio;
					h = p.w*ratio;
					this.ctx.drawImage(this.imgs[loc.idx],centerX - w/2,centerY - h/2,w,h);
					if(this.hovered === p){
						this.ctx.fillStyle = 'rgba(255,255,255,.3)';
						this.ctx.fillRect(centerX - w/2,centerY - h/2,w,h);
					}
					break;
				case 'rect':
					w = p.w*ratio;
					h = p.h*ratio;
					this.judgeHover(p);
					this.ctx.fillRect(centerX - w/2,centerY - h/2,w,h);
					break;
				case 'round':
					w = p.r*ratio;
					this.ctx.arc(centerX,centerY,w,0,PI*2,false);
					this.judgeHover(p);
					this.ctx.fill();
					break;
				case 'star':
					w = p.outerR*ratio;
					h = p.innerR*ratio;
					this.drawStarPath(centerX,centerY,w,h);
					this.judgeHover(p);
					this.ctx.fill();
					break;
				case 'hexagon':
					w = p.r*ratio;
					this.drawHexaPath(centerX,centerY,w);
					this.judgeHover(p);
					this.ctx.fill();
			}
			if(p.text){
				this.ctx.fillStyle = p.color;
				this.ctx.font = p.fs*ratio + 'px a';
				this.ctx.fillText(p.text,centerX,centerY);
			}
		}
	}
	CloudTagCanvas.prototype.enableRotate = function (){
		var that = this,
			lastMouseLoc = {};
		this.isEntered = false;
		this.speedX = 0;
		this.speedY = 0;
		this.speedZ = 0;
		this.speedFactor = .0002;
		this.isRotating = false;
		this.minSpeed = .001;
		this.con.addEventListener('mousemove',function (e){
			var x = e.offsetX - that.centerX,
				y = e.offsetY - that.centerY;
			if(x*x + y*y < that.detectR*that.detectR){
				if(!this.isEntered){
					this.isEntered = true;
					lastMouseLoc = {x:e.offsetX,y:e.offsetY};
				}else{
					that.mouseX = e.offsetX;
					that.mouseY = e.offsetY;
					that.speedX -= (e.offsetY - lastMouseLoc.y)*that.speedFactor;
					that.speedY -= (e.offsetX - lastMouseLoc.x)*that.speedFactor;
					lastMouseLoc.x = e.offsetX;
					lastMouseLoc.y = e.offsetY;
					if(!that.isRotating){
						that.isRotating = true;
						that.rotateSphere();
					}
				}
			}else{
				this.isEntered = false;
				that.mouseX = null;
				that.mouseY = null;
			}
		},false);
		this.con.addEventListener('click',function (){
			if(that.hovered)
				that.hovered.handler && that.hovered.handler();
		},false);
	}
	global.CloudTag = CloudTag;
	global.CloudTagCss3 = CloudTagCss3;
	global.CloudTagCanvas = CloudTagCanvas;
})(window);