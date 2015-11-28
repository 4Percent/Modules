(function (global){
	var isFirefox = /firefox/i.test(global.navigator.userAgent),
		mousewheel = isFirefox ? function (elt,handler){
			elt.addEventListener('DOMMouseScroll',function (e){
				handler.call(elt,e.detail>0);
			},false);
		} : function (elt,handler){
			elt.addEventListener('mousewheel',function (e){
				handler.call(elt,e.wheelDelta<0);
			},false);
		},
		PI = Math.PI,
		PI2 = PI*2,
		sin = Math.sin,
		cos = Math.cos,
		sin60 = sin(PI/3),
		cos60 = cos(PI/3),
		a36 = PI/5,
		a72 = PI/2.5;
	function toTens(num){
		num = ~~num;
		return num < 10 ? '0' + num : '' + num;
	}
	function randomNum(n,m){
		return Math.floor(Math.random()*(m - n) + n);
	}
	function SimplePlayer(canvas,musics){
		this.canvas = canvas;
		this.musics = musics || [];
		this.curMusic = 0;
		this.init();
	}
	SimplePlayer.prototype = {
		constructor : SimplePlayer,
		push : Array.prototype.push,
		init : function (){
			this.initCanvas();
			this.initResizing();
			this.initAudio();
			this.initControls();
			this.play();
		},
		initCanvas : function (){
			this.ctx = this.canvas.getContext('2d');
			this.width = this.canvas.width;
			this.height = this.canvas.height;
			this.centerX = this.width/2;
			this.centerY = this.height/2;
			this.modes = ['toWaves','toStars','toLines'];
			this.curMode === undefined && (this.curMode = 2);
			this.ctx.textAlign = 'center';
			this.ctx.textBaseline = 'middle';
			this.titleFont = '20px "Microsoft Yahei"';
			this.titleCenterY = 15;
			this.infoAreaY = ~~(this.height/12) + 40;
			this.infoPlateColor = .5;
			this.btnSize = ~~(this.height/36);
			this.btnSizeLarge = this.btnSize*1.25;
			this.btnIncre = this.btnSize*.5;
			this.btnIncreL = this.btnSizeLarge*.5;
			this.btnCenterY = this.btnSizeLarge + 36;
			this.btnAddX = ~~(this.width/8);
			this.btnPLX = this.btnAddX + this.btnSize*4;
			this.btnPrevX = this.centerX - ~~(this.width/10);
			this.btnNextX = this.centerX + ~~(this.width/10);
			this.btnListX = this.width - this.btnAddX;
			this.btnLineWidth = Math.min(~~(this.height/30),3);
			this.modeListX = this.btnListX - this.btnSizeLarge;
			this.modeListY = this.infoAreaY;
			this.modeListW = this.width - this.modeListX;
			this.modeListH = this.btnSizeLarge;
			this.initPlayList();
			this.initVisualEffects();
		},
		initVisualEffects : function (){
			//wave
			var gradient = this.ctx.createLinearGradient(0,this.height,0,this.infoAreaY),
				linePointX = ~~(this.width/60),
				linePointY = ~~(this.height/60);
			gradient.addColorStop(0,'#f2992e');
			gradient.addColorStop(1,'#fe0066');
			this.waveInterval = 2;
			this.waveWidth = this.width/32;
			this.waveColWidth = this.waveWidth - this.waveInterval;
			this.waveMaxHeight = this.height - this.infoAreaY;
			this.waveColor = gradient;
			//star
			this.stars = [];
			this.starOriginSpeedX = randomNum(-40,40) + 10;
			this.starOriginSpeedY = randomNum(-40,40) - 10;
			this.starOriginX = this.centerX;
			this.starOriginY = this.centerY;
			this.starOriginZ = -this.perspective*20;
			this.starSpeedZ = ~~(this.perspective/10);
			this.starSum = 0;
			this.starSize = ~~(this.height/30);
			this.starPosOffset = this.starSize*80;
			this.starGroupLimit = this.perspective/2;
			this.starOriginLimit = [this.starSize*10,this.width - this.starSize*10,this.infoAreaY,this.height - this.starSize*10];
			//lines
			this.linesSetting = {
				points : [],
				colors : [randomNum(0,255),randomNum(0,255),randomNum(0,255)],
				factors : [1,1,1],
				trails : [],
				trailLimit : 10,
				opIncre : .08
			}
			for(var i = 0;i < 6;i++){
				this.linesSetting.points.push({x:randomNum(0,this.width),y:randomNum(this.infoAreaY,this.height),speedX:randomNum(-linePointX,linePointX),speedY:randomNum(-linePointY,linePointY)});
			}
		},
		initPlayList : function (){
			this.PLFont = '20px "Microsoft Yahei"';
			this.PLFS = 20;
			this.PLWidth = ~~(this.width/4*3);
			this.PLHeight = 60;
			this.PLBG = '#333';
			this.PLBGHover = '#f2992e';
			this.PLBGColor = '#fff';
			this.PLBetween = this.PLHeight*3;
			this.PLData = [];
			this.perspective = 1000;
			this.speedAngle = 0;
			this.distributePL();
		},
		initAudio : function (){
			this.audio = new Audio();
			this.aCtx = new (window.AudioContext || window.webkitAudioContext)();
			this.source = this.aCtx.createMediaElementSource(this.audio);
			this.analyser = this.aCtx.createAnalyser();
			this.analyser.fftSize = 64;
			this.frqLength = 32;
			this.frqData = new Uint8Array(this.analyser.frequencyBinCount);
			this.source.connect(this.analyser);
			this.source.connect(this.aCtx.destination);
			this.musicNames = [];
			this.initFileAdd();
			for(var i = 0;i < this.musics.length;i++)
				this.musicNames.push(this.musics[i].replace(/.*[\\\/]/,''));
		},
		initFileAdd : function (){
			var that = this,
				files = [],
				names = [];
			this.input = document.createElement('input');
			this.input.type = 'file';
			this.input.multiple = true;
			this.input.addEventListener('change',function (){
				that.addMusic(this.files);
			},false);
			this.canvas.addEventListener('dragover',function (e){
				e.preventDefault();
			},false);
			this.canvas.addEventListener('drop',function (e){
				e.preventDefault();
				that.addMusic([e.dataTransfer.files[0]]);
			},false);
		},
		initControls : function (){
			var that = this;
			this.canvas.addEventListener('mousemove',function (e){
				that.mouseX = e.offsetX;
				that.mouseY = e.offsetY;
			},false);
			this.canvas.addEventListener('click',function (e){
				if(that.hoveredTargetHandler){
					if(that.hoveredTargetHandler !== 'btnListHandler')
						that.modeListNeeded = false;
					that[that.hoveredTargetHandler](that.hoveredTargetValue);
				}else
					that.modeListNeeded = false;
			});
			this.canvas.addEventListener('mousedown',function (e){
				var lastLoc = {x:e.offsetX,y:e.offsetY},
					modeVolume = false,
					curValue,
					maxValue,
					audio = that.audio,
					format = toTens;
				function _pause(){
					this.pause();
				}
				function _move(e){
					if(!that.isProgressHintNeeded){
						var increX = e.offsetX - lastLoc.x,
							increY = e.offsetY - lastLoc.y;
						if(increX*increX + increY*increY < 200)
							return;
						that.isProgressHintNeeded = true;
						if(Math.abs(increX) < Math.abs(increY)){
							modeVolume = true;
							curValue = audio.volume;
							maxValue = 1;
							that.progressMsg = 'Volume';
						}else{
							curValue = audio.currentTime;
							maxValue = audio.duration;
							that.progressMsg = 'Progress';
							audio.addEventListener('play',_pause,false);
							audio.pause();
						}

					}else{
						if(modeVolume){
							var increY = e.offsetY - lastLoc.y;
							lastLoc.y = e.offsetY;
							curValue += increY < 0 ? 0.01 : -0.01;
							curValue > maxValue && (curValue = maxValue) || curValue < 0 && (curValue = 0);
							that.audio.volume = curValue;
							that.progressMsg = ~~(that.audio.volume*100);
						}else{
							var increX = e.offsetX - lastLoc.x;
							lastLoc.x = e.offsetX;
							curValue += increX < 0 ? -5 : 5;
							curValue >= maxValue && (curValue = maxValue - 1) || curValue < 0 && (curValue = 0);
							that.audio.currentTime = curValue;
							that.progressMsg = format(curValue/3600) + ':' + format(curValue%3600/60) + ':' + format(curValue%60) + '/' + format(maxValue/3600) + ':' + format(maxValue%3600/60) + ':' + format(maxValue%60);
						}
					}
				}
				this.addEventListener('mousemove',_move,false);
				document.addEventListener('mouseup',function _up(){
					that.isProgressHintNeeded = false;
					if(!modeVolume){
						audio.removeEventListener('play',_pause,false);
						audio.play();
					}
					that.canvas.removeEventListener('mousemove',_move,false);
					document.removeEventListener('mouseup',_up,false);
				});
			});
			mousewheel(this.canvas,function (downwards){
				that.speedAngle += downwards ? -.03 : .03;
			});
		},
		initResizing : function (){
			var that = this;
			global.addEventListener('resize',function (){
				that.initCanvas();
			},false);
		},
		play : function (){
			var that = this;
			this.audio.addEventListener('canplay',function (){
				that.resetTitle();
				this.play();
			},false);
			this.audio.addEventListener('canplay',function fn(){
				that.visualize();
				that.audio.removeEventListener('canplay',fn,false);
			});
			this.audio.addEventListener('ended',function (){
				that.switchMusic((that.curMusic + 1)%that.musics.length);
			},false);
			this.audio.addEventListener('error',function (){
				that.removeMusic();
			},false);
			this.switchMusic(this.curMusic);
		},
		visualize : function (){
			var that = this;
			this.ctx.clearRect(0,0,this.width,this.height);
			this.hoveredTargetHandler = null;
			this.hoveredTargetValue = null;
			requestAnimationFrame(function (){
				that.visualize();
			});
			if(!this.isStopped){
				this[this.modes[this.curMode]]();
				this.showInfo();
				if(this.isPlayListNeeded){
					this.showPlayList();
				}
				if(this.modeListNeeded){
					this.showModeList();
				}
				if(this.tipsNeeded){
					this.showTips();
				}
				if(this.isProgressHintNeeded){
					this.showProgressHint();
				}
			}else{
				this.showError();
			}
		},
		showError : function (){
			var ctx = this.ctx;
			ctx.beginPath();
			ctx.fillStyle = '#000';
			ctx.fillText(this.curMusicName,this.centerX,this.centerY);
		},
		drawInfoPlate : function (){
			var ctx = this.ctx;
			if(this.mouseY <= this.infoAreaY){
				this.infoPlateColor += .02;
				this.infoPlateColor > .8 && (this.infoPlateColor = .8);
				ctx.beginPath();
				ctx.fillStyle = 'rgba(0,0,0,'+this.infoPlateColor+')';
				ctx.fillRect(0,0,this.width,this.infoAreaY);
			}else{
				if(this.infoPlateColor > .5){
					this.infoPlateColor -= .02;
				}
				ctx.beginPath();
				ctx.fillStyle = 'rgba(0,0,0,'+this.infoPlateColor+')';
				ctx.fillRect(0,0,this.width,this.infoAreaY);
			}
		},
		drawTitle : function (){
			var ctx = this.ctx,
				style,
				progress = this.audio.currentTime/this.audio.duration;
			ctx.font = this.titleFont;
			if(this.audio.duration){
				style = ctx.createLinearGradient(this.titleLeft,0,this.titleRight,0);
				style.addColorStop(0,'#fff');
				style.addColorStop(progress,'#fff');
				style.addColorStop(progress,'rgba(255,255,255,.5)');
			}else
				style = 'rgba(255,255,255,.5)';
			ctx.beginPath();
			ctx.fillStyle = style;
			ctx.fillText(this.curMusicName,this.centerX,this.titleCenterY);
		},
		resolveBtnHover : function (name,x,size){
			this.ctx.arc(x,this.btnCenterY,size,0,PI2,false);
			if(this.ctx.isPointInPath(this.mouseX,this.mouseY)){
				this.hoveredTargetHandler = name;
				this.ctx.strokeStyle = '#fff';
				this.ctx.fillStyle = '#fff';
				this.ctx.shadowColor = '#fff';
				this.ctx.shadowBlur = 2;
			}
		},
		drawBtnTriangle : function (x,incre){
			this.ctx.beginPath();
			this.ctx.moveTo(x - incre,this.btnCenterY);
			this.ctx.lineTo(x + incre*cos60,this.btnCenterY - incre*sin60);
			this.ctx.lineTo(x + incre*cos60,this.btnCenterY + incre*sin60);
			this.ctx.closePath();
			this.ctx.fill();
		},
		drawAddBtn : function (){
			var incre = this.btnIncre,
				ctx = this.ctx;
			ctx.beginPath();
			ctx.save();
			this.resolveBtnHover('btnAddHandler',this.btnAddX,this.btnSizeLarge);
			ctx.moveTo(this.btnAddX - incre,this.btnCenterY);
			ctx.lineTo(this.btnAddX + incre,this.btnCenterY);
			ctx.moveTo(this.btnAddX,this.btnCenterY - incre);
			ctx.lineTo(this.btnAddX,this.btnCenterY + incre);
			ctx.stroke();
			ctx.restore();
		},
		_drawPlayListBtn : function (incre,y){
			var ctx = this.ctx;
			ctx.beginPath();
			ctx.moveTo(this.btnPLX - incre,y);
			ctx.arc(this.btnPLX - incre,y,ctx.lineWidth*.8,0,PI2,false);
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(this.btnPLX - incre*.6,y);
			ctx.lineTo(this.btnPLX + incre,y);
			ctx.stroke();
		},
		drawPlayListBtn : function (){
			var ctx = this.ctx,
				incre = this.btnIncreL;
			ctx.beginPath();
			ctx.save();
			this.resolveBtnHover('btnPLHandler',this.btnPLX,this.btnSizeLarge);
			ctx.stroke();
			this._drawPlayListBtn(incre,this.btnCenterY - incre);
			this._drawPlayListBtn(incre,this.btnCenterY);
			this._drawPlayListBtn(incre,this.btnCenterY + incre);
			ctx.restore();
		},
		drawProgressBtns : function (){
			var ctx = this.ctx,
				incre = this.btnIncre,
				x,y;
			//prev
			ctx.beginPath();
			ctx.save();
			this.resolveBtnHover('btnPrevHandler',this.btnPrevX,this.btnSize);
			x = this.btnPrevX + incre*.1;
			ctx.moveTo(x - incre,this.btnCenterY - incre);
			ctx.lineTo(x - incre,this.btnCenterY + incre);
			ctx.stroke();
			this.drawBtnTriangle(x,incre);
			ctx.restore();
			//next
			ctx.beginPath();
			ctx.save();
			this.resolveBtnHover('btnNextHandler',this.btnNextX,this.btnSize);
			ctx.stroke();
			ctx.beginPath();
			x = this.btnNextX - incre*.1;
			ctx.moveTo(x + incre,this.btnCenterY - incre);
			ctx.lineTo(x + incre,this.btnCenterY + incre);
			ctx.stroke();
			this.drawBtnTriangle(x,-incre);
			ctx.restore();
			//play
			ctx.beginPath();
			ctx.save();
			this.resolveBtnHover('btnPlayHandler',this.centerX,this.btnSizeLarge);
			ctx.stroke();
			ctx.beginPath();
			if(this.isPaused){
				this.drawBtnTriangle(this.centerX,-this.btnSizeLarge*.5);
			}else{
				incre = this.btnSizeLarge*.3;
				y = incre*1.5;
				ctx.lineWidth = this.btnLineWidth*2;
				ctx.moveTo(this.centerX - incre,this.btnCenterY - y);
				ctx.lineTo(this.centerX - incre,this.btnCenterY + y);
				ctx.moveTo(this.centerX + incre,this.btnCenterY - y);
				ctx.lineTo(this.centerX + incre,this.btnCenterY + y);
				ctx.stroke();
			}
			ctx.restore();
		},
		drawListBtn : function (){
			var incre = this.btnIncreL,
				ctx = this.ctx,
				r = incre*.3;
			ctx.beginPath();
			ctx.save();
			this.resolveBtnHover('btnListHandler',this.btnListX,this.btnSizeLarge);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(this.btnListX - incre,this.btnCenterY,r,0,PI2,false);
			ctx.moveTo(this.btnListX,this.btnCenterY);
			ctx.arc(this.btnListX,this.btnCenterY,r,0,PI2,false);
			ctx.moveTo(this.btnListX + incre,this.btnCenterY);
			ctx.arc(this.btnListX + incre,this.btnCenterY,r,0,PI2,false);
			ctx.fill();
			ctx.restore();
		},
		drawInfoButtons : function (){
			this.ctx.lineWidth = this.btnLineWidth;
			this.ctx.strokeStyle = this.infoPlateColor > .7 ? '#eee' : 'rgba(255,255,255,.4)';
			this.ctx.fillStyle = this.infoPlateColor > .7 ? '#eee' : 'rgba(255,255,255,.4)';
			this.drawAddBtn();
			this.drawPlayListBtn();
			this.drawProgressBtns();
			this.drawListBtn();
		},
		btnAddHandler : function (){
			this.input.click();
		},
		btnPLHandler : function (){
			this.isPlayListNeeded = !this.isPlayListNeeded;
			this.speedAngle = 0;
		},
		btnPrevHandler : function (){
			this.switchMusic((this.curMusic + this.musics.length - 1)%this.musics.length);
		},
		btnNextHandler : function (){
			this.switchMusic((this.curMusic + 1)%this.musics.length);
		},
		btnPlayHandler : function (){
			if(this.isPaused)
				this.audio.play();
			else
				this.audio.pause();
			this.isPaused = !this.isPaused;
		},
		btnListHandler : function (){
			this.modeListNeeded = !this.modeListNeeded;
		},
		drawLi : function (idx,text,x,y,w,h,color,colorHover,handler){
			var ctx = this.ctx;
			ctx.beginPath();
			ctx.rect(x,y,w,h);
			if(ctx.isPointInPath(this.mouseX,this.mouseY)){
				ctx.fillStyle = colorHover;
				this.hoveredTargetHandler = handler;
				this.hoveredTargetValue = idx;
			}else
				ctx.fillStyle = color;
			ctx.fill();
			ctx.fillStyle = '#fff';
			ctx.fillText(text.replace('to',''),x + w/2,y + h/2);
		},
		showModeList : function (){
			for(var i = 0;i < this.modes.length;i++){
				this.drawLi(i,this.modes[i],this.modeListX,this.modeListY + i*(this.modeListH + 2),this.modeListW,this.modeListH,i === this.curMode ? '#333' : 'rgba(0,0,0,.5)','#333','switchMode');
			}
		},
		showTips : function (){
			var ctx = this.ctx,
				width;
			ctx.font = '50px "Microsoft Yahei"';
			width = ctx.measureText(this.tipsMsg).width + 80;
			ctx.beginPath();
			ctx.save();
			ctx.fillStyle = 'rgba(0,0,0,.8)';
			ctx.fillRect(this.centerX - width/2,this.centerY - 40,width,80);
			ctx.fillStyle = '#fff';
			ctx.fillText(this.tipsMsg,this.centerX,this.centerY);
			ctx.restore();
		},
		showInfo : function (){
			var context = this.ctx;
			this.drawInfoPlate();
			this.drawTitle();
			this.drawInfoButtons();
		},
		distributePL : function (){
			var loc,
				angleDelta = PI2/this.musics.length,
				angle,
				z,
				w,
				h,
				p = this.perspective,
				ratio;
			this.PLRadius = ~~(this.PLBetween/angleDelta);
			this.PLData = [];
			for(var i = 0;i < this.musics.length;i++){
				angle = i*angleDelta;
				z = this.PLRadius*cos(angle);
				y = this.PLRadius*sin(angle);
				ratio = p/(p - z);
				w = ratio*this.PLWidth;
				h = ratio*this.PLHeight;
				this.PLData[i] = {angle:angle,y:y,z:z,w:w,h:h,coordX:this.centerX - w/2,coordY:this.centerY - h/2 - y,font:ratio*this.PLFS,idx:(i + this.curMusic)%this.musics.length};
			}
		},
		findClosest : function (arr,key){
			var li;
			for(var i = arr.length - 1;i >= 0;i--){
				li = arr[i];
				this.ctx.beginPath();
				this.ctx.rect(li.coordX,li.coordY,li.w,li.h);
				if(this.ctx.isPointInPath(this.mouseX,this.mouseY)){
					this.hoveredTargetHandler = 'switchMusic';
					this.hoveredTargetValue = li.idx;
					return i;
				}
			}
		},
		handlePLSpeed : function (){
			this.speedAngle *= .98;
		},
		calcPLLoc : function (li){
			if(Math.abs(this.speedAngle) > .001){
				var speed = this.speedAngle,
					z,
					p = this.perspective;
				li.angle += speed;
				z = cos(speed)*li.z - sin(speed)*li.y;
				li.y = cos(speed)*li.y + sin(speed)*li.z;
				li.z = z;
				p = p/(p - z);
				li.w = p*this.PLWidth;
				li.h = p*this.PLHeight;
				li.coordX = this.centerX - li.w/2;
				li.coordY = this.centerY - li.h/2 - li.y;
				li.font = this.PLFS*p;
			}
		},
		drawPLLi : function (text,x,y,w,h,color,font){
			var ctx = this.ctx;
			ctx.beginPath();
			ctx.rect(x,y,w,h);
			ctx.fillStyle = color;
			ctx.fill();
			ctx.fillStyle = '#fff';
			ctx.font = font;
			ctx.fillText(text.replace('to',''),x + w/2,y + h/2);
		},
		showPlayList : function (){
			var li,
				closest;
			this.handlePLSpeed();
			this.PLData.sort(function (a,b){
				return a.z - b.z;
			});
			closest = this.findClosest(this.PLData);
			for(var i = 0;i < this.PLData.length;i++){
				li = this.PLData[i];
				this.calcPLLoc(li);
				this.drawPLLi(this.musicNames[li.idx],li.coordX,li.coordY,li.w,li.h,i === closest ? '#f2992e' : '#333',li.font + 'px "Microsoft Yahei"');
			}
		},
		showProgressHint : function (){
			var ctx = this.ctx;
			ctx.beginPath();
			ctx.fillStyle = '#333';
			ctx.font = this.PLFont;
			ctx.fillText(this.progressMsg,this.mouseX,this.mouseY);
		},
		drawStar : function (centerX,centerY,innerR,outerR,color){
			var ctx = this.ctx,
				a;
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(centerX,centerY-outerR);
			for(var i = 0;i < 5;i++){
				a = i*a72 + a36;
				ctx.lineTo(centerX + sin(a)*innerR,centerY - cos(a)*innerR);
				a = (i + 1)*a72;
				ctx.lineTo(centerX + sin(a)*outerR,centerY - cos(a)*outerR);
			}
			ctx.fillStyle = color;
			ctx.fill();
			ctx.restore();
		},
		drawStars : function (){
			var group,
				star,
				loc,
				newStars = [],
				p = this.perspective,
				ratio;
			for(var i = 0;i < this.stars.length;i++){
				group = this.stars[i];
				loc = group[0];
				loc.z += this.starSpeedZ;
				if(loc.z < this.starGroupLimit){
					loc.x += loc.speedX;
					loc.y += loc.speedY;
					ratio = p/(p - loc.z);
					newStars.push(group);
					for(var j = 1;j < group.length;j++){
						star = group[j];
						this.drawStar(star.x*ratio + loc.x,star.y*ratio + loc.y,this.starSize*ratio,this.starSize*ratio*2.5,star.color);
					}
				}
			}
			this.stars = newStars;
		},
		starOriginMove : function (){
			this.starOriginX += this.starOriginSpeedX;
			if(this.starOriginX <= this.starOriginLimit[0] || this.starOriginX >= this.starOriginLimit[1]){
				this.starOriginSpeedX *= -1;
				this.starOriginSpeedX += randomNum(-4,4);
			}
			this.starOriginY += this.starOriginSpeedY;
			if(this.starOriginY <= this.starOriginLimit[2] || this.starOriginY >= this.starOriginLimit[3]){
				this.starOriginSpeedY *= -1;
				this.starOriginSpeedX += randomNum(-4,4);
			}
		},
		justifyPointSpeed : function (p){
			if(p.x <= 0){
				p.x = 0;
				p.speedX *= -1;
			}else if(p.x >= this.width){
				p.x = this.width;
				p.speedX *= -1;
			}
			if(p.y <= this.infoAreaY){
				p.y = this.infoAreaY;
				p.speedY *= -1;
			}else if(p.y >= this.height){
				p.y = this.height;
				p.speedY *= -1;
			}
		},
		//waves
		toWaves : function (){
			var ctx = this.ctx,
				start = this.waveInterval/2,
				base = start + this.waveColWidth/2,
				x;
			this.analyser.getByteFrequencyData(this.frqData);
			ctx.beginPath();
			ctx.save();
			ctx.lineWidth = this.waveColWidth;
			ctx.strokeStyle = this.waveColor;
			for(var i = 0;i < this.frqLength;i++){
				x = base + this.waveWidth*i;
				ctx.moveTo(x,this.height);
				ctx.lineTo(x,this.height - this.waveMaxHeight*this.frqData[i]/255);
			}
			ctx.stroke();
			ctx.restore();
		},
		toStars : function (){
			var sum = 0,
				arr,
				that = this;
			this.analyser.getByteFrequencyData(this.frqData);
			sum += this.frqData[4] + this.frqData[10] + this.frqData[20];
			if(sum - this.starSum > 20){
				this.starOriginMove();
				arr = [{x:this.starOriginX,y:this.starOriginY,z:this.starOriginZ,speedX:(this.centerX - this.starOriginX)/180,speedY:(this.centerY - this.starOriginY)/180}];
				for(var i = 0;i < 12;i++){
					arr.push({x:randomNum(-this.starPosOffset,this.starPosOffset),y:randomNum(-this.starPosOffset,this.starPosOffset),color:Math.random() > .5 ? '#f2992e' : Math.random() < .5 ? '#fe0066' : '#529ecc'});
				}
				this.stars.unshift(arr);
			}
			this.starSum = sum;
			this.drawStars();
		},
		toLines : function (){
			var lines = this.linesSetting,
				ctx = this.ctx,
				p,
				arr,
				speeds = [],
				speedRatio;
			ctx.save();
			ctx.fillStyle = '#000';
			ctx.fillRect(0,0,this.width,this.height);
			ctx.lineWidth = 1;
			this.analyser.getByteFrequencyData(this.frqData);
			//draw trails
			for(var i = 0;i < lines.trails.length;i++){
				ctx.beginPath();
				arr = lines.trails[i];
				ctx.strokeStyle = arr[0].replace('op',(i + 1)*lines.opIncre);
				ctx.moveTo(arr[1].x,arr[1].y);
				for(var j = 2;j < arr.length;j++){
					ctx.lineTo(arr[j].x,arr[j].y);
				}
				ctx.closePath();
				ctx.stroke();
			}
			//resolve color
			speeds[0] = ~~((this.frqData[0] + this.frqData[2] + this.frqData[5])/3/30);
			speeds[1] = ~~((this.frqData[10] + this.frqData[12] + this.frqData[14])/3/30);
			speeds[2] = ~~((this.frqData[20] + this.frqData[22] + this.frqData[25])/3/30);
			for(var i = 0;i < 3;i++){
				lines.colors[i] += lines.factors[i]*speeds[i];
				if(lines.colors[i] > 255){
					lines.colors[i] = 255;
					lines.factors[i] *= -1;
				}else if(lines.colors[i] < 0){
					lines.colors[i] = 0;
					lines.factors[i] *= -1;
				}
			}
			//draw new line
			speedRatio = (speeds[0] + speeds[1] + speeds[2])/3/2;
			arr = [];
			arr.push('rgba('+lines.colors[0]+','+lines.colors[1]+','+lines.colors[2]+',op)');
			p = lines.points[0];
			ctx.beginPath();
			p.x += p.speedX;
			p.y += p.speedY;
			this.justifyPointSpeed(p);
			ctx.beginPath();
			ctx.moveTo(p.x,p.y);
			arr.push({x:p.x,y:p.y});
			for(var i = 1;i < lines.points.length;i++){
				p = lines.points[i];
				p.x += p.speedX*speedRatio;
				p.y += p.speedY*speedRatio;
				this.justifyPointSpeed(p);
				ctx.lineTo(p.x,p.y);
				arr.push({x:p.x,y:p.y});
			}
			ctx.closePath();
			ctx.stroke();
			lines.trails.push(arr);
			if(lines.trails.length > lines.trailLimit)
				lines.trails.shift();
			ctx.restore();
		},
		toVortex : function (){

		},
		addMusic : function (musics){
			var len = this.musics.length;
			for(var i = 0;i < musics.length;i++){
				if(/audio/.test(musics[i].type)){
					this.musics.push(URL.createObjectURL(musics[i]));
					this.musicNames.push(musics[i].name);
				}
			}
			if(this.isStopped) this.switchMusic(len);
			this.distributePL();
		},
		removeMusic : function (){
			var that = this;
			this.tipsNeeded = true;
			this.tipsMsg = '浏览器不支持文件 ' + this.musicNames[this.curMusic];
			global.clearTimeout(this.tipTimer);
			this.tipTimer = global.setTimeout(function (){
				that.tipsNeeded = false;
			},2000);
			this.musics.splice(this.curMusic,1);
			this.musicNames.splice(this.curMusic,1);
			if(this.musics.length){
				this.switchMusic((this.curMusic + 1)%this.musics.length);
			}else{
				this.curMusicName = 'No music available!';
				this.isStopped = true;
			}
			this.distributePL();
		},
		switchMode : function (idx){
			this.curMode = idx;
		},
		switchMusic : function (index){
			this.isStopped = false;
			this.audio.src = this.musics[index];
			this.curMusic = index;
			this.curMusicName = 'Loading...';
			if(!this.isPlayListNeeded){
				this.distributePL();
			}
		},
		resetTitle : function (){
			this.curMusicName = this.musicNames[this.curMusic];
			this.ctx.font = this.titleFont;
			this.titleWidth = this.ctx.measureText(this.curMusicName).width;
			this.titleLeft = (this.width - this.titleWidth)/2;
			this.titleRight = this.titleWidth + this.titleLeft;
		}
	}
	global.SimplePlayer = SimplePlayer;
})(window);