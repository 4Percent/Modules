(function (global){
	var requestFrame = global.requestAnimationFrame ? function (fn){
			return global.requestAnimationFrame(fn);
		} : function (fn){
			return global.setTimeout(fn,20);
		},
		cancelFrame = global.cancelAnimationFrame ? function (timer){
			global.cancelAnimationFrame(timer);
		} : function (timer){
			global.clearTimeout(timer);
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
				return ret;
			});
		},
		getStyle = global.getComputedStyle ? function (elt,prop){
			return parseFloat(global.getComputedStyle(elt,'')[prop]);
		} : function (elt,prop){
			return parseFloat(elt.currentStyle[prop]);
		},
		Tween = {
			linear: function(t,b,c,d){ return c*t/d + b; },
			easeIn: function(t,b,c,d){
				return c*(t/=d)*t*t + b;
			},
			easeOut: function(t,b,c,d){
				return c*((t=t/d-1)*t*t + 1) + b;
			},
			bounce: function(t,b,c,d){
				if ((t/=d) < (1/2.75)) {
					return c*(7.5625*t*t) + b;
				} else if (t < (2/2.75)) {
					return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
				} else if (t < (2.5/2.75)) {
					return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
				} else {
					return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
				}
			}
		},
		isIE8 = /MSIE\s*8.0/.test(global.navigator.userAgent),
		isFF = /firefox/i.test(global.navigator.userAgent);
	function randomNum(n,m){
		return Math.floor(Math.random()*(m - n + 1) + n);
	}
	function SimpleCarousel(container,setting){
		if(!container)
			return;
		setting = setting || {};
		this.con = container;
		this.cards = container.querySelectorAll('.m-crs-card');
		this.duration = setting.duration || 400;
		this.easing = Tween[setting.easing] || Tween.easeOut;
		this.defaultBtns = setting.btns;
		this.defaultBtnMode = setting.btnMode;
		this.defaultTabs = setting.tabs;
		this.defaultTabMode = setting.tabMode;
		this.autoPlayMode = setting.autoPlay;
		this.autoPlayInterval = setting.autoPlayInterval;
		this.allModes = ['horizontal','vertical','fade','cover'];
		this.init();
	}
	SimpleCarousel.prototype = {
		constructor : SimpleCarousel,
		init : function (){
			this.curIdx = 0;
			this.isOperational = true;
			this.initAttrs();
			this.resetStyle();
			if(this.defaultBtns){
				this.createDefaultBtns();
				delete this.defaultBtns;
			}
			if(this.defaultTabs){
				this.createDefaultTabs(this.defaultTabs);
				delete this.defaultTabs;
			}
			if(this.autoPlayMode){
				this.startAutoPlay();
			}
		},
		initAttrs : function (){
			this.activeTabs = [];
			this.actClazzes = [];
			this.cardCount = this.cards.length;
			this.cardWidth = this.cards[0].offsetWidth;
			this.cardHeight = this.cards[0].offsetHeight;
		},
		resetStyle : function (){
			var card;
			this.cards[0].style.left = 0;
			this.cards[0].style.top = 0;
			for(var i = 1;i < this.cards.length;i++){
				card = this.cards[i];
				card.style.left = this.cardWidth + 'px';
				card.style.top = 0 + 'px';
			}
		},
		createDefaultBtns : function (){
			var frag = document.createDocumentFragment(),
				left = document.createElement('a'),
				right = document.createElement('a'),
				height = ~~(this.cardHeight/8);
			left.className = 'm-crs-btnL';
			right.className = 'm-crs-btnR';
			left.href = right.href = 'javascript:;';
			left.innerHTML = 'Prev';
			right.innerHTML = 'Next';
			left.style.cssText = right.style.cssText = 'width:' + ~~(this.cardWidth/10) + 'px;height:' + height + 'px;margin-top:' + -height/2 + 'px;font-size:' + ~~(this.cardWidth/30) + 'px;line-height:' + height + 'px';
			frag.appendChild(left);
			frag.appendChild(right);
			this.con.appendChild(frag);
			this.addBtn(left,this.defaultBtnMode,-1);
			this.addBtn(right,this.defaultBtnMode,1);
			delete this.defaultBtnMode;
		},
		createDefaultTabs : function (direc){
			var wrap = document.createElement('ol'),
				size,
				margin,
				length,
				str = '';
			if(/^h/i.test(direc)){
				wrap.className = 'm-crs-tabWrap-h';
				size = ~~(this.cardWidth/25);
				margin = ~~(size/2);
				length = (margin*2 + size)*this.cards.length;
				wrap.style.width = length + 'px';
			}else{
				wrap.className = 'm-crs-tabWrap-v';
				size = ~~(this.cardHeight/25);
				margin = ~~(size/2);
				length = (margin*2 + size)*this.cards.length;
				wrap.style.height = length + 'px';
			}
			
			for(var i = 0;i < this.cards.length;i++){
				str += '<li style="width:'+size+'px;height:'+size+'px;margin:'+margin+'px;"></li>';
			}
			wrap.innerHTML = str;
			wrap.children[0].className = 'm-crs-act';
			this.con.appendChild(wrap);
			this.addTabs(wrap,this.defaultTabMode,'m-crs-act');
			delete this.defaultTabMode;
		},
		addBtn : function (btn,mode,incre){
			var that = this;
			addEvent(btn,'click',function (){
				if(that.isOperational){
					var idx = (that.curIdx + incre + that.cardCount)%that.cardCount;
					that.isOperational = false;
					that[mode](idx);
					that.switchTab(idx);
				}
			});
			addEvent(btn,'mousedown',function (e){
				e.preventDefault();
			});
		},
		addTabs : function (tabs,mode,actClass){
			var that = this;
			this.activeTabs.push(tabs);
			this.actClazzes.push(actClass);
			for(var i = 0;i < tabs.children.length;i++){
				(function (idx){
					addEvent(tabs.children[i],'click',function (){
						if(that.isOperational && idx !== that.curIdx){
							that.isOperational = false;
							that[mode](idx);
							that.switchTab(idx);
						}
					});
					addEvent(tabs.children[i],'mousedown',function (e){
						e.preventDefault();
					});
				})(i);
			}
		},
		switchTab : function (idx){
			var tabWrap,
				actClass;
			for(var i = 0;i < this.activeTabs.length;i++){
				tabWrap = this.activeTabs[i];
				actClass = this.actClazzes[i];
				tabWrap.children[this.curIdx].className = tabWrap.children[this.curIdx].className.replace(new RegExp('\\b' + actClass + '\\b'),'').replace(/\s+/g,' ').replace(/^\s|\s$/g,'');
				tabWrap.children[idx].className += ' ' + actClass;
			}
			if(this.autoPlayMode && !this.isMouseEntered){
				clearTimeout(this.autoPlayTimer);
				this.autoPlayFn();
			}
			this.curIdx = idx;
		},
		//data : [{elt:elt,prop:prop,dst:dst},...]
		animate : function (data,complete){
			var totalFrames = ~~(this.duration/20),
				curFrame = 0,
				easing = this.easing,
				that = this;
			for(var i = 0;i < data.length;i++){
				data[i].base = getStyle(data[i].elt,data[i].prop);
				data[i].incre = data[i].dst - data[i].base;
			}
			requestFrame(function doFrame(){
				var progress,
					d;
				curFrame++;
				for(var i = 0;i < data.length;i++){
					d = data[i];
					progress = easing(curFrame,d.base,d.incre,totalFrames);
					if(d.prop === 'opacity'){
						d.elt.style.opacity = progress;
						d.elt.style.filter = 'alpha(opacity='+progress*100+')';
					}else{
						d.elt.style[d.prop] = progress + 'px';
					}
				}
				if(curFrame < totalFrames){
					requestFrame(doFrame);
				}else{
					complete && complete();
					that.isOperational = true;
				}
			});
		},
		randomMode : function (idx){
			this[this.allModes[randomNum(0,this.allModes.length - 1)]](idx);
		},
		setModeToTranslate : function (mode,fn){
			var card;
			this.con.style.overflow = 'hidden';
			this.mode = mode;
			for(var i = 0;i < this.cards.length;i++){
				card = this.cards[i];
				card.style.opacity = 1;
				card.style.filter = 'alpha(opacity=100)';
				card.style.width = this.cardWidth + 'px';
				card.style.height = this.cardHeight + 'px';
				fn(card,i === this.curIdx);
			}
		},
		translate : function (mode,idx,prop,otherProp,value){
			var curCard = this.cards[this.curIdx],
				card = this.cards[idx],
				dst,
				that = this;
			if(this.mode !== mode){
				this.setModeToTranslate(mode,function (card,isCur){
					card.style[otherProp] = 0;
					if(isCur)
						card.style[prop] = 0;
					else
						card.style[prop] = value + 'px';
				});
			}
			if(idx < this.curIdx && !(this.curIdx === this.cardCount - 1 && idx === 0) || (this.curIdx === 0 && idx === this.cardCount - 1)){
				card.style[prop] = -value + 'px';
				dst = value;
			}else{
				card.style[prop] = value + 'px';
				dst = -value;
			}
			this.animate([{elt:curCard,prop:prop,dst:dst},{elt:card,prop:prop,dst:0}]);
		},
		horizontal : function (idx){
			this.translate('horizontal',idx,'left','top',this.cardWidth);
		},
		vertical : function (idx){
			this.translate('vertical',idx,'top','left',this.cardHeight);
		},
		setModeToFade : function (mode){
			var card;
			for(var i = 0;i < this.cardCount;i++){
				card = this.cards[i];
				if(i === this.curIdx){
					card.style.opacity = 1;
					if(isIE8)
						card.style.filter = 'alpha(opacity=100)';
					card.style.zIndex = 10;
				}else{
					card.style.opacity = 0;
					if(isIE8)
						card.style.filter = 'alpha(opacity=0)';
					card.style.zIndex = 0;
				}
				card.style.left = 0;
				card.style.top = 0;
				this.con.style.overflow = 'visible';
			}
			this.mode = mode;
		},
		fade : function (idx){
			var card = this.cards[idx],
				curCard = this.cards[this.curIdx];
			if(this.mode !== 'fade'){
				this.setModeToFade('fade');
			}
			curCard.style.zIndex = 0;
			card.style.zIndex = 10;
			this.animate([{elt:card,prop:'opacity',dst:1},{elt:curCard,prop:'opacity',dst:0}]);
		},
		cover : function (idx){
			var card = this.cards[idx],
				curCard = this.cards[this.curIdx],
				width = this.cardWidth,
				height = this.cardHeight,
				fs = getStyle(card,'fontSize'),
				lh = getStyle(card,'lineHeight');
			if(this.mode !== 'cover'){
				this.setModeToFade('cover');
			}
			curCard.style.zIndex = 5;
			card.style.zIndex = 10;
			card.style.width = width*1.4 + 'px';
			card.style.height = height*1.4 + 'px';
			card.style.left = -width*.2 + 'px';
			card.style.top = -height*.2 + 'px';
			card.style.opacity = 0;
			card.style.fontSize = fs*1.4 + 'px';
			card.style.lineHeight = lh*1.4 + 'px';
			card.style.filter = 'alpha(opacity=100)';
			this.animate([{elt:card,prop:'opacity',dst:1},{elt:card,prop:'width',dst:width},{elt:card,prop:'height',dst:height},{elt:card,prop:'left',dst:0},{elt:card,prop:'top',dst:0},{elt:card,prop:'fontSize',dst:fs},{elt:card,prop:'lineHeight',dst:lh}],function (){
				curCard.style.zIndex = 0;
			});
		},
		startAutoPlay : function (){
			var fn = this[this.autoPlayMode],
				interval = this.autoPlayInterval,
				that = this;
			delete this.autoPlayInterval;
			function _next(mode){
				if(!that.isOperational){
					that.autoPlayFn();
					return;
				}
				that.isOperational = false;
				var idx = (that.curIdx + 1)%that.cardCount;
				fn.call(that,idx);
				that.switchTab(idx);
			}
			this.autoPlayFn = function (){
				that.autoPlayTimer = setTimeout(_next,interval);
			}
			this.autoPlayFn();
			addEvent(this.con,'mouseenter',function (){
				that.isMouseEntered = true;
				clearTimeout(that.autoPlayTimer);
			});
			addEvent(this.con,'mouseleave',function (){
				that.isMouseEntered = false;
				that.autoPlayFn();
			});
		},
		stop : function (){
			global.clearTimeout(this.autoPlayTimer);
		},
		restart : function (){
			this.autoPlayFn();
		}
	}

	//Css3
	var oriInitAttrs = SimpleCarousel.prototype.initAttrs;
	function Css3Carousel(container,setting){
		setting = setting || {};
		this.con = container;
		this.cards = container.querySelectorAll('.m-crs-card');
		this.duration = setting.duration || 400;
		this.transDuration = this.duration/1000;
		this.easing = Tween[setting.easing] || Tween.easeOut;
		this.cols = setting.cols;
		this.rows = setting.rows;
		this.openInNewWindow = setting.newWindow;
		this.perspective = setting.perspective || 1000;
		this.defaultBtns = setting.btns;
		this.defaultBtnMode = setting.btnMode;
		this.defaultTabs = setting.tabs;
		this.defaultTabMode = setting.tabMode;
		this.autoPlayMode = setting.autoPlay;
		this.autoPlayInterval = setting.autoPlayInterval;
		this.allModes = ['explode','blowaway','adboard','reverse','flipover','cube','horizontal','vertical','fade','cover'];
		this.init();
	}
	Css3Carousel.prototype = new SimpleCarousel();
	Css3Carousel.prototype.extend = function (json){
		for(var name in json){
			this[name] = json[name];
		}
	}
	Css3Carousel.prototype.extend({
		initAttrs : function (){
			oriInitAttrs.call(this);
			var card;
			this.bgs = [];
			this.refs = [];
			for(var i = 0;i < this.cards.length;i++){
				card = this.cards[i];
				this.bgs.push(card.querySelector('img').src);
				if(card.tagName === 'A')
					this.refs.push(card.href);
				else
					this.refs.push(card.querySelector('a').href);
			}
			this.cellWidth = this.cardWidth/this.cols;
			this.cellHeight = this.cardHeight/this.rows;
			this.centerX = this.cardWidth/2;
			this.centerY = this.cardHeight/2;
			this.con.style.perspective = this.perspective + 'px';
			this.initBricksAndPlates();
			this.initMaskAnchor();
			this.initCubeFaces();
			this.initPages();
		},
		initBricksAndPlates : function (){
			var brick,
				that = this,
				centerX = this.centerX,
				centerY = this.centerY,
				brick,
				disX,
				disY,
				totalDis,
				angleZ,
				angleXY,
				F,
				sum = this.cols + this.rows - 2,
				ratio,
				blowDstX = -this.cardWidth,
				blowDstY = -this.cardHeight;
			this.bricks = [];
			this.plates = [];
			this.explodeDuration = this.transDuration*1.5;
			this.groundZero = ~~(Math.min(this.cardWidth,this.cardHeight)/2);
			this.initialForce = this.groundZero*this.groundZero*this.perspective*.6;
			for(var i = 0;i < this.rows;i++){
				for(var j = 0;j < this.cols;j++){
					brick = document.createElement('span');
					brick.className = 'm-crs-brick';
					brick.style.cssText = 'width:'+this.cellWidth+'px;height:'+this.cellHeight+'px;left:'+j*this.cellWidth+'px;top:'+i*this.cellHeight+'px;background-image:url('+this.bgs[this.curIdx]+');background-position:-'+j*this.cellWidth+'px -'+i*this.cellHeight+'px;background-size:'+this.cardWidth+'px '+this.cardHeight+'px;';
					brick.centerX = j*this.cellWidth + this.cellWidth/2;
					brick.centerY = i*this.cellHeight + this.cellHeight/2;
					disX = brick.centerX - centerX;
					disY = brick.centerY - centerY;
					totalDis = Math.sqrt(disX*disX + disY*disY);
					angleXY = Math.atan2(disY,disX);
					angleZ = Math.atan2(this.groundZero,totalDis);
					totalDis = totalDis*totalDis + this.groundZero*this.groundZero;
					F = this.initialForce/totalDis;
					brick.Fz = ~~(Math.sin(angleZ)*F);
					F = Math.cos(angleZ)*F;
					brick.Fx = ~~(Math.cos(angleXY)*F);
					brick.Fy = ~~(Math.sin(angleXY)*F);
					ratio = (i + j)/sum;
					brick.blowX = ~~((ratio*Math.random() + .3)*blowDstX);
					brick.blowY = ~~((ratio*Math.random() + .3)*blowDstY);
					brick.blowZ = ~~((ratio*Math.random() + .2)*this.perspective*1.2);
					this.bricks.push(brick);
				}
			}
			this.bricks[0].addEventListener('transitionend',function (){
				if(that.mode !== 'bricks')
					return;
				if(that.isOperational)
					return;
				that.resetBricks();
				that.isOperational = true;
			},false);
			//for adboard
			this.bricks[this.bricks.length - 1].addEventListener('transitionend',function (){
				if(that.mode !== 'adboard' || !this.realEnd)
					return;
				that.resetBricks();
				that.isOperational = true;
			});
		},
		initMaskAnchor : function (){
			var that = this,
				count = 0;
			this.maskAnchor = document.createElement('a');
			this.maskAnchor.href = this.refs[0];
			this.openInNewWindow && (this.maskAnchor.target = '_blank');
			this.maskAnchor.className = 'm-crs-maskAnchor';
			if(isFF){
				this.maskAnchorImg = document.createElement('img');
				this.maskAnchor.appendChild(this.maskAnchorImg);
			}
			this.con.appendChild(this.maskAnchor);
			this.maskAnchor.addEventListener('transitionend',function (){
				if(that.mode !== 'reverse')
					return;
				if(++count%2){
					that.setMaskAnchorBg(this.nextIdx);
					this.style.transition = 'none';
					this.style.transform = 'rotate3d(0,1,0,-90deg)';
					this.offsetWidth;
					this.style.transition = that.transDuration/2 + 's all linear';
					this.style.transform = 'rotate3d(0,1,0,0deg)';
				}else{
					this.style.transition = 'none';
					that.maskAnchor.style.transform = 'none';
					that.isOperational = true;
				}
			});
		},
		initCubeFaces : function (){
			var that = this;
			this.cubeFront = document.createElement('div');
			this.cubeBack = document.createElement('div');
			this.cubeFront.className = this.cubeBack.className = 'm-crs-cubeface';
			this.cubeFront.style.transformOrigin = this.cubeBack.style.transformOrigin = '50% 50% ' + -this.cardWidth/2 + 'px';
			this.cubeFront.addEventListener('transitionend',function (){
				this.style.transition = that.cubeBack.style.transition = 'none';
				this.style.backgroundImage = that.cubeBack.style.backgroundImage;
				this.style.transform = 'rotate3d(0,1,0,0deg)';
				that.cubeBack.style.transform = 'rotate3d(0,1,0,90deg)';
				that.isOperational = true;
			},false);
		},
		initPages : function (){
			var count = 0,
				that = this;
			this.pageCover = document.createElement('div');
			this.pageBack = document.createElement('div');
			this.pageCover.className = 'm-crs-pagecover';
			this.pageBack.className = 'm-crs-pageback';
			this.pageCover.style.backgroundSize = this.pageBack.style.backgroundSize = this.cardWidth + 'px '+this.cardHeight+'px';
			this.pageCover.addEventListener('transitionend',function (){
				if(++count%2){
					this.style.transition = 'none';
					this.style.backgroundImage = 'url('+that.bgs[that.curIdx]+')';
					this.offsetWidth;
					if(this.leftToRight){
						this.style.left = '50%';
						this.style.backgroundPosition = '100% 0';
						this.style.transformOrigin = '0 0';
						this.style.transform = 'rotate3d(0,1,0,-90deg)';
					}else{
						this.style.left = 0;
						this.style.backgroundPosition = '0 0';
						this.style.transformOrigin = '100% 0';
						this.style.transform = 'rotate3d(0,1,0,90deg)';
					}
					this.offsetWidth;
					this.style.transition = that.transDuration/2 + 's all linear';
					this.style.transform = 'rotate3d(0,1,0,0deg)';
				}else{
					that.cards[that.curIdx].style.display = 'block';
					that.cards[this.lastIdx].style.display = 'none';
					this.style.transition = 'none';
					this.style.transform = 'none';
					that.isOperational = true;
				}
			},false);
		},
		resetStyle : function (){
			var card;
			this.cards[0].transform = 'translate3d(0,0,0)';
			for(var i = 1;i < this.cards.length;i++){
				card = this.cards[i];
				card.style.transform = 'translate3d('+this.cardWidth+'px,0,0)';
			}
		},
		setMaskAnchorRef : function (idx){
			this.maskAnchor.href = this.refs[idx];
		},
		resetBricks : function (){
			for(var i = 0;i < this.bricks.length;i++){
				this.bricks[i].style.transition = 'none';
				this.bricks[i].style.backgroundImage = 'url('+this.bgs[this.curIdx]+')';
				this.bricks[i].style.opacity = 1;
				this.bricks[i].style.transform = 'none';
				this.bricks[i].offsetWidth;
			}
		},
		setModeToBricks : function (){
			var frag = document.createDocumentFragment();
			this.resetMode('bricks');
			this.con.style.overflow = 'visible';
			this.con.style.perspective = this.perspective + 'px';
			for(var i = 0;i < this.bricks.length;i++){
				this.bricks[i].className = 'm-crs-brick';
				this.bricks[i].style.transform = 'none';
				this.bricks[i].style.backgroundImage = 'url('+this.bgs[this.curIdx]+')';
				frag.appendChild(this.bricks[i]);
			}
			for(var i = 0;i < this.cards.length;i++){
				this.cards[i].style.transform = 'none';
				this.cards[i].style.display = i === this.curIdx ? 'block' : 'none';
			}
			this.con.appendChild(frag);
			this.mode = 'bricks';
		},
		clearBricks : function (){
			for(var i = 0;i < this.bricks.length;i++){
				this.con.removeChild(this.bricks[i]);
			}
		},
		explode : function (idx){
			if(this.mode !== 'bricks'){
				this.setModeToBricks();
			}
			var card = this.cards[idx],
				curCard = this.cards[this.curIdx];
			card.style.display = 'block';
			curCard.style.display = 'none';
			this.setMaskAnchorRef(idx);
			for(var i = 0;i < this.bricks.length;i++){
				brick = this.bricks[i];
				brick.offsetWidth;
				brick.style.transition = this.explodeDuration + 's all cubic-bezier(0,1.1,1,1)';
				brick.style.opacity = 0;
				brick.style.transform = 'translate3d('+brick.Fx+'px,'+brick.Fy+'px,'+brick.Fz+'px) rotate3d('+Math.random()+','+Math.random()+','+Math.random()+','+randomNum(30,1080)+'deg)';
			}
		},
		blowaway : function (idx){
			if(this.mode !== 'bricks'){
				this.setModeToBricks();
			}
			var card = this.cards[idx],
				curCard = this.cards[this.curIdx],
				that = this,
				sum = this.cols + this.rows - 2;
			curCard.style.display = 'none';
			card.style.display = 'block';
			this.setMaskAnchorRef(idx);
			for(var i = 0;i < this.rows;i++){
				for(var j = 0;j < this.cols;j++){
					(function (){
						var index = i*that.cols + j,
							brick = that.bricks[index];
						setTimeout(function (){
							brick.style.transition = that.transDuration + 's all cubic-bezier(0,0,0.4,1)';
							brick.style.opacity = 0;
							brick.style.transform = 'translate3d('+brick.blowX+'px,'+brick.blowY+'px,'+brick.blowZ+'px) rotate3d('+Math.random()+','+Math.random()+','+Math.random()+','+randomNum(30,360)+'deg)';
						},20 + (sum - i - j)*80);
					})();
				}
			}
		},
		setModeToAdboard : function (){
			var frag = document.createDocumentFragment();
			this.resetMode('adboard');
			this.con.style.overflow = 'visible';
			this.con.style.perspective = 'none';
			for(var i = 0;i < this.bricks.length;i++){
				this.bricks[i].style.backgroundImage = 'url('+this.bgs[this.curIdx]+')';
				this.bricks[i].style.transform = 'perspective('+this.perspective+'px)';
				frag.appendChild(this.bricks[i]);
				this.bricks[i].offsetWidth;
			}
			this.con.appendChild(frag);
			for(var i = 0;i < this.cards.length;i++){
				this.cards[i].style.display = 'none';
			}
			this.mode = 'adboard';
		},
		adboard : function (idx){
			if(this.mode !== 'adboard'){
				this.setModeToAdboard();
			}
			this.setMaskAnchorRef(idx);
			var card = this.cards[idx],
				curCard = this.cards[this.curIdx],
				that = this;
			this.bricks[this.bricks.length - 1].realEnd = false;
			for(var i = 0;i < this.rows;i++){
				for(var j = 0;j < this.cols;j++){
					(function (){
						var index = i*that.cols + j,
							brick = that.bricks[index];
						brick.style.transition = that.transDuration/2 + 's all linear';
						setTimeout(function (){
							setTimeout(function (){
								if(index === that.bricks.length - 1)
									brick.realEnd = true;
								brick.style.transition = 'none';
								brick.style.backgroundImage = 'url('+that.bgs[idx]+')';
								brick.style.transform = 'perspective('+that.perspective+'px) rotate3d(0,1,0,-90deg)';
								brick.offsetWidth;
								setTimeout(function (){
									brick.style.transition = that.transDuration/2 + 's all linear';
									brick.style.transform = 'perspective('+that.perspective+'px) rotate3d(0,1,0,0deg)';
								},20);
							},that.transDuration/2*1000);
							brick.style.transform = 'perspective('+that.perspective+'px) rotate3d(0,1,0,90deg)';
						},(i + j)*80 + 20);
					})();
				}
			}
		},
		setModeToReverse : function (){
			this.resetMode();
			this.con.style.overflow = 'visible';
			this.con.style.perspective = this.perspective + 'px';
			for(var i = 0;i < this.cards.length;i++){
				this.cards[i].style.display = 'none';
			}
			this.setMaskAnchorBg(this.curIdx);
			this.maskAnchor.offsetWidth;
			this.mode = 'reverse';
		},
		setMaskAnchorBg : isFF ? function (idx){
			this.maskAnchor.children[0].src = this.bgs[idx];
		} : function (idx){
			this.maskAnchor.style.backgroundImage = 'url('+this.bgs[idx]+')';
		},
		clearMaskAnchorBg : isFF ? function (){
			this.maskAnchorImg.removeAttribute('src');
		} : function (){
			this.maskAnchor.style.backgroundImage = 'none';
		},
		reverse : function (idx){
			var that = this,
				mask = this.maskAnchor;
			if(this.mode !== 'reverse'){
				this.setModeToReverse();
			}
			this.setMaskAnchorRef(idx);
			mask.nextIdx = idx;
			mask.style.transition = that.transDuration/2 + 's all linear';
			mask.style.transform = 'rotate3d(0,1,0,90deg)';
		},
		setModeToCube : function (){
			this.resetMode();
			this.con.style.perspective = this.perspective + 'px';
			this.con.style.overflow = 'visible';
			this.con.appendChild(this.cubeFront);
			this.con.appendChild(this.cubeBack);
			this.cubeBack.style.transform = 'rotateY(90deg)';
			this.cubeFront.style.backgroundImage = 'url('+this.bgs[this.curIdx]+')';
			this.cubeFront.offsetWidth;
			this.cubeBack.offsetWidth;
			for(var i = 0;i < this.cards.length;i++){
				this.cards[i].style.display = 'none';
			}
			this.mode = 'cube';
		},
		clearCubefaces : function (){
			this.con.removeChild(this.cubeFront);
			this.con.removeChild(this.cubeBack);
		},
		cube : function (idx){
			var card = this.cards[idx],
				curCard = this.cards[this.curIdx],
				toLeft;
			if(this.mode !== 'cube'){
				this.setModeToCube();
			}
			this.setMaskAnchorRef(idx);
			this.cubeBack.style.backgroundImage = 'url('+this.bgs[idx]+')';
			if(idx < this.curIdx && !(idx === 0 && this.curIdx === this.cardCount - 1) || idx === this.cardCount - 1 && this.curIdx === 0)
				toLeft = false;
			else
				toLeft = true;
			this.cubeBack.style.transform = toLeft ? 'rotate3d(0,1,0,90deg)' : 'rotate3d(0,1,0,-90deg)';
			this.cubeBack.offsetWidth;
			this.cubeFront.style.transition = this.cubeBack.style.transition = this.transDuration + 's all linear';
			this.cubeFront.style.transform = toLeft ? 'rotate3d(0,1,0,-90deg)' : 'rotate3d(0,1,0,90deg)';
			this.cubeBack.style.transform = 'rotate3d(0,1,0,0deg)';
		},
		setModeToFlipover : function (){
			this.resetMode();
			this.con.style.overflow = 'visible';
			for(var i = 0;i < this.cards.length;i++){
				this.cards[i].style.transform = 'none';
				this.cards[i].style.display = i === this.curIdx ? 'block' : 'none';
			}
			this.con.appendChild(this.pageBack);
			this.con.appendChild(this.pageCover);
			this.pageCover.style.backgroundImage = 'url('+this.bgs[this.curIdx]+')';
			this.mode = 'flipover';
		},
		clearFlipPages : function(){
			this.con.removeChild(this.pageCover);
			this.con.removeChild(this.pageBack);
		},
		flipover : function (idx){
			var card = this.cards[idx],
				curCard = this.cards[this.curIdx];
			if(this.mode !== 'flipover'){
				this.setModeToFlipover();
			}
			if(idx < this.curIdx && !(idx === 0 && this.curIdx === this.cardCount - 1) || idx === this.cardCount - 1 && this.curIdx === 0){
				this.pageCover.leftToRight = true;
			}else{
				this.pageCover.leftToRight = false;
			}
			this.setMaskAnchorRef(idx);
			this.pageBack.style.backgroundImage = 'url('+this.bgs[idx]+')';
			if(this.pageCover.leftToRight){
				this.pageBack.style.left = 0;
				this.pageBack.style.backgroundPosition = '0 0';
				this.pageCover.style.left = 0;
				this.pageCover.style.backgroundPosition = '0 0';
				this.pageCover.style.transformOrigin = '100% 0';
			}else{
				this.pageBack.style.left = '50%';
				this.pageBack.style.backgroundPosition = '100% 0';
				this.pageCover.style.left = '50%';
				this.pageCover.style.backgroundPosition = '100% 0';
				this.pageCover.style.transformOrigin = '0 0';
			}
			this.pageBack.offsetWidth;
			this.pageCover.offsetWidth;
			this.pageCover.lastIdx = this.curIdx;
			this.pageCover.style.transition = this.transDuration/2 + 's all linear';
			if(this.pageCover.leftToRight){
				this.pageCover.style.transform = 'rotate3d(0,1,0,90deg)';
			}else{
				this.pageCover.style.transform = 'rotate3d(0,1,0,-90deg)';
			}
		},
		resetMode : function (mode){
			switch(this.mode){
				case 'bricks':
				case 'adboard':
					if(mode !== 'bricks' && mode !== 'adboard')
						this.clearBricks();
					break;
				case 'cube':
					this.clearCubefaces();
					break;
				case 'reverse':
					this.clearMaskAnchorBg();
					break;
				case 'flipover':
					this.clearFlipPages();
					break;
				case 'translate':
					this.clearTranslate();
					break;
				case 'fade':
					this.clearFade();
			}
			this.con.style.overflow = 'hidden';
			this.con.style.perspective = this.perspective + 'px';
		},
		//override
		animate : function (data,complete){
			var totalFrames = ~~(this.duration/20),
				curFrame = 0,
				easing = this.easing,
				that = this;
			requestAnimationFrame(function doFrame(){
				curFrame++;
				var elt,
					d,
					progress;
				for(var i = 0;i < data.length;i++){
					d = data[i];
					elt = d.elt;
					progress = easing(curFrame,d.base,d.incre,totalFrames);
					switch(d.prop){
						case 'x':
							elt.style.transform = 'translate3d('+progress+'px,0,0)';
							break;
						case 'y':
							elt.style.transform = 'translate3d(0,'+progress+'px,0)';
							break;
						case 's':
							elt.style.transform = 'scale3d('+progress+','+progress+',1)';
							break;
						case 'o':
							elt.style.opacity = progress;
					}
				}
				if(curFrame === totalFrames){
					that.isOperational = true;
					complete && complete();
				}else{
					requestAnimationFrame(doFrame);
				}
			});
		},
		setModeToTranslate : function (){
			var card;
			this.resetMode();
			for(var i = 0;i < this.cards.length;i++){
				card = this.cards[i];
				card.style.display = 'block';
				card.style.transform = i === this.curIdx ? 'none' : 'translate3d('+this.cardWidth+'px,0,0)';
			}
			this.mode = 'translate';
		},
		clearTranslate : function (){
			for(var i = 0;i < this.cards.length;i++){
				this.cards[i].style.transition = 'none';
				this.cards[i].style.transform = 'none';
			}
		},
		translate : function (idx,prop,value){
			var curCard = this.cards[this.curIdx],
				card = this.cards[idx],
				base,
				that = this;
			if(this.mode !== 'translate'){
				this.setModeToTranslate();
			}
			if(idx < this.curIdx && !(this.curIdx === this.cardCount - 1 && idx === 0) || (this.curIdx === 0 && idx === this.cardCount - 1)){
				base = -1;
			}else{
				base = 1;
			}
			if(prop === 'x'){
				card.style.transform = 'translate3d('+base*value+',0,0)';
			}else{
				card.style.transform = 'translate3d(0,'+base*value+'px,0)';
			}
			this.animate([{elt:curCard,prop:prop,base:0,incre:-base*value},{elt:card,prop:prop,base:base*value,incre:-base*value}]);
		},
		horizontal : function (idx){
			this.setMaskAnchorRef(idx);
			this.translate(idx,'x',this.cardWidth);
		},
		vertical : function (idx){
			this.setMaskAnchorRef(idx);
			this.translate(idx,'y',this.cardHeight);
		},
		setModeToFade : function (){
			this.resetMode('fade');
			this.con.style.overflow = 'visible';
			for(var i = 0;i < this.cards.length;i++){
				this.cards[i].style.display = 'block';
				this.cards[i].style.transform = 'none';
				this.cards[i].style.opacity = i === this.curIdx ? 1 : 0;
				this.cards[i].style.zIndex = i === this.curIdx ? 10 : 0;
			}
			this.mode = 'fade';
		},
		clearFade : function (){
			for(var i = 0;i < this.cards.length;i++){
				this.cards[i].style.opacity = 1;
				this.cards[i].style.zIndex = 0;
				this.cards[i].style.transform = 'none';
			}
		},
		fade : function (idx){
			var card = this.cards[idx],
				curCard = this.cards[this.curIdx];
			if(this.mode !== 'fade'){
				this.setModeToFade('fade');
			}
			this.setMaskAnchorRef(idx);
			curCard.style.zIndex = 0;
			card.style.zIndex = 10;
			this.animate([{elt:card,prop:'o',base:0,incre:1},{elt:curCard,prop:'o',base:1,incre:-1}]);
		},
		cover : function (idx){
			var card = this.cards[idx],
				curCard = this.cards[this.curIdx];
			if(this.mode !== 'fade'){
				this.setModeToFade();
			}
			this.setMaskAnchorRef(idx);
			curCard.style.zIndex = 5;
			card.style.zIndex = 10;
			card.style.transform = 'scale3d(1.5,1.5,1)';
			this.animate([{elt:card,prop:'o',base:0,incre:1},{elt:card,prop:'s',base:1.5,incre:-.5}],function (){
				curCard.style.zIndex = 0;
			});
		}
	});
	global.SimpleCarousel = SimpleCarousel;
	global.Css3Carousel = Css3Carousel;
})(window);