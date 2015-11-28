(function (global){
	var PI = Math.PI;
	function BezierDemo(canvas){
		this.c = canvas;
		this.w = canvas.width;
		this.h = canvas.height;
		this.centerX = this.w/2;
		this.centerY = this.h/2;
		this.ctx = canvas.getContext('2d');
		this.init();
	}
	BezierDemo.prototype = {
		constructor : BezierDemo,
		init : function (){
			this.initPoints();
			this.initLines();
			this.initControls();
			this.drawBase();
			this.totalFrames = 200;
			this.drawCurve();
		},
		initPoints : function (){
			var interval = ~~(Math.min(this.w,this.h)/3);
			this.points = [{x:this.centerX - interval,y:this.centerY - interval/2},{x:this.centerX - interval,y:this.centerY + interval/2},{x:this.centerX,y:this.centerY + interval/2},{x:this.centerX,y:this.centerY - interval/2},{x:this.centerX + interval,y:this.centerY - interval/2},{x:this.centerX + interval,y:this.centerY + interval/2}];
			this.ctx.textAlign = 'center';
			this.ctx.textBaseline = 'middle';
			this.pointR = ~~(interval/25);
			this.pointBg = 'rgba(0,0,0,.8)';
			this.pointBorder = '#fe0066';
			this.pointFont = this.pointR + 'px "Microsoft Yahei"';
			this.pointFontColor = '#fff';
			this.pathPoint = {bg:'#333',r:~~(interval/30)};
		},
		initLines : function (){
			this.mainLineColor = '#333';
			this.mainLineWidth = (this.pointR/2).toFixed(1);
			this.guideLineWidth = 1;
			this.curveWidth = ~~(this.mainLineWidth*2);
			this.curveColor = '#333';
			this.colorR = 80;
			this.colorG = 100;
			this.colorB = 180;
			this.speedR = 25;
			this.speedG = 20;
			this.speedB = 30;
			this.ctx.lineJoin = 'round';
		},
		initControls : function (){
			var that = this;
			this.c.addEventListener('mousemove',function (e){
				if(that.isDragging)
					return;
				that.selectedPoint = that.detect(e.offsetX,e.offsetY);
				if(that.selectedPoint){
					that.c.style.cursor = 'pointer';
				}else{
					that.c.style.cursor = 'auto';
				}
			},false);
			this.c.addEventListener('mousedown',function (e){
				if(e.button === 2)
					return;
				if(that.selectedPoint){
					var downX = e.clientX - that.selectedPoint.x,
						downY = e.clientY - that.selectedPoint.y;
					that.clearCurve();
					that.isDragging = true;
					that.c.style.cursor = 'move';
					function _move(e){
						var x = e.clientX - downX,
							y = e.clientY - downY;
						x < 0 && (x = 0) || x > that.w && (x = that.w);
						y < 0 && (y = 0) || y > that.h && (y = that.h);
						that.selectedPoint.x = x;
						that.selectedPoint.y = y;
						that.drawBase();
					}
					e.preventDefault();
					document.addEventListener('mousemove',_move,false);
					document.addEventListener('mouseup',function up(){
						that.c.style.cursor = 'auto';
						that.isDragging = false;
						that.drawCurve();
						document.removeEventListener('mousemove',_move);
						document.removeEventListener('mouseup',up);
					},false);
				}
			},false);
			this.initContextMenu();
		},
		initContextMenu : function (){
			var that = this;
			this.menu = document.createElement('ul');
			this.menu.id = 'c-menu';
			this.menu.innerHTML = '<li>增加一个点</li><li>减少一个点</li>';
			this.menu.style.display = 'block';
			document.body.appendChild(this.menu);
			this.menuWidth = this.menu.offsetWidth;
			this.menuHeight = this.menu.offsetHeight;
			this.menu.style.display = 'none';
			this.c.addEventListener('contextmenu',function (e){
				e.preventDefault();
				var x = e.clientX,
					y = e.clientY;
				if(x + that.menuWidth > document.documentElement.clientWidth){
					x -= that.menuWidth;
				}
				if(y + that.menuHeight > document.documentElement.clientHeight){
					y -= that.menuHeight;
				}
				that.showMenu(x,y);
				that.menuX = e.offsetX;
				that.menuY = e.offsetY;
			},false);
			this.menu.addEventListener('click',function (e){
				if(e.target.tagName === 'LI'){
					if(e.target.className === 'c-li-act'){
						that.clearCurve();
						if(e.target === that.menu.children[0]){
							that.points.push({x:that.menuX,y:that.menuY});
						}else{
							that.points.splice(that.selectedPointIdx,1);
						}
						that.hideMenu();
						that.drawBase();
						that.drawCurve();
					}
				}
			},false);
			document.addEventListener('click',function (e){
				if(!that.menu.contains(e.target))
					that.hideMenu();
			},false);
		},
		showMenu : function (x,y){
			this.menu.style.left = x + 'px';
			this.menu.style.top = y + 'px';
			this.menu.style.display = 'block';
			this.menu.children[0].className = this.selectedPoint ? '' : 'c-li-act';
			this.menu.children[1].className = this.selectedPoint ? this.points.length > 2 ? 'c-li-act' : '' : '';
		},
		hideMenu : function (){
			this.menu.style.display = 'none';
		},
		detect : function (x,y){
			var p;
			for(var i = 0;i < this.points.length;i++){
				p = this.points[i];
				this.ctx.beginPath();
				this.ctx.arc(p.x,p.y,this.pointR,0,PI*2,false);
				if(this.ctx.isPointInPath(x,y)){
					this.selectedPointIdx = i;
					return p;
				}
			}
			return null;
		},
		drawLines : function (){
			this.ctx.beginPath();
			this.ctx.save();
			this.ctx.lineWidth = this.mainLineWidth;
			this.ctx.strokeStyle = this.mainLineColor;
			this.ctx.moveTo(this.points[0].x,this.points[0].y);
			for(var i = 1;i < this.points.length;i++){
				this.ctx.lineTo(this.points[i].x,this.points[i].y);
			}
			this.ctx.stroke();
			this.ctx.restore();
		},
		drawPoints : function (){
			var p;
			this.ctx.save();
			this.ctx.font = this.pointFont;
			this.ctx.lineWidth = 1;
			this.ctx.strokeStyle = this.pointBorder;
			for(var i = 0;i < this.points.length;i++){
				this.ctx.beginPath();
				p = this.points[i];
				this.ctx.arc(p.x,p.y,this.pointR,0,PI*2,false);
				this.ctx.fillStyle = this.pointBg;
				this.ctx.fill();
				this.ctx.stroke();
				this.ctx.fillStyle = this.pointFontColor;
				this.ctx.fillText(i,p.x,p.y);
			}
			this.ctx.restore();
		},
		justifyColor : function (A){
			var color = ['color' + A],
				speed = ['speed' + A];
			this[color] += this[speed];
			if(this[color] >= 200){
				this[color] = 200;
				this[speed] *= -1;
			}else if(this[color] <= 40){
				this[color] = 40;
				this[speed] *= -1;
			}
		},
		colorGrow : function (){
			this.justifyColor('R');
			this.justifyColor('G');
			this.justifyColor('B');
			return 'rgb('+this.colorR+','+this.colorG+','+this.colorB+')';
		},
		resolveGLColors : function (){
			this.GLColors = [];
			for(var i = 0;i < this.points.length - 2;i++){
				this.GLColors.push(this.colorGrow());
			}
		},
		calcLoc : function (p1,p2){
			return {x : (p2.x - p1.x)*this.progress + p1.x,y : (p2.y - p1.y)*this.progress + p1.y};
		},
		drawGuideLines : function (points){
			var p1,
				p2,
				p,
				newPoints = [];
			if(points.length > 2){
				this.ctx.beginPath();
				this.ctx.strokeStyle = this.ctx.fillStyle = this.GLColors[this.GLColorIdx++];
				p1 = points[0];
				p2 = points[1];
				p = this.calcLoc(p1,p2);
				this.ctx.moveTo(p.x,p.y);
				newPoints.push(p);
				for(var i = 2;i < points.length;i++){
					p1 = p2;
					p2 = points[i];
					p = this.calcLoc(p1,p2);
					this.ctx.lineTo(p.x,p.y);
					newPoints.push(p);
				}
				this.ctx.stroke();
				this.drawGuideLines(newPoints);
			}else{
				p1 = points[0];
				p2 = points[1];
				p = this.calcLoc(p1,p2);
				this.ctx.beginPath();
				this.ctx.fillStyle = this.pathPoint.bg;
				this.ctx.arc(p.x,p.y,this.pathPoint.r,0,PI*2,false);
				this.ctx.fill();
				this.curvePath.push(p);
				this.drawCurvePath();
			}
		},
		drawCurvePath : function (){
			this.ctx.beginPath();
			this.ctx.save();
			this.ctx.strokeStyle = this.curveColor;
			this.ctx.lineWidth = this.curveWidth;
			this.ctx.moveTo(this.curvePath[0].x,this.curvePath[0].y);
			for(var i = 1;i < this.curvePath.length;i++){
				this.ctx.lineTo(this.curvePath[i].x,this.curvePath[i].y);
			}
			this.ctx.stroke();
			this.ctx.restore();
		},
		drawProcess : function (){
			var that = this;
			this.curFrame++;
			this.progress = this.curFrame/this.totalFrames;
			this.ctx.putImageData(this.img,0,0);
			this.ctx.lineWidth = this.guideLineWidth;
			this.drawGuideLines(this.points);
			this.GLColorIdx = 0;
			if(this.curFrame < this.totalFrames)
				this.curveTimer = requestAnimationFrame(function (){
					that.drawProcess();
				});
		},
		drawCurve : function (){
			this.drawBase();
			this.img = this.ctx.getImageData(0,0,this.w,this.h);
			this.curFrame = -1;
			this.curvePath = [];
			this.resolveGLColors();
			this.drawProcess();
		},
		clearCurve : function (){
			cancelAnimationFrame(this.curveTimer);
			this.drawBase();
		},
		drawBase : function (){
			this.ctx.clearRect(0,0,this.w,this.h);
			this.drawLines();
			this.drawPoints();
		}
	}
	global.BezierDemo = BezierDemo;
})(window);