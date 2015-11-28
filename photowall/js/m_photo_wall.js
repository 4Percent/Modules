(function (global){
	var addEvent = global.addEventListener ? function (elt,event,handler){
			elt.addEventListener(event,handler,false);
		} : function (elt,event,handler){
			elt.attachEvent('on' + event,handler);
		},
		removeEvent = global.removeEventListener ? function (elt,event,handler){
			elt.removeEventListener(event,handler,false);
		} : function (elt,event,handler){
			elt.detachEvent('on' + event,handler);
		},
		requestFrame = global.requestAnimationFrame ? function (fn){
			return global.requestAnimationFrame(fn);
		} : function (fn){
			return global.setTimeout(fn,20);
		},
		cancelFrame = global.cancelAnimationFrame ? function (timer){
			global.cancelAnimationFrame(timer);
		} : function (timer){
			global.clearTimeout(timer);
		};
	function getPos(elt){
		var left = 0,
			top = 0;
		while(elt.offsetParent){
			left += elt.offsetLeft;
			top += elt.offsetTop;
			elt = elt.offsetParent;
		}
		return {left:left,top:top};
	}
	function PhotoWall(setting){
		this.con = setting.container;
		this.cards = setting.container.children;
		this.mode = setting.mode || 'normal';
		this.modeEnd = this.mode + 'End';
		this.activeClass = setting.activeClass;
		this.actRegExp = new RegExp('\\b' + this.activeClass + '\\b');
		this.duration = setting.duration || 400;
		this.totalFrames = ~~(this.duration/16);
		this.convertLayout();
		this.initWall();
	}
	PhotoWall.prototype = {
		constructor : PhotoWall,
		convertLayout : function (){
			var card,
				offset = getPos(this.con);
			this.pos = [];
			for(var i = this.cards.length - 1;i >= 0;i--){
				card = this.cards[i];
				this.pos[i] = {left:card.offsetLeft,top:card.offsetTop};
				card.style.left = this.pos[i].left + 'px';
				card.style.top = this.pos[i].top + 'px';
				card.style.margin = 0;
				card.style.position = 'absolute';
				card.posIdx = i;
			}
			this.cardWidth = card.offsetWidth;
			this.cardHeight = card.offsetHeight;
			this.tagName = card.tagName;
		},
		initWall : function (){
			var that = this;
			this.prevCollided = null;
			addEvent(this.con,'mousedown',function (e){
				e = e || global.event;
				var target = e.target || e.srcElement;
				if(target.tagName === that.tagName){
					that.target = target;
					that.target.style.zIndex = 10;
					cancelFrame(that.target.timer);
					that.minIdx = null;
					that.minDis = null;
					var baseX = e.clientX - that.target.offsetLeft,
						baseY = e.clientY - that.target.offsetTop;
					that[that.mode]();
					function _move(e){
						e = e || global.event;
						that.minIdx = null;
						that.minDis = null;
						that.target.style.left = e.clientX - baseX + 'px';
						that.target.style.top = e.clientY - baseY + 'px';
						that[that.mode]();
						return false;
					}
					function _up(){
						that[that.modeEnd]();
						that.target.style.zIndex = 0;
						removeEvent(document,'mousemove',_move);
						removeEvent(document,'mouseup',_up);
					}
					addEvent(document,'mousemove',_move);
					addEvent(document,'mouseup',_up);
				}
				e.preventDefault && e.preventDefault();
				return false;
			});
		},
		calcDis : function (pos,idx){
			var left = this.target.offsetLeft,
				top = this.target.offsetTop,
				dis;
			if(!(left > pos.left + this.cardWidth || left + this.cardWidth < pos.left || top > pos.top + this.cardHeight || top + this.cardHeight < pos.top)){
				dis = Math.pow(left - pos.left,2) + Math.pow(top - pos.top,2);
				if(this.minDis === null || dis < this.minDis){
					this.minDis = dis;
					this.minIdx = idx;
				}
			}
		},
		move : function (elt,dst){
			var baseValue = {left:elt.offsetLeft,top:elt.offsetTop},
				incre = {left:dst.left - baseValue.left,top:dst.top - baseValue.top},
				curFrame = 0,
				totalFrames = this.totalFrames;
			cancelFrame(elt.timer);
			elt.timer = requestFrame(function fn(){
				elt.style.left = ++curFrame/totalFrames*incre.left + baseValue.left + 'px';
				elt.style.top = curFrame/totalFrames*incre.top + baseValue.top + 'px';
				if(curFrame < totalFrames)
					elt.timer = requestFrame(fn);
			});
		},
		switchCard : function (card1,card2){
			var temp = card1.posIdx;
			card1.posIdx = card2.posIdx;
			card2.posIdx = temp;
			this.move(card1,this.pos[card1.posIdx]);
			this.move(card2,this.pos[card2.posIdx]);
		},
		deactivate : function (){
			this.cards[this.prevCollided].className = this.cards[this.prevCollided].className.replace(this.actRegExp,'').replace(/\s+/,' ').replace(/^\s|\s$/g,'');
			this.prevCollided = null;
		},
		normal : function (){
			var card;
			for(var i = 0;i < this.cards.length;i++){
				card = this.cards[i];
				if(card !== this.target){
					this.calcDis(this.pos[card.posIdx],i);
				}
			}
			if(this.prevCollided !== this.minIdx){
				if(this.prevCollided !== null){
					this.deactivate();
				}
				if(this.minIdx !== null){
					this.prevCollided = this.minIdx;
					this.cards[this.minIdx].className += this.activeClass;
				}
			}
		},
		normalEnd : function (){
			if(this.minIdx !== null){
				this.switchCard(this.target,this.cards[this.minIdx]);
				this.deactivate();
			}else{
				this.move(this.target,this.pos[this.target.posIdx]);
			}
		},
		phone : function (){
			for(var i = 0;i < this.pos.length;i++){
				this.calcDis(this.pos[i],i);
			}
			if(this.minIdx !== null && this.minIdx !== this.target.posIdx){
				var card,
					start = Math.min(this.minIdx,this.target.posIdx),
					end = Math.max(this.minIdx,this.target.posIdx),
					incre = start === this.minIdx ? 1 : -1;
				for(i = 0;i < this.cards.length;i++){
					card = this.cards[i];
					if(card === this.target){
						this.target.posIdx = this.minIdx;
					}else if(card.posIdx >= start && card.posIdx <= end){
						card.posIdx += incre;
						this.move(card,this.pos[card.posIdx]);
					}
				}
			}
		},
		phoneEnd : function (){
			this.move(this.target,this.pos[this.target.posIdx]);
		},
		setMode : function (mode){
			this.mode = mode;
			this.modeEnd = this.mode + 'End';
		},
		shuffle : function (){
			var cards = [];
			cards.push.apply(cards,this.cards);
			cards.sort(function (){
				return Math.random() - .5;
			});
			for(var i = 0;i < cards.length;i++){
				cards[i].posIdx = i;
				this.move(cards[i],this.pos[i]);
			}
		}
	}
	global.PhotoWall = PhotoWall;
})(window);